# Bulk student onboarding for the Mahindra pilot

Give the master admin a single screen to download a CSV template, fill it with student names, emails, grade levels and sections, upload it, and have every account, class and enrolment created in one pass — with passwords generated automatically and handed back as a credentials file.

## 1. The CSV

Template columns (downloadable, pre-filled with one example row):

```text
full_name,email,grade_level,section,classes
Aarav Shah,aarav.shah@misp.org,MYP 4,A,"vinod-science;vineet-math;rohit-is"
Diya Rao,diya.rao@misp.org,DP 1,A,"vinod-physics-hl;vineet-ai-sl;rohit-is"
```

- `grade_level` must be one of: MYP 1, MYP 2, MYP 3, MYP 4, MYP 5, DP 1, DP 2
- `section` is a free letter (A, B, C…) — used for MYP class grouping
- `classes` is a semicolon-separated list of class keys (below)

Class keys offered to the admin:

| Key | Teacher | Subject | Applies to |
| --- | --- | --- | --- |
| `rohit-is` | Mr Rohit Phalke | Individuals and Societies | MYP 1-5, DP 1-2 |
| `vinod-science` | Mr Vinod Chacko | Integrated Science | MYP 1-5 |
| `vinod-physics-sl` | Mr Vinod Chacko | Physics SL | DP 1-2 |
| `vinod-physics-hl` | Mr Vinod Chacko | Physics HL | DP 1-2 |
| `vineet-math` | Mr Vineet Sharma | Mathematics | MYP 1-5 |
| `vineet-ai-sl` | Mr Vineet Sharma | Math AI SL | DP 1-2 |
| `vineet-ai-hl` | Mr Vineet Sharma | Math AI HL | DP 1-2 |

Class naming rules on creation:
- MYP: one class per grade **and** section, e.g. "Integrated Science — MYP 4A"
- DP: one class per grade and level, e.g. "Physics HL — DP 1"

Classes are created only if they don't already exist, so repeat uploads add students to the same class rather than duplicating it.

## 2. Admin screen

New page `/pilot/mahindra/students`, reachable from the Pilot Console, master-admin only:

1. Download CSV template button
2. Reference table of grade levels and class keys
3. File picker with a parsed preview: every row validated before anything is created (bad grade level, unknown class key, malformed or duplicate email are flagged inline)
4. "Create accounts" button, disabled while any row has an error
5. Result table: each student, their generated password, and status — plus a "Download credentials CSV" button (shown once; passwords are not stored anywhere readable afterwards)

## 3. What gets created per student

- Auth account with the provided email, email pre-confirmed, strong random password
- Pre-approved registration request so the signup trigger assigns the `student` role deterministically (mirrors the existing teacher provisioning)
- Profile with full name, email and grade level
- School membership in Mahindra International School Pune
- Active student plan with pilot token allowance
- Enrolment into each requested class, with the class auto-created under the right teacher if missing
- Seat usage on the school updated to match

Re-uploading the same email does not create a duplicate: the existing account is reused, its class enrolments topped up, and it is reported as "already existed" with no password reset.

## 4. Claiming with the school Google account

Because each account is created with the student's real school email and is pre-verified, signing in with Google using that same address attaches the Google identity to the existing account rather than making a second one.

- A short "Claim your account" card on the student dashboard, shown until the account has a Google identity, explaining they can switch to one-click Google sign-in
- The card's button runs Google sign-in; after it succeeds the card disappears
- The login page gets a line telling pilot students they can use either their temporary password or Google with the same school email

## Technical notes

- New edge function `pilot-bulk-students`: master-admin verified server-side, service-role account creation, idempotent class lookup/creation by `(school_id, teacher_id, name)`, returns per-row results with generated passwords. Parsing happens client-side; the function receives validated JSON rows.
- A small shared config module holds the grade levels and the class-key table so the page, the template and the function stay in sync.
- No schema changes: uses existing `classes`, `class_members`, `profiles`, `user_roles`, `school_members`, `user_plans`, `school_seat_limits`.
- Google provider must be enabled on the backend for claiming; it is already used elsewhere in the app.
