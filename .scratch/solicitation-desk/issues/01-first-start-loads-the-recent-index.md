# 01: First start loads the recent index onto the desk

**What to build:** A reviewer clones the repo, runs `npm install` and `npm run dev`, and the split desk fills with real solicitations from the Recent RFQs daily index files. The left side is a compact table sorted by the soonest return-by date. The right side asks them to select a solicitation. A later start uses the stored data and does not download again. If DIBBS cannot be reached and nothing has been stored yet, the start fails in the open instead of showing an empty desk.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `npm install` and `npm run dev` create the local database and pull the index. There are no accounts, API keys, or environment variables.
- [ ] The first start accepts the DIBBS consent banner, reads the Recent RFQs page, and downloads every daily index file linked there. It does not download record pages, PDFs, or the batch-quote zip.
- [ ] Each index line is read as a 140-character record: solicitation (13), NSN or part (46), purchase request (13), return-by `MM/DD/YY` (8), PDF file name (19), quantity (7), unit (2), short name (21), buyer code (5), AMSC (1), item type (1), set-aside (1), set-aside percent (3). The posted date is the day encoded in the file name.
- [ ] The table shows only solicitation number, NSN, short name, quantity, return-by, and set-aside. Purchase request, unit, buyer code, AMSC, item type, and set-aside percent are stored and are not columns.
- [ ] Set-asides are shown in words: Small business, Women-owned, Service-disabled veteran-owned, HUBZone, 8(a), EDWOSB, Unrestricted, for the codes `Y`, `L`, `R`, `H`, `A`, `E`, and `N`.
- [ ] Rows are sorted by return-by ascending, then solicitation number.
- [ ] One row per solicitation number. When the same number appears in a later index file, that file updates the index fields and the posted date. It does not add a second row, and it does not delete a brief that was already fetched.
- [ ] A later start leaves the database alone and does not download the index again.
- [ ] If the first start cannot reach DIBBS and no database exists, the start fails clearly. The desk does not present an empty list as success.
- [ ] Until a row is clicked, the right side stays empty and prompts the vendor to select a solicitation.
- [ ] A test passes fixture index-file text in through the desk and asserts the rows that come back, including one row per solicitation number and the posted date taken from the file name. It does not assert a private parser or SQL.
