# 02: Supplier choice opens the matching shop

**What to build:** The vendor picks Hardware, Medical, Electrical, or All, one at a time, and the table becomes the shop they are pretending to be. Hardware and Electrical open on their parts and on small-business set-asides only. Medical opens on medical parts and includes unrestricted bids. All opens across every stored solicitation. Switching shops restores that shop's opening list.

**Blocked by:** 01: First start loads the recent index onto the desk.

**Status:** ready-for-agent

- [ ] The desk offers Hardware, Medical, Electrical, and All, and only one is active at a time.
- [ ] Federal Supply Class is the first four digits of a numeric NSN. Part-number rows (item type `2`, or a non-numeric identifier) have no class and do not match a supplier's class list.
- [ ] Hardware opens on classes `5305`, `5306`, `5310`, `5330`, `5331`, `5340`, and `4730`, and on set-asides `Y`, `L`, `R`, `H`, `A`, and `E` only.
- [ ] Electrical opens on any class whose first two digits are `59` or `61`, and on those same six set-asides.
- [ ] Medical opens on any class whose first two digits are `65`, and on every set-aside, including unrestricted `N`.
- [ ] All opens with no class cut and every set-aside.
- [ ] Every choice sorts by return-by ascending, then solicitation number.
- [ ] Switching supplier restores that supplier's opening list. A previous shop's narrower choices do not carry over.
- [ ] A test ingests a fixture index through the desk and queries it back as each supplier, asserting which rows each shop shows and which it hides.
