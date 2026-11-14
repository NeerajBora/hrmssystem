# Samanvay — PSU People & Workforce

Interactive Indian PSU HRMS prototype with a Gemini-backed assistant. Employee workflows and records use browser-local fictional data; AI requests run through a server-side Cloudflare Worker.

## Run and build
Requires Node.js (modern version with fetch support).

- Static UI preview: `python3 -m http.server 4173 --directory dist` (AI endpoint requires the Worker).
- Build the deployable Worker: `node scripts/build-ai.mjs`.
- Run the Worker locally, with the assistant live: `node scripts/build-ai.mjs && node scripts/dev-server.mjs`, then open `http://localhost:8787`. Put `GEMINI_API_KEY` in `.dev.vars`, which is gitignored. The development host supplies the identity header that the hosting platform adds in a real deployment; it is a development tool, not an authentication layer, and it is not deployed.
- Tests: `node --test tests/*.test.*`.
- Deploy `dist/server/index.js` to a compatible Cloudflare Worker environment. The Worker embeds the UI assets. Sites hosting identity and access integration is required for the assistant endpoint; hosting elsewhere needs an equivalent trusted authentication layer.
- Configure `GEMINI_API_KEY` as a server secret and optionally `GEMINI_MODEL` (default `gemini-3.1-flash-lite`). OpenAI is a fallback only when Gemini is not configured. Never put keys in browser code. See `.env.example` for variable names.

## Recent additions
- Employee reporting hierarchy, including direct and indirect reports.
- Real Gemini chat in English, Hindi and Hinglish, navigation guidance, conversational request drafts, and review before submission.
- Demo assistant guardrails and context filtering; these do not replace production authorisation.
- HR Employee Services onboarding: new-employee intake form, CSV/TXT upload with preview and duplicate checks, and a full eight-stage onboarding case per joiner.

The static translation system and mock connector statuses are distinct from the live AI endpoint. No live payroll, payments, attendance devices or shared employee database are connected.

## Demonstrated
Eight demo roles; local request creation and drafts; leave validation and balance deduction; attendance corrections; overtime and claim review; transfer stages and service-book update; employee search; payroll exception reconciliation; qualification follow-up; roster editing; CSV/text exports; audit history; kiosk entry and inactivity sign-out. Data persists in browser local storage. HR Administration provides reset.

## Limits
Fictional data only. No backend authentication, server-side authorisation, encryption, real payroll, integrations, file storage, notifications, offline synchronisation, or production delegation. Hindi interface localisation covers all application modules, forms, menus, dialogs and notifications with a bundled language pack. Names, IDs, email addresses and free-form comments remain original. Performance, recruitment, promotion, retirement, and confidential grievance processing need further implementation. Transfer stages can all be demonstrated by HR; production separation of duties is not enforced. Policy and payroll examples are not legal or statutory rules. Accessibility is a design target, not a certification.

## Employee onboarding
HR Employee Services carries one onboarding case per joiner, from offer issued to onboarding complete. Add new employee records personal information, offer and position details, and the checklist conditions that apply (previous employment, background checks, work authorisation, professional licence, security clearance, relocation). Uploading an employee list still creates one case per name, marked as incomplete information until the form is completed.

Eight stages run in order: offer issued, offer accepted, pre-joining in progress, ready to join, reported for joining, active employee, induction and role onboarding, onboarding complete. Onboarding does not start until offer acceptance is recorded; a decline stops the case. A stage advances only when every applicable item due at that stage is Verified or Waived, and each advance is confirmed by a person.

The checklist covers joiner documents, background checks, joining conditions, employment documents, previous-employment transition, relocation and logistics, joining readiness, reporting day, activation, induction and completion. Each item carries a state (Pending, Submitted, Verified, Failed, Waived), a reason or note, and a question-and-reply thread, all logged with date and owner. A failed item does not stop the other items; medical fitness, work authorisation, professional licence, safety training, gate pass and SAP activation are hard blocks that stop the case until they are cleared. Items marked "if applicable" never block a stage.

During pre-joining the joiner settles two things before the case can reach Ready to join. HR sends a proposed joining date and the relocation question; the joiner answers whether relocation is needed, and either accepts the date or suggests other dates. A suggestion does not change the joining date: it waits for HR, who accepts one of the suggested dates or proposes a different one, which goes back to the joiner. The relocation answer is what adds or removes travel, accommodation and transport from the checklist. Both answers are checklist items, so an unsettled confirmation holds the case at pre-joining.

The employee identifier is issued when the case reaches Ready to join, taken from the next free number in the PSU series, or the agency series for an agency contract, and never reusing an identifier already held by an employee or another case. After that, the profile agent drafts the employee record from the case: working pattern and hours, weekly off, attendance scheme, probation end date, payroll group, leave entitlement, access and training with renewal periods.

The pattern comes from a named template matched on the designation, department, grade and employment type, never on the person. Six templates are tried in order: apprentice training, fixed-term field, field duty, executive general, operations rotating shift, and a general default that catches anything else. Each template carries its own hours, weekly off, attendance scheme, extra access and extra training, on top of the HRMS self-service, attendance and payroll-document access and the safety induction every profile gets. An agency contract drafts with no PSU leave entitlement and agency billing instead of PSU payroll. The draft names the template it applied and what that template covers, and HR can apply a different template when a designation does not fit the match; the draft then records that HR chose it, and the matched template can be restored. HR reviews the draft and approves it; only then is the profile created and the person added to People and Service Records. The profile agent is local and deterministic, not a model call: the Gemini endpoint serves the chat assistant and is not used here.

The HR list shows every case with its stage, status (Ready, In progress, Blocked, Pending follow-up, Complete), what is missing and who owns it, filtered to exceptions by default, with counts for offers out, accepted, joining this month, ready, blocked and pending follow-up, and a CSV export. An active employee with an open permitted follow-up reads as Pending follow-up, not complete.

Twelve fictional sample joiners are seeded on a first visit and after a demonstration reset, spread across all eight stages and every status: blocked on a failed marksheet, blocked on an expired medical fitness certificate, blocked on work authorisation under verification, awaiting acceptance, a declined offer, ready to join, reported for joining, active with a pending follow-up, in induction, and complete. Reload sample joiners restores them; cases created here are kept and are not changed. These are illustrative people, not NRL employees.

No live SAP, Saral Pravesh, bank, EPFO or TRACES connection exists in this demo, and no onboarding email or portal link is actually sent. Document lists, medical rules and approval limits are illustrative and are not NRL process definitions.

Run onboarding checks with `node --test tests/onboarding.test.cjs`.

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
