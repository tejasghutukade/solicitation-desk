# Solicitation desk

A local desk for scanning Defense Logistics Agency solicitations published on DIBBS. The official site is a slow search form behind a consent banner, and each solicitation is a long PDF. This app opens on the work a shop can quote, lets you narrow it, and summarizes one solicitation without making the PDF the way you read it.

## Run

Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by the dev server.

The first page load accepts the DIBBS consent banner and downloads the daily index files listed on Recent RFQs into `data/solicitation-desk.sqlite`. That file is local and is not part of the repo. Later starts use the database and do not download the index again. If DIBBS cannot be reached and no database exists yet, the page says so instead of showing an empty list.

No accounts, API keys, or environment variables.

## Shops

One shop is active at a time.

- **Hardware** opens on screws, bolts, washers, seals, O-rings, covers, and tube fittings (FSC `5305`, `5306`, `5310`, `5330`, `5331`, `5340`, `4730`), and on small-business set-asides.
- **Electrical** opens on FSC groups `59` and `61`, with the same small-business set-asides.
- **Medical** opens on FSC group `65`, including unrestricted bids.
- **All** drops the class cut.

Part-number rows are not given a class, so they appear only under All.

Switching shops keeps the search text, the dates, and the set-asides you already chose. Turning every set-aside off shows all set-asides for the shop that is open.

## The list and the brief

The list shows the part name, solicitation number, NSN, quantity, return-by date, and set-aside. Soonest return-by is first. A return-by date within seven days is marked. Search matches solicitation number, NSN, and short name inside the current shop and filters.

Each row has a link to the original DIBBS record. Clicking the row opens the brief and leaves the list up. The index fields appear immediately, then the record and PDF are fetched. The brief fills in with the fields that change from one solicitation to the next: issue date, status, full name, deliver-by, buyer, NAICS, approved source, inspection, Buy American, last price paid, and the technical-requirement codes. **DIBBS page** and **Saved PDF** sit under the return-by date. Close hides the brief. Opening the same solicitation again uses what was stored.

If the fetch fails, the index fields stay on screen and you can try again.
