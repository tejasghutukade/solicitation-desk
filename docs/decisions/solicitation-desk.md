# Solicitation desk

The Solicitation desk is a local web app a reviewer can clone and run. The sections below are the decisions that define it: what was chosen, and why that choice was the one that stayed.

## Product

A reviewer clones the repository and starts it with npm install and npm run dev. The app scans DLA DIBBS solicitations on that machine. There are no accounts, no API keys, and no environment variables, and the app is not deployed anywhere. The point of the product is that a reviewer can run the desk from a clone without a service account or a host.

## Stack

The project is one Next.js app. It keeps its data in a SQLite database opened through node:sqlite. The database file is data/solicitation-desk.sqlite, and that file is not committed. Each clone creates its own database the first time the app runs.

## Startup

The first page load accepts the DIBBS DoD consent banner, reads Recent RFQs at https://www.dibbs.bsm.dla.mil/Rfq/RfqDates.aspx?category=recent, and downloads every daily index file named inYYMMDD.txt that the page links. While that download runs, the screen is a loader.

Startup stops at those index files. Record pages, PDFs, and the batch-quote zip are left alone.

If that download succeeds, later starts use the database and do not download the index again. The desk can then open when DIBBS is slow or unreachable.

If DIBBS cannot be reached and no database exists, the start fails in the open. An empty list would look like a successful scan with nothing posted, so the failure is shown instead.

## The index

Each index line is 140 characters. The fields, in order, and their widths:

- solicitation, 13
- NSN or part, 46
- purchase request, 13
- return-by, 8, written MM/DD/YY
- PDF file name, 19
- quantity, 7
- unit, 2
- short name, 21
- buyer code, 5
- AMSC, 1
- item type, 1
- set-aside, 1
- set-aside percent, 3

The posted date is the date encoded in the file name. The issue date is a different value, read later from the solicitation itself. The posted-day filter uses the file date so a day's drop stays attached to the index file that carried it.

The desk stores one row per solicitation number. A later index file updates that row's index fields and its posted date. A brief already fetched for that number stays. The newer index refreshes the listing without throwing away a record the reviewer has already opened.

Purchase request, unit, buyer code, AMSC, item type, and set-aside percent are stored with the row. The list shows solicitation, NSN, short name, quantity and unit, return-by, and set-aside.

## Shops

The shops are Hardware, Medical, Electrical, and All. One shop is on at a time. The desk opens on Hardware.

Federal Supply Class is the first four digits of a numeric NSN. Hardware matches classes 5305, 5306, 5310, 5330, 5331, 5340, and 4730. Electrical matches a class that starts with 59 or 61. Medical matches a class that starts with 65. All has no class cut, so it shows every stored row the other filters allow.

A part-number row has no class. Item type 2 marks one, and so does an identifier that contains a letter. Those rows do not match a shop's class list, so Hardware, Medical, and Electrical leave them out.

## Set-asides

Set-asides are shown in words. The letters and the words are Y Small business, L Women-owned, R Service-disabled veteran-owned, H HUBZone, A 8(a), E EDWOSB, and N Unrestricted.

Hardware and Electrical open with the six small-business set-asides: Y, L, R, H, A, and E. Medical and All open with every set-aside, including unrestricted.

That opening set is the selection on the first screen. Switching shops keeps the search text, the close-on-or-before date, the posted day, and the set-aside selection already on screen. An earlier rule restored each shop's opening set on every switch. That rule was dropped. The selection the reviewer has already made stays, and switching shops does not put the new shop's opening set back.

If no set-aside is selected, the list is not emptied. Every set-aside in the current shop is shown. Clearing the set-aside choices means "all of this shop," not "none."

## Other filters and the list

Search matches solicitation number, NSN, and short name. It applies inside the current shop and inside the other filters already on, so a search cannot wander into another shop or past a date the reviewer has set.

Close on or before is inclusive. A solicitation that returns on the chosen day stays in the list.

Posted day is an exact match, and it uses the index-file date.

Sort is return-by ascending, then solicitation number, so the soonest deadline is first and a tie breaks on the solicitation number.

The list shows the first 200 rows. Show more reveals the next 200.

A return-by date within the next 7 days is marked, so deadlines that are close are visible in the scan.

## Reading a solicitation

The brief stays closed until a row is clicked, and it can be closed.

A click paints the index fields immediately, then fetches that solicitation's DIBBS record page and PDF in the background. While the fetch runs, the brief shows "Fetching the record". The fetch is stored. A second open uses what was stored and does not call DIBBS. The reviewer can read the name and the deadline at once, and a repeat visit does not depend on DIBBS still answering.

A failed fetch keeps the index fields and says the full record could not be loaded. A later open retries. A stored failure does not freeze the row, and it does not wipe the index fields the reviewer already has.

The brief's extra fields come from the PDF text and the record page: issue date, status, full item name, deliver-by, buyer name, buyer email, NAICS, approved source (company, CAGE, and part number), inspection, Buy American, last paid unit price with quantity and award date when a procurement history exists, and technical-requirement codes. Missing values stay blank. The desk does not invent a value the source did not provide. Clause text is not copied into the brief. Automated award is recorded only when the PDF states that this solicitation is an automated award.

## Links and the saved PDF

Every list row has a DIBBS page link. The address is https://www.dibbs.bsm.dla.mil/Rfq/RfqRec.aspx?sn= followed by the solicitation number. The brief shows that link. Once the PDF has been stored, the brief also shows the saved PDF as a button. The PDF is kept in SQLite and served by the app, so the file is still there after DIBBS has been left alone.

## Tests

There is one seam, the solicitation desk. Tests pass fixture index text or a fake DIBBS gateway and assert the rows, the brief, and whether the gateway was called. They do not assert SQL, and they do not assert the browser. The seam is the behavior a reviewer can see, not the query text or the page markup.

## Out of scope

These were left out of the product: a date-range control for downloading more index days, a pull-latest button, prefetching every PDF, rendering clause text in the brief, the batch-quote zip, editing a shop's classes in the UI, accounts, quote submission, awards, email alerts, charts, and a hosted deployment.

## A path that was rejected

Parsing every PDF during the first startup was abandoned because it blocked the demo. Detail fetching happens only after a row is opened.
