# Solicitation desk

Status: ready-for-agent

## Problem Statement

A vendor who quotes DLA parts cannot scan the day's DIBBS solicitations quickly. The official site is a slow search form behind a consent banner, and each solicitation is a long PDF of repeated clauses. The vendor needs a desk that opens on the work their shop can actually win, lets them narrow it, and explains one solicitation without sending them away to read the PDF from the top.

## Solution

A local web app a reviewer can clone and start with `npm install` and `npm run dev`. The first start downloads the daily DIBBS index files listed on Recent RFQs and stores them in SQLite. The next start uses that database and does not download again.

The screen is a split desk. The left side is a compact table. The right side is a brief of the solicitation the vendor clicked. Four choices control the starting view: Hardware, Medical, Electrical, and All. Search and the extra filters follow the selected choice. Opening a row shows the index fields immediately, then fills the brief from that solicitation's record and PDF. The fetch is stored and is not repeated. The saved PDF stays available. A text link can still open the original DIBBS page.

## User Stories

1. As a vendor, I want the app to download the recent daily index files on the first start, so that the desk is filled with real solicitations without me hunting for files.
2. As a vendor, I want a later start to leave the database alone when those index files are already loaded, so that the demo does not depend on DIBBS a second time.
3. As a reviewer, I want `npm install` and `npm run dev` to create the database and pull the index, so that I can clone the repo and run it on my own machine.
4. As a vendor, I want to choose Hardware, Medical, Electrical, or All, one at a time, so that the list matches the shop I am pretending to be.
5. As a hardware vendor, I want the desk to open on screws, bolts, washers, seals, O-rings, covers, and tube fittings, so that I only see parts a hardware house stocks.
6. As a hardware vendor, I want that opening view limited to small-business set-asides, so that unrestricted bids I am unlikely to win are hidden until I ask for them.
7. As an electrical vendor, I want the desk to open on connectors, cable, and power, so that the list is my commodity.
8. As an electrical vendor, I want that opening view limited to small-business set-asides, so that the same eligibility rule applies as on the hardware desk.
9. As a medical vendor, I want the desk to open on FSC group 65, including unrestricted bids, so that I see the medical work that is actually posted.
10. As a vendor, I want All to open with no supplier preset, so that I can look across every stored solicitation.
11. As a vendor, I want every desk to list the soonest return-by date first, so that I see what closes first.
12. As a vendor, I want the left table to show solicitation number, NSN, short name, quantity, return-by, and set-aside, so that I can scan a row without opening it.
13. As a vendor, I want set-asides named in words, so that I do not have to remember the one-letter codes.
14. As a vendor, I want to cut the list to solicitations that close on or before a chosen day, so that I can ignore work that is too far out.
15. As a vendor, I want to change the set-aside filter, so that a hardware desk can reveal unrestricted bids and a medical desk can hide them.
16. As a vendor, I want to limit the list to one posted day, so that I can see a single DIBBS drop.
17. As a vendor, I want switching supplier to restore that supplier's opening filters, so that a previous set-aside or date choice does not leak into the next shop.
18. As a vendor, I want search to honor the supplier and the filters that are currently on, so that a search on Hardware stays in Hardware.
19. As a vendor, I want to select All before searching, so that I can look for a solicitation number or NSN across the whole index.
20. As a vendor, I want search to match solicitation number, NSN, and the short name, so that I can find a row I already know.
21. As a vendor, I want clearing the search box to leave me on the same supplier and filters, so that search does not throw away the desk.
22. As a vendor, I want the right side to stay empty until I click a row, with a prompt to select a solicitation, so that the brief is not a blank panel with no meaning.
23. As a vendor, I want the list to stay visible when I open a row, so that I can click the next solicitation without going back.
24. As a vendor, I want the brief to show the index fields the moment I click, so that I am not staring at a spinner before I can read the name and the deadline.
25. As a vendor, I want the app to download that solicitation's record and PDF only after I click it, so that the first start does not pull thousands of PDFs.
26. As a vendor, I want the brief to fill in with the fields that change from one PDF to the next, so that I do not read seventeen pages of repeated clauses.
27. As a vendor, I want the brief to show issue date and status, so that I can tell when it was issued and whether it is still open.
28. As a vendor, I want the full item name from the PDF, so that I am not stuck with the 21-character index name once I have opened the row.
29. As a vendor, I want deliver-by, buyer name, and buyer email, so that I know the delivery term and who to ask.
30. As a vendor, I want NAICS, set-aside, and approved source (company, CAGE, and part number) on the brief, so that I can tell whether I am allowed to quote.
31. As a vendor, I want the automated-award, inspection, and Buy American flags, so that I see the rules that change how I quote.
32. As a vendor, I want the last price the government paid, when the PDF includes a procurement history, so that I have a number to price against.
33. As a vendor, I want the technical-requirement codes listed, so that I know which quality clauses apply without pasting the master list into the panel.
34. As a vendor, I want to open the saved PDF from the brief, so that I can read the clauses when the brief is not enough.
35. As a vendor, I want a text link to the original DIBBS record page, so that the assignment's "open the original page" path exists without becoming the way I read the solicitation.
36. As a vendor, I want a second click on the same solicitation to use the stored brief and PDF, so that the app does not call DIBBS again.
37. As a vendor, I want a failed fetch to keep the index fields on screen and say the full record could not be loaded, so that a DIBBS outage does not wipe the row I already understand.
38. As a vendor, I want a later successful open to replace that failure with the brief, so that a stored error does not block a retry forever.
39. As a vendor, I want two solicitations with the same number to appear once, so that a number posted on more than one day does not duplicate the row.
40. As a vendor, I want the posted date to be the day of the index file, so that the posted-date filter matches the DIBBS drop rather than the issue date.
41. As a reviewer, I want the first start to fail clearly when DIBBS cannot be reached and no database exists yet, so that I know the list cannot be built rather than seeing an empty success.
42. As a vendor, I want quantity and unit from the index on the row, so that the table shows how much is being bought before I open the PDF.

## Implementation Decisions

- One Next.js app and a SQLite database. No accounts, no API keys, and no environment variables. `npm run dev` creates the database if it is missing and, only then, pulls the index.
- The first pull accepts the DIBBS consent banner, reads the Recent RFQs page, and downloads every `inYYMMDD.txt` linked there. It does not download record pages, PDFs, or the batch-quote zip.
- Index records are 140-character lines: solicitation (13), NSN or part (46), purchase request (13), return-by `MM/DD/YY` (8), PDF file name (19), quantity (7), unit (2), short name (21), buyer code (5), AMSC (1), item type (1), set-aside (1), set-aside percent (3). The posted date is the date encoded in the file name.
- Federal Supply Class is the first four digits of a numeric NSN. Part-number rows (item type `2`, or a non-numeric identifier) have no FSC and do not match a supplier's class list.
- Hardware classes are `5305`, `5306`, `5310`, `5330`, `5331`, `5340`, and `4730`. Electrical is any class whose first two digits are `59` or `61`. Medical is any class whose first two digits are `65`.
- Small-business set-asides are `Y`, `L`, `R`, `H`, `A`, and `E`. `N` is unrestricted. The screen shows the words: Small business, Women-owned, Service-disabled veteran-owned, HUBZone, 8(a), EDWOSB, Unrestricted.
- Hardware and Electrical open with their classes, those six set-asides, no return-by cut, and no posted-date cut. Medical opens with group `65` and every set-aside. All opens with no class cut and every set-aside. Every choice sorts by return-by ascending, then solicitation number.
- Changing return-by, set-aside, or posted date overrides the opening filters until the vendor switches supplier. Switching supplier restores that supplier's opening filters and clears the search box.
- Search text is applied inside the current filters. It matches solicitation number, NSN, and short name. Selecting All is how a search covers every stored solicitation.
- The table columns are only solicitation, NSN, short name, quantity, return-by, and set-aside. Purchase request, unit, buyer code, AMSC, item type, and set-aside percent are stored and not shown in the table.
- One row per solicitation number. A later index file updates the index fields and the posted date. It does not delete a brief that was already fetched.
- Opening a row paints the index fields at once. If a brief is already stored, it paints that too and does not call DIBBS. Otherwise it fetches the record page `RfqRec.aspx?sn=` and the PDF linked from that page, reads the PDF, and stores the brief and the PDF bytes.
- A failed fetch stores the failure and still returns the index fields with a visible "full record could not be loaded" state. A later open retries. A success replaces the stored failure.
- The brief's extra fields, beyond the index, are: issue date, status, full item name, deliver-by, buyer name, buyer email, NAICS, approved source company, approved source CAGE, approved source part number, automated-award flag, inspection, Buy American flag, last paid unit price with its quantity and award date when a procurement history is present, and the technical-requirement codes. Missing values stay blank rather than being invented. The full clause text is not copied into the brief.
- The brief offers the saved PDF and a text link to the original record page. The link is not the reading experience.
- The DIBBS access used by ingest and by open sits behind one gateway the desk calls. Tests replace that gateway. The fixed-width parse and the PDF field read are reached only through the desk, not as separate products.
- Date-range download in the UI is not part of this build. There is no "pull latest" control yet.

The stored shape that encodes these decisions:

```ts
type Supplier = "hardware" | "medical" | "electrical" | "all";

type DeskQuery = {
  supplier: Supplier;
  search: string;
  returnByOnOrBefore: string | null; // ISO date, inclusive
  setAsides: Array<"Y" | "L" | "R" | "H" | "A" | "E" | "N">;
  postedDate: string | null; // ISO date, exact
};

type SolicitationRow = {
  solicitationNumber: string;
  nsn: string;
  shortName: string;
  quantity: number;
  unit: string;
  returnBy: string;
  setAside: "Y" | "L" | "R" | "H" | "A" | "E" | "N";
  postedDate: string;
};

type SolicitationBrief = SolicitationRow & {
  issueDate: string | null;
  status: string | null;
  fullName: string | null;
  deliverBy: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  naics: string | null;
  approvedSource: { company: string | null; cage: string | null; partNumber: string | null } | null;
  automatedAward: boolean | null;
  inspection: string | null;
  buyAmerican: boolean | null;
  lastPaid: { unitPrice: string; quantity: string; awardDate: string } | null;
  requirementCodes: string[];
  pdfAvailable: boolean;
  recordPageUrl: string;
  loadState: "index-only" | "ready" | "failed";
};
```

## Testing Decisions

A good test exercises the desk from the outside. It passes index-file text or a fake DIBBS gateway in, and it asserts the rows, the brief, and whether the gateway was called. It does not assert private parsers, SQL, or component structure.

There is one seam, the solicitation desk:

- Ingest a fixture index file and query it back as each supplier, with search and each extra filter.
- Open a solicitation against a fake gateway that returns one record page and one PDF, then open it again and assert the gateway was not called the second time.
- Open against a gateway that fails, assert the index fields and the failed state, then open against a gateway that succeeds and assert the brief replaced the failure.
- Give the fake gateway a PDF whose text contains the agreed fields, and assert those fields on the brief. A PDF that lacks procurement history yields an empty last price, not a guessed one.

The repo has no existing tests. These are the first ones, and they all go through that one seam. The browser is not a second seam.

## Out of Scope

- A date-range control, or any later UI, for downloading more index days.
- Re-downloading the index on every start.
- Prefetching every record page or every PDF.
- Rendering the PDF's clause text inside the brief, or parsing the PDF into a quote form the vendor fills in.
- The batch-quote zip and the approved-source companion file. Approved source comes from the opened PDF.
- Accounts, quote submission, awards, email alerts, and charts.
- Editing a supplier's classes in the UI.
- A hosted deployment. The demo is local.
- Keeping the full record loaded when DIBBS is down and that row was never opened. The index fields remain; the brief does not appear from nowhere.

## Further Notes

- Recent RFQs is `https://www.dibbs.bsm.dla.mil/Rfq/RfqDates.aspx?category=recent`. Both `www.dibbs.bsm.dla.mil` and `dibbs2.bsm.dla.mil` show a consent banner that must be accepted before the file or PDF is returned. Individual PDFs are linked from the record page, for example `https://dibbs2.bsm.dla.mil/Downloads/RFQ/6/SPE1C126T1746.PDF`.
- One sampled PDF was 17 pages. The useful fields sit on the cover, the procurement-history line, and Section B. The rest is repeated clause text.
- The index short name is capped at 21 characters. The full name is a brief field and can be absent until the PDF has been read.
- The record page for a row is `https://www.dibbs.bsm.dla.mil/Rfq/RfqRec.aspx?sn=` plus the solicitation number.
- If the first start cannot reach DIBBS, there is no list. That is accepted. After a successful first start, the list, search, and filters work without the network. Only an unopened row needs DIBBS.
