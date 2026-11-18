# Project Flow Document vs UI

`FlowStepper` (src/components/common/FlowStepper.tsx) shows the PDF's steps 5.1 / 5.2 on these screens.
"Tested" = verified in a running app. Nothing below has been run in a browser yet; `tsc` and syntax checks only.

## Institution journey (5.1)
| # | PDF step | Screen / route | Stepper | Status |
|---|---|---|---|---|
| 1 | Admin login | /admin/login | - | UI exists |
| 2 | Create & schedule | /admin/assessment (AssessmentCreate) | shown (1-4) | UI exists; **no fields for attempt rules, qualification criteria, interview-eligibility rule, auto-submit** (PDF 2.1, 2.7) |
| 3 | Select candidates | same form, targeting + preview | shown | UI exists |
| 4 | Publish & notify | same form, "Assessment created" panel | shown | Links shown; **no publish email/in-app notification is sent** (backend only emails OTPs) |
| 5 | Link & OTP | /exam/:token | shown (5-9) | UI + backend exist |
| 6 | MCQ & coding | /exam/:token (in progress) | shown, compact | UI exists; mark-for-review in palette |
| 7 | Evaluate & qualify | /exam/:token (completed) | shown | UI exists |
| 8 | Interview | same page, AssessmentInterviewPanel | shown | UI exists (core mode only) |
| 9 | Results | same page; admin dashboard | shown | Candidate report exists; **no admin screen for student-wise / section-wise core results** |

## Individual journey (5.2)
| # | PDF step | Screen / route | Status |
|---|---|---|---|
| 1-2 | Upload, extract & confirm | /upload-resume, /resume | UI exists, stepper shown |
| 3-4 | Roles, goal | same page | UI exists, stepper shown |
| 5 | Skill gaps | same page (requirements) then /career-assessment/:id | UI exists |
| 6-7 | Skill interview, report | /career-assessment/:id | UI exists (core mode) |
| 8 | Subscription plan | same page, server-checked | UI exists; **no plan-purchase screen** (no payment gateway configured) |
| 9 | Practice & reassess | same page, task checkboxes + "Practice and reassess" | UI exists |
