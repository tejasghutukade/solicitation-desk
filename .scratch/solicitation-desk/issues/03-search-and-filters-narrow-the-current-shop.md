# 03: Search and extra filters narrow the current shop

**What to build:** On the shop that is already open, the vendor can cut the list to work that closes on or before a chosen day, change which set-asides are included, or limit it to a single posted day. Search finds a solicitation number, NSN, or short name inside that same shop and those same filters. Clearing the search box leaves the shop and the filters in place. Switching supplier throws the overrides away and clears the search.

**Blocked by:** 02: Supplier choice opens the matching shop.

**Status:** ready-for-agent

- [ ] A return-by choice keeps solicitations that close on or before the chosen day, inclusive, and drops the rest.
- [ ] A set-aside choice replaces the shop's opening set-asides until the vendor switches supplier. A hardware desk can reveal unrestricted bids. A medical desk can hide them.
- [ ] A posted-date choice keeps one DIBBS drop. The posted date is the day of the index file, not the issue date.
- [ ] Search matches solicitation number, NSN, and short name, and it applies inside the supplier and the filters that are currently on. Selecting All is how a search covers every stored solicitation.
- [ ] Clearing the search box leaves the supplier and the filters unchanged.
- [ ] Switching supplier restores that supplier's opening filters and clears the search box.
- [ ] A test ingests a fixture index through the desk and asserts search, return-by, set-aside, and posted-date against each supplier, including that a supplier switch discards the previous overrides.
