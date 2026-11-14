# Samanvay — PSU People & Workforce

Interactive Indian PSU HRMS prototype with a Gemini-backed assistant. Employee workflows and records use browser-local fictional data; AI requests run through a server-side Cloudflare Worker.

## Run and build
Requires Node.js (modern version with fetch support).

- Static UI preview: `python3 -m http.server 4173 --directory dist` (AI endpoint requires the Worker).
- Build the deployable Worker: `node scripts/build-ai.mjs`.
- Tests: `node --test tests/*.test.*`.
- Deploy `dist/server/index.js` to a compatible Cloudflare Worker environment. The Worker embeds the UI assets. Sites hosting identity and access integration is required for the assistant endpoint; hosting elsewhere needs an equivalent trusted authentication layer.
- Configure `GEMINI_API_KEY` as a server secret and optionally `GEMINI_MODEL` (default `gemini-3.1-flash-lite`). OpenAI is a fallback only when Gemini is not configured. Never put keys in browser code. See `.env.example` for variable names.

## Recent additions
- Employee reporting hierarchy, including direct and indirect reports.
- Real Gemini chat in English, Hindi and Hinglish, navigation guidance, conversational request drafts, and review before submission.
- Demo assistant guardrails and context filtering; these do not replace production authorisation.
- HR Employee Services onboarding CSV/TXT upload, preview, duplicate checks and individual Initiated records. Subsequent stages await process definition.

The static translation system and mock connector statuses are distinct from the live AI endpoint. No live payroll, payments, attendance devices or shared employee database are connected.

## Demonstrated
Eight demo roles; local request creation and drafts; leave validation and balance deduction; attendance corrections; overtime and claim review; transfer stages and service-book update; employee search; payroll exception reconciliation; qualification follow-up; roster editing; CSV/text exports; audit history; kiosk entry and inactivity sign-out. Data persists in browser local storage. HR Administration provides reset.

## Limits
Fictional data only. No backend authentication, server-side authorisation, encryption, real payroll, integrations, file storage, notifications, offline synchronisation, or production delegation. Hindi interface localisation covers all application modules, forms, menus, dialogs and notifications with a bundled language pack. Names, IDs, email addresses and free-form comments remain original. Performance, recruitment, promotion, retirement, and confidential grievance processing need further implementation. Transfer stages can all be demonstrated by HR; production separation of duties is not enforced. Policy and payroll examples are not legal or statutory rules. Accessibility is a design target, not a certification.

## Organisation messages
The inbox icon beside the notification bell opens employee-scoped fictional compensation, team transfer, and promotion communications. It supports unread counts, type/search filters, document preview/download, receipt acknowledgement, threaded comments, browser-persistent comment drafts, Cancel (discard unsaved edits), Archive and Restore, and activity history. Submitted acknowledgements do not change pay, grade, team, or service records. No response is transmitted to a real HR service; existing browser-local demo storage is used. The user-supplied reference image was used only for layout and is not included in the site.

## Sidebar controls
The three-line button in the top-left toggles desktop navigation and remembers the desktop collapsed preference in this browser. The sidebar also has an explicit close control. On mobile, the menu is a drawer that closes via its close control, outside overlay, Escape, or choosing a navigation destination. Keyboard focus stays within the open mobile drawer and returns to the menu button on dismissal.

## Account menu and personal profile
The header groups the menu button and NRL logo/name at the left, with a sticky header. The avatar/name opens an account popover with View profile, My requests, Account preferences, Organisation messages, and Sign out. View profile opens a dedicated hash-routed page (`#/profile/overview`) with personal information, work/organisation, service history, documents, and preferences. Browser Back and direct profile links are supported; the selected demo role is remembered per tab. Preferred name, about text, contact, emergency contact, and address edits are scoped to the demo employee and saved locally with activity history. Official legal/identity and employment changes remain HR-managed. Reference photographs were used only for design inspiration and are not included in the published assets.


## Hindi interface
The top language button switches the full interface between English and Hindi without resetting the current page or typed form values. A bundled Hindi language pack (`dist/i18n/hi.js`) and local DOM localisation layer (`dist/i18n.js`) translate module pages, dynamic dialogs, menus, labels, placeholders, statuses, stock messages and validation feedback. The selected language persists in this browser and is available in Account preferences. No external translation API, API key, or employee-data transmission is used. Employee names, identifiers, filenames, email addresses, original downloads and free-form comments retain their original content. New interface copy must be added to the language pack; this is interface localisation, not an arbitrary-text machine translator.

Run localisation checks with `node --test tests/i18n.test.cjs`.

## Leave types and balances
Apply for leave now has all 19 options shown in the supplied references, grouped into Personal Leave, Family Leave, Time Off, and Shift & On-Call Allowance. Numeric balances appear beside options and in the balance panel; the Leave tab also lists every leave balance. Zero availability opens a recoverable alert and blocks submission without clearing the form. Requests exceeding available days are rejected, and approvals recheck availability and deduct only the selected leave type once. Pending requests reserve days; drafts, returned requests, and rejected requests do not. Legacy requests without a subtype are treated as Annual Leave, preserving existing annual balances.

Loss of Pay and Leave of Absence show unpaid/policy-based rules instead of a misleading zero balance. Shift options create a separate duty allowance request and do not deduct leave. Agency workers do not automatically receive PSU employee entitlements. All balances are fictional, browser-local examples, not NRL policy or statutory entitlements. Calendar-day counting and the existing configurable maximum-request length remain in use. All new interface text is included in the Hindi pack. Source reference photographs are not published.

Run balance checks with `node --test tests/leave-model.test.cjs tests/i18n.test.cjs`.
