export type Supplier = "hardware" | "medical" | "electrical" | "all";

export type SetAside = "Y" | "L" | "R" | "H" | "A" | "E" | "N";

export type DeskQuery = {
  supplier: Supplier;
  search: string;
  returnByOnOrBefore: string | null;
  setAsides: SetAside[];
  postedDate: string | null;
};

export type SolicitationRow = {
  solicitationNumber: string;
  nsn: string;
  shortName: string;
  quantity: number;
  unit: string;
  returnBy: string;
  setAside: SetAside;
  postedDate: string;
};

export type ApprovedSource = {
  company: string | null;
  cage: string | null;
  partNumber: string | null;
};

export type LastPaid = {
  unitPrice: string;
  quantity: string;
  awardDate: string;
};

export type SolicitationBrief = SolicitationRow & {
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
  pdfAvailable: boolean;
  recordPageUrl: string;
  loadState: "index-only" | "ready" | "failed";
};

export const SET_ASIDE_LABELS: Record<SetAside, string> = {
  Y: "Small business",
  L: "Women-owned",
  R: "Service-disabled veteran-owned",
  H: "HUBZone",
  A: "8(a)",
  E: "EDWOSB",
  N: "Unrestricted",
};

export const SMALL_BUSINESS_SET_ASIDES: SetAside[] = ["Y", "L", "R", "H", "A", "E"];

export const EVERY_SET_ASIDE: SetAside[] = ["Y", "L", "R", "H", "A", "E", "N"];

export const HARDWARE_CLASSES = ["5305", "5306", "5310", "5330", "5331", "5340", "4730"];

export function openingQuery(supplier: Supplier): DeskQuery {
  const setAsides =
    supplier === "medical" || supplier === "all"
      ? [...EVERY_SET_ASIDE]
      : [...SMALL_BUSINESS_SET_ASIDES];
  return {
    supplier,
    search: "",
    returnByOnOrBefore: null,
    setAsides,
    postedDate: null,
  };
}

export function recordPageUrl(solicitationNumber: string): string {
  return `https://www.dibbs.bsm.dla.mil/Rfq/RfqRec.aspx?sn=${solicitationNumber}`;
}
