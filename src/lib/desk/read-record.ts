import { extractText, getDocumentProxy } from "unpdf";
import type { ApprovedSource, LastPaid } from "./types.ts";

export type RecordDetails = {
  issueDate: string | null;
  status: string | null;
  fullName: string | null;
  deliverBy: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  naics: string | null;
  approvedSource: ApprovedSource | null;
  automatedAward: boolean | null;
  inspection: string | null;
  buyAmerican: boolean | null;
  lastPaid: LastPaid | null;
  requirementCodes: string[];
};

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

function clean(value: string | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim() ?? "";
  return trimmed || null;
}

function issueDate(text: string): string | null {
  const match = /DATE ISSUED\s+(\d{4})\s+([A-Za-z]{3})\s+(\d{1,2})/i.exec(text);
  if (!match) return null;
  const month = MONTHS[match[2].toUpperCase()];
  if (!month) return null;
  return `${match[1]}-${month}-${match[3].padStart(2, "0")}`;
}

function itemDescription(text: string): { name: string | null; index: number } {
  const matches = [...text.matchAll(/ITEM DESCRIPTION\s+([\s\S]{3,220}?)\s+\*/gi)];
  const match = matches.at(-1);
  if (!match || match.index === undefined) return { name: null, index: -1 };
  const raw = clean(match[1]);
  if (!raw) return { name: null, index: match.index };
  const split = /^(\S+)\s+(.+)$/.exec(raw);
  const name = split && !split[1].includes(" ") && split[2].includes(" ") ? split[2] : raw;
  return { name, index: match.index };
}

function lastPaid(text: string): LastPaid | null {
  const match =
    /Procurement History[\s\S]{0,400}?([A-Z0-9]{5})\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\d{8})/i.exec(text);
  if (!match) return null;
  const quantity = Number(match[3]);
  const award = /^(\d{4})(\d{2})(\d{2})$/.exec(match[5]);
  if (!award || Number.isNaN(quantity)) return null;
  return {
    unitPrice: match[4],
    quantity: String(quantity),
    awardDate: `${award[1]}-${award[2]}-${award[3]}`,
  };
}

function approvedSource(text: string): ApprovedSource | null {
  const match =
    /CRITICAL APPLICATION ITEM\s+([A-Z0-9][A-Z0-9 .,&'-]*?)\s+([A-Z0-9]{5})\s+P\/N\s+([A-Z0-9-]+)/i.exec(text);
  if (!match) return null;
  return {
    company: clean(match[1]),
    cage: match[2],
    partNumber: match[3],
  };
}

function requirementCodes(text: string, start: number): string[] {
  const slice = start >= 0 ? text.slice(start, start + 4000) : "";
  const found: string[] = [];
  for (const match of slice.matchAll(/\b(R[A-Z]\d{3})\b/g)) {
    if (!found.includes(match[1])) found.push(match[1]);
  }
  return found;
}

function statusFromHtml(html: string): string | null {
  const match = /color:\s*#000099[^>]*>([^<]+)/i.exec(html);
  return clean(match?.[1]);
}

async function pdfText(pdf: Uint8Array): Promise<string> {
  if (pdf.length < 5) return "";
  const copy = new Uint8Array(pdf);
  try {
    const proxy = await getDocumentProxy(copy);
    const extracted = await extractText(proxy, { mergePages: true });
    const text = extracted.text;
    return Array.isArray(text) ? text.join("\n") : String(text ?? "");
  } catch {
    return "";
  }
}

export async function readRecord(html: string, pdf: Uint8Array): Promise<RecordDetails> {
  const text = await pdfText(pdf);
  const deliver = /DELIVER BY \(Date\)\s+(\d+\s+DAYS(?:\s+ADO)?)/i.exec(text);
  const buyer = /Name:\s*(.+?)\s+Buyer Code:/i.exec(text);
  const email = /Email:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.exec(text);
  const described = itemDescription(text);
  const naics = /NORTH AMERICAN INDUSTRY CLASSIFICATION SYSTEM\s+(\d{6})/i.exec(text);
  const inspection = /INSPECTION POINT:\s*([A-Z]+)/i.exec(text);
  let buyAmerican: boolean | null = null;
  if (/BUY AMERICAN[^\n]{0,80}DOES NOT APPLY/i.test(text)) buyAmerican = false;
  else if (/BUY AMERICAN AND BALANCE OF PAYMENTS PROGRAM,\s*APPLIES/i.test(text)) buyAmerican = true;
  let automatedAward: boolean | null = null;
  if (/THIS (?:RFQ|SOLICITATION) IS AN AUTOMATED AWARD/i.test(text)) automatedAward = true;

  return {
    issueDate: issueDate(text),
    status: statusFromHtml(html),
    fullName: described.name,
    deliverBy: clean(deliver?.[1]),
    buyerName: clean(buyer?.[1]),
    buyerEmail: clean(email?.[1]),
    naics: naics?.[1] ?? null,
    approvedSource: approvedSource(text),
    automatedAward,
    inspection: clean(inspection?.[1]),
    buyAmerican,
    lastPaid: lastPaid(text),
    requirementCodes: requirementCodes(text, described.index),
  };
}
