# 04: Opening a row fills the brief and keeps the PDF

**What to build:** The vendor clicks a row and the list stays put. The brief shows the index fields immediately, then fills in the fields that change from one solicitation to the next, taken from that solicitation's record page and PDF. The saved PDF can be opened from the brief, and a text link can still open the original DIBBS page. Opening the same solicitation again uses what was stored. If the fetch fails, the index fields remain and the brief says the full record could not be loaded. A later successful open replaces that failure.

**Blocked by:** 01: First start loads the recent index onto the desk.

**Status:** ready-for-agent

- [ ] Clicking a row keeps the table visible and paints the index fields at once, before the record and PDF have been fetched.
- [ ] The record page and the PDF are fetched only after a click, and only for that solicitation. They are not pulled for the whole index at startup.
- [ ] When the fetch succeeds, the brief shows issue date, status, the full item name, deliver-by, buyer name, buyer email, NAICS, set-aside, and approved source as company, CAGE, and part number.
- [ ] The brief also shows whether the award is automated, the inspection requirement, and whether Buy American applies.
- [ ] When the PDF includes a procurement history, the brief shows the last unit price, the quantity, and the award date. When it does not, last price stays empty. The app does not invent a price.
- [ ] The brief lists the technical-requirement codes and does not copy the repeated clause text into the panel.
- [ ] A value the PDF does not contain stays blank.
- [ ] The brief offers the saved PDF, and a text link to the original record page. The link is not the way the vendor reads the solicitation.
- [ ] A second open of the same solicitation paints the stored brief and PDF and does not call DIBBS again.
- [ ] A failed fetch keeps the index fields on screen, stores the failure, and says the full record could not be loaded. A later open retries. A success replaces the stored failure.
- [ ] A later index file may update the index fields for that solicitation number. It does not delete a brief that was already fetched.
- [ ] A test drives the desk through a fake DIBBS gateway. One case returns a record page and a PDF whose text contains the agreed fields, then opens the same solicitation again and asserts the gateway was not called the second time. One case fails, asserts the index fields and the failed state, then succeeds and asserts the brief replaced the failure. A PDF with no procurement history yields an empty last price.
