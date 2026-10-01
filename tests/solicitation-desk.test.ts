import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { DibbsGateway } from "../src/lib/desk/gateway.ts";
import { SolicitationDesk } from "../src/lib/desk/solicitation-desk.ts";
import { openingQuery, recordPageUrl, type DeskQuery } from "../src/lib/desk/types.ts";

const INDEX_260401 = [
  "SPE1C126T17465305012345678                                 PR1234567890104/15/26SPE1C126T1746.PDF       10EABOLT,MACHINE         AB123G1Y100",
  "SPE2A126T99996515019999999                                 PR0000000000205/01/26SPE2A126T9999.PDF        4PGBANDAGE              CD456G1N   ",
  "SPE7M126T00015999011111111                                 PR0000000000304/02/26SPE7M126T0001.PDF        1EACONNECTOR            EF789G1L100",
  "SPE4A126P0002ABC-WIDGET                                    PR0000000000406/01/26SPE4A126P0002.PDF        2EAWIDGET PART          GH012G2Y100",
].join("\n");

const BOLT_UPDATE =
  "SPE1C126T17465305012345678                                 PR1234567890104/20/26SPE1C126T1746.PDF       12EABOLT,MACHINE         AB123G1Y100";

const UNRESTRICTED_NUT = fixedLine({
  solicitation: "SPE5A126T5310",
  nsn: "5310011111111",
  purchaseRequest: "PR00000000005",
  returnBy: "04/18/26",
  pdfName: "SPE5A126T5310.PDF",
  quantity: "5",
  unit: "EA",
  shortName: "NUT,SELF-LOCKING",
  buyerCode: "AB123",
  amsc: "G",
  itemType: "1",
  setAside: "N",
  setAsidePercent: "   ",
});

function fixedLine(parts: {
  solicitation: string;
  nsn: string;
  purchaseRequest: string;
  returnBy: string;
  pdfName: string;
  quantity: string;
  unit: string;
  shortName: string;
  buyerCode: string;
  amsc: string;
  itemType: string;
  setAside: string;
  setAsidePercent: string;
}): string {
  const fields: Array<[string, number, "start" | "end"]> = [
    [parts.solicitation, 13, "end"],
    [parts.nsn, 46, "end"],
    [parts.purchaseRequest, 13, "end"],
    [parts.returnBy, 8, "end"],
    [parts.pdfName, 19, "end"],
    [parts.quantity, 7, "start"],
    [parts.unit, 2, "end"],
    [parts.shortName, 21, "end"],
    [parts.buyerCode, 5, "end"],
    [parts.amsc, 1, "end"],
    [parts.itemType, 1, "end"],
    [parts.setAside, 1, "end"],
    [parts.setAsidePercent, 3, "end"],
  ];
  return fields
    .map(([value, width, align]) => (align === "start" ? value.padStart(width, " ") : value.padEnd(width, " ")))
    .join("");
}

function unusedGateway(): DibbsGateway {
  return {
    async fetchRecentIndexFiles() {
      return [];
    },
    async fetchIndexFile() {
      throw new Error("not used");
    },
    async fetchSolicitation() {
      throw new Error("not used");
    },
  };
}

function newDesk(
  gateway: Omit<DibbsGateway, "fetchIndexFile"> & Partial<Pick<DibbsGateway, "fetchIndexFile">> = unusedGateway(),
): SolicitationDesk {
  const dir = mkdtempSync(path.join(tmpdir(), "desk-"));
  return new SolicitationDesk({
    databasePath: path.join(dir, "nested", "desk.sqlite"),
    gateway: {
      async fetchIndexFile() {
        throw new Error("not used");
      },
      ...gateway,
    },
  });
}

function numbers(rows: Array<{ solicitationNumber: string }>): string[] {
  return rows.map((row) => row.solicitationNumber);
}

test("ingests a daily index and lists the soonest return-by first", () => {
  const bolt = INDEX_260401.split("\n")[0] ?? "";
  const skippedSetAside = `SPE9Z126T0000${bolt.slice(13, 136)}X${bolt.slice(137)}`;
  assert.equal(skippedSetAside.length, 140);
  assert.equal(UNRESTRICTED_NUT.length, 140);
  const desk = newDesk();
  desk.ingestIndexFile("in260401.txt", `${INDEX_260401}\nshort\n${skippedSetAside}\n`);
  const rows = desk.query(openingQuery("all"));
  assert.deepEqual(
    rows.map((row) => ({
      solicitationNumber: row.solicitationNumber,
      nsn: row.nsn,
      shortName: row.shortName,
      quantity: row.quantity,
      unit: row.unit,
      returnBy: row.returnBy,
      setAside: row.setAside,
      postedDate: row.postedDate,
    })),
    [
      {
        solicitationNumber: "SPE7M126T0001",
        nsn: "5999011111111",
        shortName: "CONNECTOR",
        quantity: 1,
        unit: "EA",
        returnBy: "2026-04-02",
        setAside: "L",
        postedDate: "2026-04-01",
      },
      {
        solicitationNumber: "SPE1C126T1746",
        nsn: "5305012345678",
        shortName: "BOLT,MACHINE",
        quantity: 10,
        unit: "EA",
        returnBy: "2026-04-15",
        setAside: "Y",
        postedDate: "2026-04-01",
      },
      {
        solicitationNumber: "SPE2A126T9999",
        nsn: "6515019999999",
        shortName: "BANDAGE",
        quantity: 4,
        unit: "PG",
        returnBy: "2026-05-01",
        setAside: "N",
        postedDate: "2026-04-01",
      },
      {
        solicitationNumber: "SPE4A126P0002",
        nsn: "ABC-WIDGET",
        shortName: "WIDGET PART",
        quantity: 2,
        unit: "EA",
        returnBy: "2026-06-01",
        setAside: "Y",
        postedDate: "2026-04-01",
      },
    ],
  );
});

test("a later index file updates the same solicitation once", () => {
  const desk = newDesk();
  desk.ingestIndexFile("in260401.txt", INDEX_260401);
  desk.ingestIndexFile("in260402.txt", BOLT_UPDATE);
  const rows = desk.query(openingQuery("all"));
  assert.deepEqual(numbers(rows), ["SPE7M126T0001", "SPE1C126T1746", "SPE2A126T9999", "SPE4A126P0002"]);
  const bolt = rows.find((row) => row.solicitationNumber === "SPE1C126T1746");
  assert.ok(bolt);
  assert.equal(bolt.quantity, 12);
  assert.equal(bolt.returnBy, "2026-04-20");
  assert.equal(bolt.postedDate, "2026-04-02");
  assert.equal(bolt.shortName, "BOLT,MACHINE");
});

test("opening queries keep each shop on its classes and set-asides", () => {
  const desk = newDesk();
  desk.ingestIndexFile("in260401.txt", `${INDEX_260401}\n${UNRESTRICTED_NUT}\n`);
  assert.deepEqual(numbers(desk.query(openingQuery("hardware"))), ["SPE1C126T1746"]);
  assert.deepEqual(numbers(desk.query(openingQuery("medical"))), ["SPE2A126T9999"]);
  assert.deepEqual(numbers(desk.query(openingQuery("electrical"))), ["SPE7M126T0001"]);
  assert.deepEqual(numbers(desk.query(openingQuery("all"))), [
    "SPE7M126T0001",
    "SPE1C126T1746",
    "SPE5A126T5310",
    "SPE2A126T9999",
    "SPE4A126P0002",
  ]);
  const hardwareWithUnrestricted: DeskQuery = {
    ...openingQuery("hardware"),
    setAsides: [...openingQuery("hardware").setAsides, "N"],
  };
  assert.deepEqual(numbers(desk.query(hardwareWithUnrestricted)), ["SPE1C126T1746", "SPE5A126T5310"]);
  assert.deepEqual(numbers(desk.query({ ...openingQuery("hardware"), setAsides: [] })), [
    "SPE1C126T1746",
    "SPE5A126T5310",
  ]);
});

test("search and date filters stay inside the shop that is open", () => {
  const desk = newDesk();
  desk.ingestIndexFile("in260401.txt", INDEX_260401);
  assert.deepEqual(numbers(desk.query({ ...openingQuery("hardware"), search: "bandage" })), []);
  assert.deepEqual(numbers(desk.query({ ...openingQuery("all"), search: "bandage" })), ["SPE2A126T9999"]);
  assert.deepEqual(numbers(desk.query({ ...openingQuery("all"), search: "spe7m126t0001" })), ["SPE7M126T0001"]);
  assert.deepEqual(numbers(desk.query({ ...openingQuery("all"), search: "5999011111111" })), ["SPE7M126T0001"]);
  assert.deepEqual(numbers(desk.query({ ...openingQuery("all"), returnByOnOrBefore: "2026-04-15" })), [
    "SPE7M126T0001",
    "SPE1C126T1746",
  ]);
  desk.ingestIndexFile("in260402.txt", BOLT_UPDATE);
  assert.deepEqual(numbers(desk.query({ ...openingQuery("all"), postedDate: "2026-04-02" })), ["SPE1C126T1746"]);
  const narrowed = desk.query({
    ...openingQuery("hardware"),
    search: "bandage",
    returnByOnOrBefore: "2026-04-02",
    postedDate: "2026-04-02",
  });
  assert.deepEqual(narrowed, []);
  assert.deepEqual(numbers(desk.query(openingQuery("medical"))), ["SPE2A126T9999"]);
});

test("ensureReady leaves a stored index alone and rejects an empty failed start", async () => {
  let indexCalls = 0;
  const loaded = newDesk({
    async fetchRecentIndexFiles() {
      indexCalls += 1;
      return [{ fileName: "in260401.txt", text: INDEX_260401 }];
    },
    async fetchSolicitation() {
      throw new Error("not used");
    },
  });
  loaded.ingestIndexFile("in260401.txt", INDEX_260401);
  await loaded.ensureReady();
  assert.equal(indexCalls, 0);

  const failing = newDesk({
    async fetchRecentIndexFiles() {
      throw new Error("offline");
    },
    async fetchSolicitation() {
      throw new Error("not used");
    },
  });
  await assert.rejects(() => failing.ensureReady(), /DIBBS/);

  let attempts = 0;
  const retry = newDesk({
    async fetchRecentIndexFiles() {
      attempts += 1;
      if (attempts === 1) return [];
      return [
        { fileName: "in260402.txt", text: BOLT_UPDATE },
        { fileName: "in260401.txt", text: INDEX_260401 },
      ];
    },
    async fetchSolicitation() {
      throw new Error("not used");
    },
  });
  await assert.rejects(() => retry.ensureReady(), /DIBBS/);
  await retry.ensureReady();
  const bolt = retry.query(openingQuery("all")).find((row) => row.solicitationNumber === "SPE1C126T1746");
  assert.ok(bolt);
  assert.equal(bolt.quantity, 12);
  assert.equal(bolt.postedDate, "2026-04-02");
  assert.equal(attempts, 2);

  const blank = newDesk({
    async fetchRecentIndexFiles() {
      return [{ fileName: "in260403.txt", text: "too short\n" }];
    },
    async fetchSolicitation() {
      throw new Error("not used");
    },
  });
  await assert.rejects(() => blank.ensureReady(), /DIBBS/);
});

async function pdfWith(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([640, 900]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  lines.forEach((line, index) => {
    page.drawText(line, { x: 36, y: 860 - index * 16, font, size: 10 });
  });
  return doc.save();
}

const OPEN_HTML = "<span style='color:#000099'>Open</span>";

test("opening a row fetches the record once and keeps it", async () => {
  let calls = 0;
  const pdf = await pdfWith([
    "DATE ISSUED",
    "2026 AUG 25",
    "Name: JANE DOE Buyer Code:AB123 Tel: 1",
    "Email: jane.doe@dla.mil",
    "DELIVER BY (Date)",
    "15 DAYS ADO",
    "ITEM DESCRIPTION BOLT,MACHINE BOLT, MACHINE *",
    "NORTH AMERICAN INDUSTRY CLASSIFICATION SYSTEM 332722",
    "INSPECTION POINT: ORIGIN",
    "BUY AMERICAN AND BALANCE OF PAYMENTS PROGRAM, APPLIES",
    "Procurement History for NSN/FSC:123/5305",
    "CAGE Contract Number Quantity Unit Cost AWD Date",
    "1AB23 SPE1C126P0001 10.000 1.25000 20250115",
    "CRITICAL APPLICATION ITEM",
    "ACME FASTENER 1AB23 P/N ACME-44",
    "RA001",
  ]);
  const desk = newDesk({
    async fetchRecentIndexFiles() {
      return [];
    },
    async fetchSolicitation() {
      calls += 1;
      return { recordPageHtml: OPEN_HTML, pdf };
    },
  });
  desk.ingestIndexFile("in260401.txt", INDEX_260401);
  const brief = await desk.open("SPE1C126T1746");
  assert.equal(calls, 1);
  assert.equal(brief.solicitationNumber, "SPE1C126T1746");
  assert.equal(brief.quantity, 10);
  assert.equal(brief.issueDate, "2026-08-25");
  assert.equal(brief.status, "Open");
  assert.equal(brief.fullName, "BOLT, MACHINE");
  assert.equal(brief.deliverBy, "15 DAYS ADO");
  assert.equal(brief.buyerName, "JANE DOE");
  assert.equal(brief.buyerEmail, "jane.doe@dla.mil");
  assert.equal(brief.naics, "332722");
  assert.deepEqual(brief.approvedSource, { company: "ACME FASTENER", cage: "1AB23", partNumber: "ACME-44" });
  assert.equal(brief.inspection, "ORIGIN");
  assert.equal(brief.buyAmerican, true);
  assert.equal(brief.automatedAward, null);
  assert.deepEqual(brief.lastPaid, { unitPrice: "1.25000", quantity: "10", awardDate: "2025-01-15" });
  assert.deepEqual(brief.requirementCodes, ["RA001"]);
  assert.equal(brief.pdfAvailable, true);
  assert.equal(brief.recordPageUrl, recordPageUrl("SPE1C126T1746"));
  assert.equal(brief.loadState, "ready");
  assert.ok(desk.storedPdf("SPE1C126T1746")?.byteLength);

  const again = await desk.open("SPE1C126T1746");
  assert.equal(calls, 1);
  assert.equal(again.buyerName, "JANE DOE");

  const quiet = await pdfWith(["DATE ISSUED", "2026 MAY 02", "ITEM DESCRIPTION BANDAGE *"]);
  const medical = newDesk({
    async fetchRecentIndexFiles() {
      return [];
    },
    async fetchSolicitation() {
      return { recordPageHtml: OPEN_HTML, pdf: quiet };
    },
  });
  medical.ingestIndexFile("in260401.txt", INDEX_260401);
  const bandage = await medical.open("SPE2A126T9999");
  assert.equal(bandage.lastPaid, null);
  assert.equal(bandage.issueDate, "2026-05-02");
});

test("a failed record fetch keeps the index fields and a later open can replace it", async () => {
  let calls = 0;
  const pdf = await pdfWith(["DATE ISSUED", "2026 AUG 25", "Name: JANE DOE Buyer Code:AB123"]);
  const desk = newDesk({
    async fetchRecentIndexFiles() {
      return [];
    },
    async fetchSolicitation() {
      calls += 1;
      if (calls === 1) throw new Error("offline");
      return { recordPageHtml: OPEN_HTML, pdf };
    },
  });
  desk.ingestIndexFile("in260401.txt", INDEX_260401);
  const failed = await desk.open("SPE1C126T1746");
  assert.equal(failed.loadState, "failed");
  assert.equal(failed.shortName, "BOLT,MACHINE");
  assert.equal(failed.returnBy, "2026-04-15");
  assert.equal(failed.buyerName, null);
  assert.equal(failed.pdfAvailable, false);
  const ready = await desk.open("SPE1C126T1746");
  assert.equal(calls, 2);
  assert.equal(ready.loadState, "ready");
  assert.equal(ready.buyerName, "JANE DOE");
  assert.equal(ready.issueDate, "2026-08-25");
});

test("pulling a posted day stores that index and leaves the recent download alone", async () => {
  let recentCalls = 0;
  let indexCalls = 0;
  const desk = newDesk({
    async fetchRecentIndexFiles() {
      recentCalls += 1;
      return [];
    },
    async fetchIndexFile(fileName) {
      indexCalls += 1;
      assert.equal(fileName, "in260401.txt");
      return INDEX_260401;
    },
    async fetchSolicitation() {
      throw new Error("not used");
    },
  });
  const stored = await desk.pullPostedDay("2026-04-01");
  assert.equal(recentCalls, 0);
  assert.equal(indexCalls, 1);
  assert.equal(stored.solicitations, 4);
  assert.deepEqual(numbers(desk.query({ ...openingQuery("all"), postedDate: "2026-04-01" })), [
    "SPE7M126T0001",
    "SPE1C126T1746",
    "SPE2A126T9999",
    "SPE4A126P0002",
  ]);

  const updating = newDesk({
    async fetchRecentIndexFiles() {
      return [];
    },
    async fetchIndexFile() {
      return BOLT_UPDATE;
    },
    async fetchSolicitation() {
      throw new Error("not used");
    },
  });
  updating.ingestIndexFile("in260401.txt", INDEX_260401);
  const again = await updating.pullPostedDay("2026-04-02");
  assert.equal(again.solicitations, 1);
  const bolt = updating.query(openingQuery("all")).find((row) => row.solicitationNumber === "SPE1C126T1746");
  assert.equal(bolt?.quantity, 12);
  assert.equal(bolt?.postedDate, "2026-04-02");

  const offline = newDesk({
    async fetchRecentIndexFiles() {
      return [];
    },
    async fetchIndexFile() {
      throw new Error("offline");
    },
    async fetchSolicitation() {
      throw new Error("not used");
    },
  });
  await assert.rejects(() => offline.pullPostedDay("2026-04-03"), /DIBBS/);
  assert.equal(offline.query(openingQuery("all")).length, 0);
  await assert.rejects(() => offline.pullPostedDay("04/03/26"), /Choose a posted day/);
});
