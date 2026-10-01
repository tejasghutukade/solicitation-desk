import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue, type SQLOutputValue } from "node:sqlite";
import type { DibbsGateway } from "./gateway.ts";
import { readRecord } from "./read-record.ts";
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

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

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

function flag(value: SQLOutputValue): boolean | null {
  if (value === null || value === undefined) return null;
  return Number(value) === 1;
}

function toBrief(record: SqlRow): SolicitationBrief {
  const row = toRow(record);
  const codes = record.requirement_codes ? JSON.parse(String(record.requirement_codes)) : [];
  const hasSource = Number(record.has_approved_source) === 1;
  const lastPrice = record.last_unit_price ? String(record.last_unit_price) : "";
  return {
    ...row,
    issueDate: record.issue_date ? String(record.issue_date) : null,
    status: record.status ? String(record.status) : null,
    fullName: record.full_name ? String(record.full_name) : null,
    deliverBy: record.deliver_by ? String(record.deliver_by) : null,
    buyerName: record.buyer_name ? String(record.buyer_name) : null,
    buyerEmail: record.buyer_email ? String(record.buyer_email) : null,
    naics: record.naics ? String(record.naics) : null,
    approvedSource: hasSource
      ? {
          company: record.approved_company ? String(record.approved_company) : null,
          cage: record.approved_cage ? String(record.approved_cage) : null,
          partNumber: record.approved_part ? String(record.approved_part) : null,
        }
      : null,
    automatedAward: flag(record.automated_award),
    inspection: record.inspection ? String(record.inspection) : null,
    buyAmerican: flag(record.buy_american),
    lastPaid: lastPrice
      ? {
          unitPrice: lastPrice,
          quantity: String(record.last_quantity ?? ""),
          awardDate: String(record.last_award_date ?? ""),
        }
      : null,
    requirementCodes: Array.isArray(codes) ? codes.map(String) : [],
    pdfAvailable: record.pdf instanceof Uint8Array && record.pdf.length > 0,
    recordPageUrl: recordPageUrl(row.solicitationNumber),
    loadState: record.load_state === "failed" ? "failed" : record.load_state === "ready" ? "ready" : "index-only",
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

  async pullPostedDay(isoDate: string): Promise<{ postedDate: string; solicitations: number }> {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!match) throw new Error("Choose a posted day.");
    const fileName = `in${match[1].slice(2)}${match[2]}${match[3]}.txt`;
    let text: string;
    try {
      text = await this.gateway.fetchIndexFile(fileName);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`DIBBS could not provide the index for ${isoDate}. ${reason}`);
    }
    if (!text.trim()) throw new Error(`DIBBS returned an empty index for ${isoDate}.`);
    this.ingestIndexFile(fileName, text);
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM solicitations WHERE posted_date = ?")
      .get(isoDate) as SqlRow | undefined;
    const solicitations = Number(row?.count ?? 0);
    if (solicitations === 0) {
      throw new Error(`DIBBS index for ${isoDate} did not contain any solicitations.`);
    }
    return { postedDate: isoDate, solicitations };
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
    if (query.setAsides.length > 0) {
      clauses.push(`set_aside IN (${query.setAsides.map(() => "?").join(", ")})`);
      params.push(...query.setAsides);
    }
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
      ORDER BY CASE WHEN return_by < ? THEN 1 ELSE 0 END, return_by ASC, solicitation_number ASC`;
    return this.db.prepare(sql).all(...params, todayIso()).map((record) => toRow(record as SqlRow));
  }

  async open(solicitationNumber: string): Promise<SolicitationBrief> {
    const existing = this.record(solicitationNumber);
    if (!existing) throw new Error(`Solicitation ${solicitationNumber} is not on the desk.`);
    if (existing.load_state === "ready") return toBrief(existing);
    try {
      const fetched = await this.gateway.fetchSolicitation(solicitationNumber);
      const pdf = new Uint8Array(fetched.pdf);
      const details = await readRecord(fetched.recordPageHtml, pdf);
      this.db
        .prepare(
          `UPDATE solicitations SET
            load_state = 'ready',
            issue_date = ?,
            status = ?,
            full_name = ?,
            deliver_by = ?,
            buyer_name = ?,
            buyer_email = ?,
            naics = ?,
            approved_company = ?,
            approved_cage = ?,
            approved_part = ?,
            has_approved_source = ?,
            automated_award = ?,
            inspection = ?,
            buy_american = ?,
            last_unit_price = ?,
            last_quantity = ?,
            last_award_date = ?,
            requirement_codes = ?,
            pdf = ?
          WHERE solicitation_number = ?`,
        )
        .run(
          details.issueDate,
          details.status,
          details.fullName,
          details.deliverBy,
          details.buyerName,
          details.buyerEmail,
          details.naics,
          details.approvedSource?.company ?? null,
          details.approvedSource?.cage ?? null,
          details.approvedSource?.partNumber ?? null,
          details.approvedSource ? 1 : 0,
          details.automatedAward === null ? null : details.automatedAward ? 1 : 0,
          details.inspection,
          details.buyAmerican === null ? null : details.buyAmerican ? 1 : 0,
          details.lastPaid?.unitPrice ?? null,
          details.lastPaid?.quantity ?? null,
          details.lastPaid?.awardDate ?? null,
          JSON.stringify(details.requirementCodes),
          pdf,
          solicitationNumber,
        );
      const saved = this.record(solicitationNumber);
      if (!saved) throw new Error(`Solicitation ${solicitationNumber} is not on the desk.`);
      return toBrief(saved);
    } catch {
      this.db
        .prepare("UPDATE solicitations SET load_state = 'failed' WHERE solicitation_number = ?")
        .run(solicitationNumber);
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
        loadState: "failed",
      };
    }
  }

  storedPdf(solicitationNumber: string): Uint8Array | null {
    const existing = this.record(solicitationNumber);
    const pdf = existing?.pdf;
    if (pdf instanceof Uint8Array) return pdf;
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
