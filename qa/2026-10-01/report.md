# Playground inspection app: QA report

Tested 1 October 2026 using Playwright Chromium on localhost, with app asset version 21. Screenshots and results describe the current uncommitted implementation.

## Result

The tested user flows passed. All five playgrounds and eleven assigned element forms opened successfully. A full sixteen-check inspection of Bäckparkens lekplats was completed, reported, archived, and reset through the UI. Tests ran in a separate browser context, preserving the user's existing browser storage.

## Coverage

| Check | Result |
| --- | --- |
| Required inspector name | Opening a playground without a name remained on the list and produced input validation. |
| Updated Excel workbook | Lekhus contained the new longer final check. |
| Element layout | Corner numbers and long instructions fit at 390px and 320px; no document horizontal overflow. Desktop width 1280px also fit. |
| Issue validation | Empty and whitespace-only descriptions did not increase valid-answer progress. Entering a description increased the counter. |
| Automatic completion | Answering all checks enabled the report without a save action. |
| Partial progress | One valid Lekhus answer appeared as 1/5 in the form and 1/16 in the playground footer. |
| Incomplete report | Report action remained disabled while checks were incomplete. |
| Autosave and reload | An issue description and current form survived reload. |
| Back and browser history | Form-to-overview and overview-to-list navigation worked; browser Back/Forward restored the expected screen. |
| Inspector attribution | Changing the name on the playground list did not alter the inspector attached to an existing inspection. |
| Report content | Included checks, the recorded issue, the updated long instruction, and original inspector name. HTML-like issue text remained plain text. |
| Clipboard | Copied report matched the preview, after normalizing Windows CRLF line endings. |
| Email action | Clicking Skicka rapport exercised the handoff action. External mail client contents and delivery were not verified. |
| Report confirmation | Cancel kept the report open; Confirm marked the playground sent and increased the sent count to one. |
| Repeat inspection and history | New inspection archived the previous report, cleared current progress, and exposed history. |
| Settings | Invalid email was rejected. A valid recipient persisted after reload. |
| Modal keyboard controls | Escape closed dialogs; settings trapped focus and returned it to the cog button. |
| UI reset cancellation | Cancel preserved saved inspection data. |
| UI reset confirmation | Cleared inspections and inspector name, reset counts, preserved the configured recipient and an unrelated localStorage key. |
| Query reset | reset=1 cleared only the app's two storage keys and removed itself from the URL. An unrelated key remained. |
| Offline reload | After service-worker installation and an online reload, Chromium offline mode successfully reloaded the active form with its saved 1/5 progress. |
| All routes | Opened every playground and every assigned element form, verifying initial counters against their check counts. |

The existing app and workbook test suites passed. JavaScript syntax and diff whitespace checks passed. Storage failure/corrupt-data handling is covered by the existing simulated tests rather than this browser pass.

## UX observations

- The corner numbers and full-width wrapped instructions are readable in the tested sizes. The longer Lekhus text needs no truncation or additional action.
- An empty issue correctly blocks completion, but the form does not explicitly state that its description is required. The counter is the main clue.
- The report sheet still has nested scrolling and a monospace text preview. It works, but remains the densest part of the flow.
- Transient toast messages can temporarily cover lower form content or settings help. Key screenshots were recaptured after transitions and transient messages settled; state-change captures may intentionally include a toast.
- The default recipient is still the placeholder lekplatskontroll@kommun.se. It can now be changed in settings. Extracting shared configuration was discussed during testing; no config extraction is included in this QA pass.

## Confirmation wording

Reset confirmation was verified as:

> Rensar pågående och slutförda inspektioner i appen inklusive namn på besiktningsman. Rapporter som skickats med epost påverkas inte.
>
> Vill du rensa inspektionsdata?

Native browser confirmation dialogs are not part of page screenshots. Their exact text and Cancel/Confirm behaviour were checked through Playwright dialog events.

## Screenshots

| File | State |
| --- | --- |
| [01-playgrounds.png](screenshots/01-playgrounds.png) | Playground list and cog button |
| [02-required-name.png](screenshots/02-required-name.png) | Name validation attempt |
| [03-lekhus-long-text.png](screenshots/03-lekhus-long-text.png) | Long-text form and corner numbering |
| [04-empty-issue.png](screenshots/04-empty-issue.png) | Issue without description |
| [05-partial-overview.png](screenshots/05-partial-overview.png) | Partial progress |
| [06-complete-overview.png](screenshots/06-complete-overview.png) | Complete inspection with one issue |
| [07-report-preview.png](screenshots/07-report-preview.png) | Report preview and actions |
| [08-reported-playground.png](screenshots/08-reported-playground.png) | Report marked sent |
| [09-history.png](screenshots/09-history.png) | Archived report |
| [10-settings-reset.png](screenshots/10-settings-reset.png) | Settings and reset wording |
| [11-reset-complete.png](screenshots/11-reset-complete.png) | Cleared inspection data |
| [12-lekhus-320px.png](screenshots/12-lekhus-320px.png) | Narrow mobile layout |
| [13-desktop.png](screenshots/13-desktop.png) | Desktop layout |
| [14-offline-reload.png](screenshots/14-offline-reload.png) | Offline form reload |
| [15-url-reset.png](screenshots/15-url-reset.png) | Query reset |

## Limits

This was desktop Chromium with resized viewports, not a physical phone or Safari/Edge device pass. On-screen keyboard behaviour, touch ergonomics, installed-PWA behaviour, offline deployment updates, external email clients, mailto body limits, and actual email delivery remain unverified. The tests do not establish compliance with any inspection standard.
