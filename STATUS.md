# HMS Web Front End - STATUS

Last updated: after Slice 2 (Patients)

## Stack and decisions
- Next.js App Router + TypeScript strict, Tailwind v4, React Hook Form + Zod, Vitest. Package manager: npm. Node v24.
- Design: Swiss / minimalism, border radius 0, 1px lines, no shadows.
  - Text, headings, labels, borders and normal buttons are black ink (#0F172A).
  - Blue (#0284C7) appears only on a trigger: hover, focus, selected sidebar item. Page background #F0F9FF, surface #FFFFFF.
  - Accent #BAE6FD for badges and row hover. Dark blue #075985 is defined but barely used. Error red #B91C1C.
  - Fonts: Public Sans (headlines), Inter (body), loaded with next/font/google.
- The API token lives only in the httpOnly cookie `hms_session`. All backend calls are made on the Next.js server through src/lib/api/client.ts. API_BASE_URL is in .env.local.
- UI components are hand-written in src/components/ui (no shadcn yet). Confirmation dialogs use the native <dialog>.
- Sidebar items for screens that are not built show "Soon". Flip `ready` in src/components/layout/nav-items.ts when a screen exists.
- Patient data never goes into URLs, titles, logs or storage. Search criteria live in component state only. Links that open a patient record use prefetch={false} because opening a record is an audited read.
- Button text contrast: normal buttons are black with white text, so the old primary-blue contrast issue (about 4.1:1) no longer applies.

## Slice 1 Foundation - DONE (confirmed by the user: login and dashboard work)
- Project setup, API client (apiFetch), error mapping (ClientError, ApiError), ActionResult, apiLoad for pages.
- Login, logout, session-expired route, change-password (server action), password show/hide toggle.
- proxy.ts (cookie check) + re-check in (app)/layout.tsx, forced redirect when must_change_password is true.
- Permissions: can / canAny / canAll, useCan() on the client, PermissionCode type.
- Money and date helpers (money.ts, datetime.ts), error / empty / notice components, loading and error pages.
- Unit tests written for money, datetime, permissions, errors, me parser.

## Slice 2 Patients - WRITTEN, NOT YET RUN
- /patients: search by name, phone, MRN (+ optional date of birth). Needs at least one of name, phone, MRN. Paged results.
- /patients/new: register form with contacts. possible_duplicate (409) shows a confirm step; "Register anyway" resends with acknowledge_duplicates: true.
- /patients/[id]: details, contacts, identifiers, consents. Record a consent, withdraw a consent (confirm dialog).
- Fix included: /identity/me name is `full_name`.
- Tests written (not run): payload, parse, format.

## Real API facts learned
- GET /identity/me answers flat data: { id, full_name, email, phone, user_type, status, must_change_password, mfa_enabled, permissions[] }.
- GET /organization/hospitals: timezone "Asia/Qatar", currency_code "INR", date_format "DD/MM/YYYY", default_locale "en". Paginated (per_page 25).
  - Timezone Qatar with currency INR looks odd. Check the seed data before Slice 3, because appointments use the hospital timezone.
- GET /patients needs at least one of q, mrn, phone, name. The request q=a returned 422 (probably too short a term).
- change-password rules (from openapi): at least 12 characters, upper and lower case, a number and a symbol. It signs out every other device.
- openapi.json has NO response schemas, only request bodies and query params. Generated types (npm run api:types) cover requests only.

## Assumptions to confirm (all in src/features/patients/parse.ts)
- Patient responses use the same field names as the register request: full_name (or title/first_name/middle_name/last_name), mrn, sex_at_birth, date_of_birth, estimated_age_years, phone, email, blood_group, preferred_language, contacts[], identifiers[] (id_type, value), consents[] (id, type, method, given_by, status).
- A consent counts as withdrawn when status == "withdrawn" or withdrawn_at is set.
- If a field shows empty on screen, send that endpoint's JSON and fix parse.ts only.

## Not built yet in Slice 2
- Identifiers (ABHA, passport, ...) at registration.
- Consents at registration (use the consent form on the patient record).
- Patient update, allergies, documents, merge: not in the backend (see Backend requests).

## Blocked / open
- No patient response sample yet (the first patient has to be registered through the new form).
- Hospital timezone vs currency (see above).

## Backend requests
1. Response schemas in openapi.json for every endpoint the screens use.
2. Dashboard statistics endpoints (today's counts, collections). Not in the backend, so the dashboard will use existing endpoints only.
3. Not in the backend (do not build): patient update/correction, allergies, documents, patient merge, prescriptions, orders and lab results, notifications, MFA and forgot password, patient portal, GST/credit notes/refunds/printable bills, reports, admission/beds, pharmacy, laboratory, inventory.

## Next
- Slice 3 Appointments: day list, free slots (max 14 days), booking, walk-in, cancel/reschedule, check-in with token, no-show, OPD queue.
  - Needs one sample each of GET /practitioners and GET /appointment-slots.
- Slice 4 Consultation, Slice 5 Billing, Slice 6 Administration.


## Slice 3 Appointments - WRITTEN, NOT YET RUN
- /appointments (day list: date, doctor, status filters in the URL, 20 per page), actions: check-in (token dialog), no-show (confirm), reschedule (slot picker, same doctor), cancel (reason required).
- /appointments/queue: OPD queue with manual Refresh only (audited reads are never polled).
- /appointments/new (booking) and /appointments/walk-in (today's slots): patient picker, doctor, slot picker (max 14 days), type, reason. slot_unavailable reloads the slots.
- Hospital timezone/today via GET /organization/hospitals (src/lib/hospital.ts); falls back to the computer clock when the user may not view the hospital profile.

## Assumptions to confirm (src/features/appointments/parse.ts)
- Appointment fields: date, time or start_time or starts_at, status, appointment_type, source, reason, patient{full_name,mrn}, practitioner{id,full_name}, token (token_number etc.).
- Queue item: token_number, status, patient, practitioner (maybe under appointment).
- Slots: flat list, list of {date, slots[]}, or object keyed by date; times hospital-local.
- Practitioner: id, full_name, specializations[].
- Check-in answer carries the token number.

## Backend requests (added)
4. Reschedule has no reason field (only cancel does).
5. Walk-in may use a running slot, but /appointment-slots hides past slots: running slots cannot be listed.
6. Response schemas in openapi.json for appointments, queue, slots, practitioners.


 
## Dashboard - DESIGN ONLY (written, not yet run)
- Real: greeting, hospital name, date (hospital timezone), quick actions (by permission).
- Sample data (labelled "Sample data" on screen): KPIs, weekly chart, status bars, coming up, queue, doctor load, collection. All in src/features/dashboard/data.ts. To integrate, replace loadDashboardData() only.

## Backend requests (added)
7. Dashboard summary endpoint (counts, last 7 days, per doctor, collection by method). Text for the backend chat is in the dashboard message.


## Slice 5 Billing - WRITTEN, NOT YET RUN
- /billing (invoices of a day, status filter, 20 per page), /billing/new (patient + lines), /billing/[id] (lines, server totals, payments), /billing/services (price list, add and edit with manage permission), /billing/statement and /billing/statement/[patientId].
- Money is always a string; nothing is added up in the browser. Discount and "other item" controls are hidden without billing.discount.apply / billing.service.manage.
- Payment and reverse send Idempotency-Key: same request = same key, any change or a refused request = new key. Submit is disabled while running.
- Nothing financial is deleted: only a draft can be deleted; issued invoices are cancelled with a reason; payments are reversed with a reason.

## Assumptions to confirm (src/features/billing/parse.ts)
- Invoice: invoice_number, status, patient{id,full_name,mrn}, total|grand_total, balance|balance_due, paid_amount, lines[], payments[] (amount, method, reference, status posted|reversed, receipt_number).
- Statement: invoices[] and outstanding_total.
- Services: code, name, category, unit_price (string), tax_percent, is_active.
- Lists accept ?page= and ?date=.

## Backend requests (added)
11. Response schemas for invoices, payments, statement and services in openapi.json.
12. Users without organization.hospital.view (receptionist, accountant) cannot read the hospital currency and timezone. Please include them in /identity/me, or a read-only endpoint.
13. GET /billing/invoices: confirm what "date" filters (issue date? drafts have none) and add a way to list recent invoices without a date.


 ## Slice 6a Administration: Practitioners - WRITTEN, NOT YET RUN
- /admin (overview), /admin/practitioners (list, add), /admin/practitioners/[id] (profile edit, working hours for many weekdays at once, leave and extra hours, specializations incl. new ones, credentials with verify/reject).
- Time is typed as HH:MM (own field). Working hours and leave can be removed (config, with confirm).
- Slice 6b (not started): users, roles (read), hospital profile, branches, departments, audit trail.

## Assumptions to confirm (src/features/practitioners/parse.ts)
- Practitioner: full_name, practitioner_type, status, specializations[{id,name,is_primary}], credentials[{credential_type,registration_number,status}], primary_department, user.
- Rules: weekday (1-7), start_time, end_time, slot_minutes, valid_from, valid_until. Exceptions: exception_date, kind, start_time, end_time, reason.
- GET /practitioners accepts ?page=; GET /specializations returns all.

## Backend requests (added)
14. Response schemas for practitioners, specializations, credentials, availability rules and exceptions.