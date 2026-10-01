# Solicitation desk

A local desk for scanning Defense Logistics Agency solicitations from DIBBS. The first start downloads the daily index files listed on Recent RFQs into a SQLite database. Later starts use that database.

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by the dev server. The first page load fills the desk. If DIBBS cannot be reached and the database does not exist yet, the page says so instead of showing an empty list.
