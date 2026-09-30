# Lekplatskontroll

Static Swedish playground inspection prototype with four dummy playgrounds,
Excel-defined elements and checklists, and inspector selection (Lasse or Abdi).

## Excel configuration

Excel is the master. Edit and save **`data/lekplatskontroll.xlsx`** directly, then
publish the updated file with the static app. No CSV export or JSON conversion
is needed. The workbook contains two tabs:

- **Lekplatsmatris**: `Lekplats`, then a column for each element. Optional `Område` and `Adress` columns may also be included. Mark assignments with X or leave cells blank. No ID column is needed.
- **Element**: element names in row 1, then a list of checks down each column. Each element has its own checklist; shared wording can be repeated in different columns. Blank cells are skipped, and the top-to-bottom order defines the checklist order.

Use X (uppercase or lowercase) only in Lekplatsmatris. In Element, write the
actual checks. Lists may have different lengths. The sample names, checks and
Xs are examples to replace with the real inventory. Tab order
does not matter, but keep these tab names and row 1 column headings. Formatting
can be changed freely; trailing formatted empty rows/columns are ignored.
The app reports missing tabs, invalid markers, duplicate names, mismatched
elements, empty checklists, duplicate checks within one element, and Excel cell
errors. Every playground needs at least one assigned element, and every element
needs at least one check.

Add new playgrounds as rows with a unique name. Add checks directly below the
element heading; checks do not need IDs. To add an element, add a column with the
same heading in both tabs, write its checks, and fill its playground assignments.
Save as `.xlsx`, not legacy `.xls`.

Playground names identify saved inspections. Sorting the workbook does not affect
saved progress; renaming a playground creates a new playground entry.
Element names serve as their identity; renaming an element creates a new element for subsequent
inspections. Started inspections retain a copy of their playground assignments
and questions, so edits or reordering in Excel affect new inspections only.

The dummy types are Gångbro, Spång, Skulptur, and Lekhus. A server is required;
opening index.html directly cannot fetch the workbook. The app reads stored cell
values, not formula calculations; if formulas are used, recalculate and save the
workbook in Excel before publishing.

The SheetJS mini reader (0.20.3, Apache 2.0) is included in `vendor/`. It is
279,523 bytes uncompressed, approximately 86,859 bytes gzipped. No npm install,
runtime CDN, build command, or backend is required for hosting on GitHub Pages,
Firebase Hosting, or another static host.

## Run

Serve this directory with `python -m http.server 8080`, then visit `http://localhost:8080`. For phone testing on the same Wi-Fi, use your computer's IP address. Deploy to an HTTPS static host for offline support on phones.

## Saved inspections

Browser Back and Forward follow the playground list, playground overview, and
feature form. Reloading restores the current screen. Returning from a saved form
uses the existing overview history entry. Back from the main playground list
can leave the site normally.

Answers and defect notes are saved as drafts in localStorage as they change. Reloading or leaving a form preserves the draft. A feature only counts as completed after saving all answers with descriptions for every defect.

The inspector is recorded at the first answer; the report date is the last inspection edit. Changing the inspector dropdown applies to new inspections. Older records without an inspector are explicitly labelled as unrecorded.

All completed checks make the report available. A playground only counts as reported after the user confirms sending the email. Opening an email client does not verify delivery. Reports can also be copied to the clipboard.

Start a new inspection from the playground overview. This archives the previous plain-text report in that playground's history and clears its current answers. History and drafts are local to this browser. Clearing browser data or using the app's reset action removes them.

## Offline and email

On HTTPS (or localhost), a service worker caches the app after the first online visit. Allow installation to finish before relying on offline reopening. Direct file opening and HTTP over a phone's local network do not provide this offline guarantee.

Sending email still requires an email client and connectivity; long mailto bodies should be checked on the actual phones and email clients. The clipboard option remains available if email handoff fails.

## Verification

Run `node test-app.cjs` for regression checks of draft recovery, attribution, required descriptions, safe text rendering, report history, and storage errors. Run `node --check app.js` and `node --check sw.js` for syntax checks.

Run `node test-workbook.cjs` for real XLSX reading and matrix validation checks.

The automated checks use a simulated DOM; phone layout and native email handoff need device testing.
