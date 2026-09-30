# Lekplatskontroll

Static Swedish playground inspection prototype with four dummy playgrounds,
CSV-defined feature types and checklists, and inspector selection (Lasse or Abdi).

## Excel configuration

Excel is the master. Export the two matrix sheets as CSV UTF-8 and replace:

- `data/lekplatser.csv`: `Id;Lekplats;Område;Adress` followed by a column for each feature type. Område and Adress are optional.
- `data/kontrollpunkter.csv`: `Id;Kontrollpunkt` followed by the same feature type columns (column order may differ).

Use X (uppercase or lowercase) for assignments and blank cells for everything
else. Both comma and semicolon separators are accepted. Quoted cells, embedded
newlines, Swedish letters, and Excel's UTF-8 BOM are supported. The app reports
invalid markers, duplicate IDs/names, mismatched feature types, and empty forms.
Question row order defines checklist order.

Keep IDs stable when changing playground names or check wording. Feature type
names currently serve as their identity; renaming a feature type creates a new
type for subsequent inspections. Started inspections retain a copy of their
playground assignments and questions until a new inspection is started.

The dummy types are Gångbro, Spång, Skulptur, and Lekhus. Publish both CSV files
together. A server is required; opening index.html directly cannot fetch the CSVs.

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

Run `node test-csv.cjs` for matrix conversion and CSV parsing/validation checks.

The automated checks use a simulated DOM; phone layout and native email handoff need device testing.
