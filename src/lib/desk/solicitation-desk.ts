import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue, type SQLOutputValue } from "node:sqlite";
import type { DibbsGateway } from "./gateway.ts";
import {
  HARDWARE_CLASSES,
  recordPageUrl,
  type DeskQuery,
  type SetAside,
  type SolicitationBrief,
  type SolicitationRow,
} from "./types.ts";

export type SolicitationDeskOptions = {
  databasePath: string;
  gateway: DibbsGateway;
};

const SET_ASIDES = new Set<SetAside>(["Y", "L", "R", "H", "A", "E", "N"]);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS solicitations (
  solicitation_number TEXT PRIMARY KEY,
  nsn TEXT NOT NULL,
  purchase_request TEXT NOT NULL,
  return_by TEXT NOT NULL,
  pdf_file_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  short_name TEXT NOT NULL,
  buyer_code TEXT NOT NULL,
  amsc TEXT NOT NULL,
  item_type TEXT NOT NULL,
  set_aside TEXT NOT NULL,
  set_aside_percent TEXT NOT NULL,
  posted_date TEXT NOT NULL,
  fsc TEXT,
  load_state TEXT NOT NULL DEFAULT 'index-only',
  issue_date TEXT,
  status TEXT,
  full_name TEXT,
  deliver_by TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  naics TEXT,
  approved_company TEXT,
  approved_cage TEXT,
  approved_part TEXT,
  has_approved_source INTEGER NOT NULL DEFAULT 0,
  automated_award INTEGER,
  inspection TEXT,
  buy_american INTEGER,
  last_unit_price TEXT,
  last_quantity TEXT,
  last_award_date TEXT,
  requirement_codes TEXT,
  pdf BLOB
)`;

const UPSERT = `
INSERT INTO solicitations (
  solicitation_number, nsn, purchase_request, return_by, pdf_file_name,
  quantity, unit, short_name, buyer_code, amsc, item_type, set_aside,
  set_aside_percent, posted_date, fsc
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(solicitation_number) DO UPDATE SET
  nsn = excluded.nsn,
  purchase_request = excluded.purchase_request,
  return_by = excluded.return_by,
  pdf_file_name = excluded.pdf_file_name,
  quantity = excluded.quantity,
  unit = excluded.unit,
  short_name = excluded.short_name,
  buyer_code = excluded.buyer_code,
  amsc = excluded.amsc,
  item_type = excluded.item_type,
  set_aside = excluded.set_aside,
  set_aside_percent = excluded.set_aside_percent,
  posted_date = excluded.posted_date,
  fsc = excluded.fsc`;

type SqlRow = Record<string, SQLOutputValue>;

type IndexRecord = {
  solicitationNumber: string;
  nsn: string;
  purchaseRequest: string;
  returnBy: string;
  pdfFileName: string;
  quantity: number;
  unit: string;
  shortName: string;
  buyerCode: string;
  amsc: string;
  itemType: string;
  setAside: SetAside;
  setAsidePercent: string;
  postedDate: string;
  fsc: string | null;
};

function expandYear(year: number): number {
  return year <= 69 ? 2000 + year : 1900 + year;
}

function postedDateFromFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  const match = /^in(\d{2})(\d{2})(\d{2})\.txt$/i.exec(base);
  if (!match) throw new Error(`Index file ${fileName} does not encode a posted date.`);
  return `${expandYear(Number(match[1]))}-${match[2]}-${match[3]}`;
}

function isoFromMonthDayYear(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return `${expandYear(Number(match[3]))}-${match[1]}-${match[2]}`;
}

function federalSupplyClass(nsn: string, itemType: string): string | null {
  if (itemType === "2" || /[A-Za-z]/.test(nsn) || !/^\d{4,}$/.test(nsn)) return null;
  return nsn.slice(0, 4);
}

function parseIndexLine(line: string, postedDate: string): IndexRecord | null {
  const raw = line.endsWith("\r") ? line.slice(0, -1) : line;
  if (raw.length < 140) return null;
  let offset = 0;
  const take = (width: number) => {
    const value = raw.slice(offset, offset + width);
    offset += width;
    return value;
  };
  const solicitationNumber = take(13).trim();
  const nsn = take(46).trim();
  const purchaseRequest = take(13).trim();
  const returnBy = isoFromMonthDayYear(take(8));
  const pdfFileName = take(19).trim();
  const quantityRaw = take(7).trim();
  const unit = take(2).trim();
  const shortName = take(21).trim();
  const buyerCode = take(5).trim();
  const amsc = take(1).trim();
  const itemType = take(1).trim();
  const setAside = take(1).trim();
  const setAsidePercent = take(3).trim();
  if (!solicitationNumber || !returnBy || !/^\d+$/.test(quantityRaw)) return null;
  if (!SET_ASIDES.has(setAside as SetAside)) return null;
  return {
    solicitationNumber,
    nsn,
    purchaseRequest,
    returnBy,
    pdfFileName,
    quantity: Number(quantityRaw),
    unit,
    shortName,
    buyerCode,
    amsc,
    itemType,
    setAside: setAside as SetAside,
    setAsidePercent,
    postedDate,
    fsc: federalSupplyClass(nsn, itemType),
  };
}

function toRow(record: SqlRow): SolicitationRow {
  return {
    solicitationNumber: String(record.solicitation_number),
    nsn: String(record.nsn),
    shortName: String(record.short_name),
    quantity: Number(record.quantity),
    unit: String(record.unit),
    returnBy: String(record.return_by),
    setAside: String(record.set_aside) as SetAside,
    postedDate: String(record.posted_date),
  };
}

export class SolicitationDesk {
  private readonly db: DatabaseSync;
  private readonly gateway: DibbsGateway;

  constructor(options: SolicitationDeskOptions) {
    this.gateway = options.gateway;
    const directory = path.dirname(options.databasePath);
    if (directory) mkdirSync(directory, { recursive: true });
    this.db = new DatabaseSync(options.databasePath);
    this.db.exec(SCHEMA);
  }

  ingestIndexFile(fileName: string, body: string): void {
    const postedDate = postedDateFromFileName(fileName);
    const insert = this.db.prepare(UPSERT);
    this.db.exec("BEGIN");
    try {
      for (const line of body.split("\n")) {
        const record = parseIndexLine(line, postedDate);
        if (!record) continue;
        insert.run(
          record.solicitationNumber,
          record.nsn,
          record.purchaseRequest,
          record.returnBy,
          record.pdfFileName,
          record.quantity,
          record.unit,
          record.shortName,
          record.buyerCode,
          record.amsc,
          record.itemType,
          record.setAside,
          record.setAsidePercent,
          record.postedDate,
          record.fsc,
        );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async ensureReady(): Promise<void> {
    if (this.storedCount() > 0) return;
    let files;
    try {
      files = await this.gateway.fetchRecentIndexFiles();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`DIBBS could not be reached, so the solicitation list was not built. ${reason}`);
    }
    if (files.length === 0) {
      throw new Error("DIBBS returned no recent index files, so the solicitation list was not built.");
    }
    const ordered = [...files].sort((left, right) =>
      postedDateFromFileName(left.fileName).localeCompare(postedDateFromFileName(right.fileName)),
    );
    for (const file of ordered) this.ingestIndexFile(file.fileName, file.text);
    if (this.storedCount() === 0) {
      throw new Error("DIBBS index files did not contain any solicitations, so the solicitation list was not built.");
    }
  }

  query(query: DeskQuery): SolicitationRow[] {
    if (query.setAsides.length === 0) return [];
    const clauses = ["1 = 1"];
    const params: SQLInputValue[] = [];
    if (query.supplier === "hardware") {
      clauses.push(`fsc IN (${HARDWARE_CLASSES.map(() => "?").join(", ")})`);
      params.push(...HARDWARE_CLASSES);
    } else if (query.supplier === "electrical") {
      clauses.push("(fsc LIKE '59%' OR fsc LIKE '61%')");
    } else if (query.supplier === "medical") {
      clauses.push("fsc LIKE '65%'");
    }
    clauses.push(`set_aside IN (${query.setAsides.map(() => "?").join(", ")})`);
    params.push(...query.setAsides);
    if (query.returnByOnOrBefore) {
      clauses.push("return_by <= ?");
      params.push(query.returnByOnOrBefore);
    }
    if (query.postedDate) {
      clauses.push("posted_date = ?");
      params.push(query.postedDate);
    }
    const search = query.search.trim().toLowerCase();
    if (search) {
      const pattern = `%${search.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
      clauses.push(
        "(LOWER(solicitation_number) LIKE ? ESCAPE '\\' OR LOWER(nsn) LIKE ? ESCAPE '\\' OR LOWER(short_name) LIKE ? ESCAPE '\\')",
      );
      params.push(pattern, pattern, pattern);
    }
    const sql = `SELECT solicitation_number, nsn, short_name, quantity, unit, return_by, set_aside, posted_date
      FROM solicitations
      WHERE ${clauses.join(" AND ")}
      ORDER BY return_by ASC, solicitation_number ASC`;
    return this.db.prepare(sql).all(...params).map((record) => toRow(record as SqlRow));
  }

  async open(solicitationNumber: string): Promise<SolicitationBrief> {
    const existing = this.record(solicitationNumber);
    if (!existing) throw new Error(`Solicitation ${solicitationNumber} is not on the desk.`);
    return {
      ...toRow(existing),
      issueDate: null,
      status: null,
      fullName: null,
      deliverBy: null,
      buyerName: null,
      buyerEmail: null,
      naics: null,
      approvedSource: null,
      automatedAward: null,
      inspection: null,
      buyAmerican: null,
      lastPaid: null,
      requirementCodes: [],
      pdfAvailable: false,
      recordPageUrl: recordPageUrl(solicitationNumber),
      loadState: "ready",
    };
  }

  storedPdf(_solicitationNumber: string): Uint8Array | null {
    return null;
  }

  private storedCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS count FROM solicitations").get() as SqlRow | undefined;
    return Number(row?.count ?? 0);
  }

  private record(solicitationNumber: string): SqlRow | undefined {
    return this.db.prepare("SELECT * FROM solicitations WHERE solicitation_number = ?").get(solicitationNumber) as
      | SqlRow
      | undefined;
  }
}
