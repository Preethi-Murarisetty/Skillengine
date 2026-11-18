# End-to-End Flow Gap Report

## Phase 1: Audit

Audit scope: the active Vite application under `src/` and the FastAPI role-interview service under `roleinterview/app/`. The Node assessment API configured at `VITE_BACKEND_URL` is not present in this workspace, so server behavior for its routes cannot be verified or changed here. The nested `roleinterview/frontend/` is separate from the Vite app's active routes.

### Module 1: Institution Assessment

| Step | Status (Done / Partial / Missing / Wrong) | Where in code (file/class/API) | What is missing or incorrect |
|---|---|---|---|
| 1. Admin creates exam: fields, sections, rules, qualifications, auto-submit | Partial | `src/admin/components/assessment/AssessmentCreate.jsx`; `createAssessment` in `src/admin/services/api.js`; `POST /api/assessment` | Form supports title, description, schedule, duration, instructions, MCQ/coding sections, marks, and passing percentage. Attempt rules, qualification/interview eligibility policy, and auto-submit policy are not represented in the form or payload. Server persistence is external and unverified. |
| 2. Target institution/cohorts/individuals; resolve and preview eligible list | Partial | `AssessmentCreate` targeting and `studentFilters`, `selectedUsers`, `matchesStudentFilters` | Student list and confirmation preview exist. Payload now retains legacy singular fields and adds plural fields for all selected values. Server-side eligible-list resolution cannot be verified. |
| 3. Publish assignment and notify students | Partial | `AssessmentCreate.handleSubmit`; `saveLocalAssignedAssessment`; `CANDIDATE_EXAM_BASE_URL` | Create request sends candidates and cohort criteria; a share link is displayed. Dashboard discovery relies on browser `localStorage`, so it is not shared across student devices. No notification send is visible in this frontend; API notification behavior is unverified. Candidate origin is hardcoded. |
| 4. Student opens link; validate assignment/window/attempt; OTP | Partial | `src/assessment/AssessmentLinkGate.jsx`; `src/assessment/api/assessmentApi.ts` (`generateKey`, `verifyKey`); `AssessmentRoutes` | UI calls generate/verify-key and shows verification errors. The backing Node API is absent, so identity/assignment/schedule/attempt validation and OTP expiry/single-use/retry enforcement are unverified. Link routes force login even though `AssessmentRoutes` documents token-only access; intended access policy needs confirmation. |
| 5. MCQ interaction, autosave, server timer, timeout submit | Partial | `src/assessment/pages/AssessmentPage.tsx`; `src/assessment/hooks/useAssessment.ts`; `src/assessment/utils/storage.ts`; `/start`, answer/save, `/end` APIs | Navigation, review state, local recovery, server-derived end time, and timeout submission are wired in the client. Backend persistence and recovery after offline changes are unverified; local browser storage alone does not survive device/browser loss. |
| 6. Coding, sample execution, hidden evaluation, sandbox, stored outcome | Partial | `src/assessment/components/assessment/CodingQuestion.tsx`, `CodeEditor.tsx`; `src/assessment/hooks/useCoding.ts`; `src/assessment/services/judge0Service.ts` | Editor, language selection, run/submit, and evaluation calls exist. Hidden-test isolation, time/memory limits, storage, and score correctness depend on external APIs and cannot be verified here. |
| 7. Manual/auto submission, evaluation, completion, interview eligibility | Partial | `useAssessment.submit`; `endAssessment` and `evaluateQuiz` in `src/assessment/api/assessmentApi.ts`; `AssessmentCompleted.tsx` | Client coordinates save/evaluation/end and renders completion. Qualification policy and the configured all-candidates-vs-qualified interview rule are not represented in this frontend; server-side completion semantics are external. |
| 8. Eligible interview preparation, questions, responses, evaluation | Partial | `src/assessment/pages/AssessmentCompleted.tsx`; `src/assessment/api/topicInterviewApi.js`; `src/assessment/AssessmentInterview.jsx`; role-interview API | An interview UI/API exists, but no verified handoff from server-calculated institutional eligibility to this interview flow is present. Durable question/response/criteria storage is unverified. |
| 9. Combined results and skill analysis | Partial | `src/assessment/pages/AssessmentCompleted.tsx`; `src/components/Interview/InterviewReport.jsx`; `src/utils/userProgress.js` | Assessment and interview reports render separate data. A persisted combined institutional result with section-level coding/MCQ and skill analysis is not verified; role-based access enforcement for report APIs is external. |
| 10. Admin dashboard and reports | Partial | `src/admin/components/dashboard/AdminDashboard.jsx`; analytics components under `src/admin/components/analytics/` | Dashboard and analytics UI exist. Coverage of scheduled/eligible/started/completed/pending assessment states and student reports depends on external APIs and could not be confirmed from this repository. |

### Module 2: Individual Career Assessment

| Step | Status (Done / Partial / Missing / Wrong) | Where in code (file/class/API) | What is missing or incorrect |
|---|---|---|---|
| 1. Register/login and upload PDF/DOCX resume | Partial | `src/components/Auth/Register.jsx`, `Login.jsx`; `src/components/Interview/ResumeUpload.jsx`; `/resume/analyze` | Registration/login and upload exist. The `/upload-resume` branch validates PDF/DOC/DOCX and a 5 MB limit; validation is not consistently applied in the `/resume` branch. |
| 2. Parse and categorize resume data | Partial | `ResumeUpload`; `src/utils/skills.js`; `analyzeResumeWithBackend` in `src/services/resumeRoleApi.js`; `POST /resume/analyze` | Structured resume/skill extraction is wired and skills are normalized. Complete extraction and category coverage (languages, frameworks, databases, tools, projects, education, certifications, experience) depend on backend output and are not consistently surfaced. |
| 3. Candidate reviews/corrects extracted data before next steps | Done | `src/components/Interview/ResumeUpload.jsx`; `src/components/Interview/VoiceIntroduction.jsx` | Added editable parsed-profile JSON review in both resume entry modes. Role discovery now starts only after confirmation, and the introduction route requires the confirmation marker. |
| 4. Recommend from maintained role-skill mapping with score/missing skills | Partial | `POST /roles/discover`, `POST /roles/requirements`; `roleinterview/app/services/role_discovery.py`, `role_requirements.py` | Role discovery and requirement APIs exist, but this workspace does not establish a maintained `role_skill_mapping` entity as the required source of truth. Recommendation suitability/missing-skill data is API-dependent. |
| 5. Select a recommendation or custom role | Partial | `src/components/Interview/ResumeUpload.jsx`; `src/components/Interview/VoiceIntroduction.jsx`; `src/components/Interview/InterviewQuestions.jsx` | Connected the ATS branch's selected role and parsed resume data to the existing `/intro` interview route. The recommendation source-of-truth and custom-role behavior remain unverified. |
| 6. Skill-gap analysis and priorities | Partial | `role_requirements.py`; `src/components/Interview/InterviewQuestions.jsx` | Role requirements and resume-vs-role analysis are requested, but a complete persisted gap/priority handoff into the interview/report is not verified. |
| 7. Skill-wise interview, evaluation, adaptive config off by default | Partial | `src/components/Interview/InterviewQuestions.jsx`; `roleinterview/app/main.py` (`/interview/concept-questions`, `/interview/evaluate`) | Interview/question/evaluation calls exist. Fixed the concept-questions handler to forward `request.concept` independently from `request.skill`. Adaptive-difficulty flag/default and durable per-skill evaluation are not verified. |
| 8. Report with resume, role, goals, scores, gaps, recommendations | Partial | `src/components/Interview/InterviewReport.jsx`; `src/hooks/useInterview.js` | Report UI consumes session/history data, but the complete required report is not shown to be durably assembled from the entire journey; role/skill context can depend on browser storage. |
| 9. Weekly learning plan for subscribed users, backend subscription check | Missing | `src/components/Courses/CourseLanding.jsx`; `src/components/Dashboard/Welcome.jsx` | Course landing content is static. Dashboard checks subscription fields only to display course progress; there is no weekly plan generation/route and no backend authorization check for a plan. |
| 10. Assess, learn, practice, reassess, track improvement | Partial | `Welcome.jsx`; `src/components/Dashboard/Performance.jsx`; practice/course/interview routes | Assessment, practice, course, and history surfaces exist, but no connected gap-based weekly plan/progress cycle is present. |

### Non-Functional Requirements

| Requirement | Status (Done / Partial / Missing / Wrong) | Where in code (file/class/API) | What is missing or incorrect |
|---|---|---|---|
| Backend-enforced schedule, eligibility, attempts, subscription | Partial | Assessment requests in `src/assessment/api/assessmentApi.ts`; `roleinterview/app/` | Client calls the expected assessment operations, but the controlling Node API is external. Individual subscription-gated plan enforcement is absent. |
| OTP expires in 5 minutes, single-use, maximum 3 retries | Partial | `generateKey`/`verifyKey` frontend calls | UI supports OTP entry; all stated limits must be implemented and verified in the external assessment API. |
| Retake, concurrent session, session expiry, auto-submit rules | Partial | Assessment client state/timer; `AssessmentCreate` | Countdown and timeout submission are wired. Rules are not configurable/verified end to end; concurrent and retake enforcement is external. |
| Autosave survives connectivity loss | Partial | `src/assessment/utils/storage.ts`; assessment answer APIs | Browser-local recovery exists. Offline queue/replay and cross-device durability are not established. |
| Isolated code execution with resource limits | Partial | Judge0 integration in `src/assessment/services/judge0Service.ts`; coding APIs | Remote code execution is integrated, but sandbox isolation and configured time/memory limits are outside the verified source. |
| Persist interview questions, responses, criteria, skill feedback | Partial | `/interview/concept-questions`, `/interview/evaluate`; `src/hooks/useInterview.js`; interview history service | Generate/evaluate and history paths exist, but durable persistence for each required artifact is not established by the visible FastAPI service. |
| ADMIN/STUDENT/INDIVIDUAL access control on reports/records | Partial | `src/App.jsx` protected routes; `src/admin/auth/AdminRoute.jsx`; external APIs | UI route guards exist. Server-side authorization and ownership checks cannot be verified; some report state is browser-local/session storage. |
| No hardcoded secrets/configuration | Partial | `vite.config.js`; `AssessmentCreate.jsx`; API config files | No secret value was confirmed in the inspected paths, but fallback service IPs and the candidate exam origin are hardcoded. Deployments should use environment configuration. |

### Prioritized Fix List

| Priority | Gap | Scope |
|---|---|---|
| P1 | Student assignment discovery reads admin-browser `localStorage`; assignments are not delivered to student devices through a shared source. | Frontend currently has no confirmed assignment-list API contract; add server endpoint support before replacing the local fallback. |
| P1 | Resume extraction is consumed without candidate confirmation/correction. | Add a review-and-confirm gate before role discovery/interview uses the profile. |
| P1 | Role question generation ignores the submitted concept and uses the skill as the concept. | Fix the local FastAPI handler and test the request-to-service mapping. |
| P1 | Role API starts on the first available port from 8000+, while Vite's default proxy points to 8002. | Default proxy now targets port 8000, matching the launcher's first choice; `/resume-api/health` returned healthy through Vite. Set `ROLEINTERVIEW_PORT` in both environments when using an alternate port. |
| P1 | Required exam security enforcement and interview eligibility depend on a Node API absent from this workspace. | Verify/update that service when its source or contract is available; client-only checks are not a security substitute. |
| P2 | Cohort selections allow multiple values but only the first value of each filter is submitted. | Preserve combined targeting in the request while keeping existing API fields compatible. |
| P2 | No backend-verified subscription gate or weekly learning-plan workflow. | Requires plan and subscription API/service support, not present here. |
| P2 | `/upload-resume` career branch ends at role requirements instead of continuing to assessment. | Connect only if this route is intended as the canonical career flow; avoid changing existing ATS behavior without confirmation. |
| P2 | Assessment/interview result and skill feedback are not verified as one persisted report. | Requires server result contract/storage verification. |
| P3 | Candidate exam origin and local service URLs have hardcoded defaults. | Move deployment-specific values to documented environment settings. |
| P3 | No automated frontend tests exist; current Python checks are ad-hoc scripts. | Add focused automated coverage for behavior owned by this repository. |

### Needs My Decision

- Assessment routes currently force authentication in `AssessmentLinkGate`, while `AssessmentRoutes` says the token is the credential and no login is needed. Should candidate access require login plus OTP, or should the invite token and OTP identify the participant without login? Keep the current login gate until confirmed to avoid weakening access control.
- The institution assessment lifecycle/security API is configured as an external Node service and its implementation is not present in this workspace. Its endpoint contract/source is needed to implement or integration-test the required server-side schedule, eligibility, OTP, attempt, auto-submit, coding sandbox, interview eligibility, notifications, and RBAC guarantees.

## Phase 2: Fix

Phase 1 audit completed before source-code changes. Fixes are being applied in priority order; external API-owned gaps remain blocked on the service contract/source.

| Fix | Priority | Status | Change |
|---|---|---|---|
| Forward requested concept to question generation | P1 | Tested | `/interview/concept-questions` now passes and returns `request.concept` rather than substituting the skill; regression test added and passed. |
| Connect ATS role requirements to the existing interview route | P2 | Done | Build/store normalized resume data and pass it with the selected role from `/upload-resume` to `/intro`. |
| Align role API launcher and Vite proxy port | P1 | Done | Vite/API fallback now defaults to 8000, matching the launcher's first available port; Vite proxy health check passed. Use the same `ROLEINTERVIEW_PORT` override when selecting an alternate port. |
| Require resume review before role matching/interview | P1 | Done | Both resume flows now defer role discovery until the candidate confirms the editable parsed profile; interview introduction rejects unconfirmed profile state. |
| Clear stale resume confirmation and preserve multi-value cohort targeting | P2 | Done | New resume selections/analysis clear the confirmation marker; assessment requests retain singular compatibility fields and include plural filter values. |

## Phase 3: Connect and Verify

### Journey A: Institution Assessment

| Step | Controller/API and service | UI screen | Connection result |
|---|---|---|---|
| Create and target | `AssessmentCreate.handleSubmit` -> `createAssessment` -> `POST /api/assessment` (external Node API) | `src/admin/components/assessment/AssessmentCreate.jsx` | Form data and candidate IDs reach the API. Cohort filters now include all selected values as plural fields while preserving prior singular fields. Admin-local assignment snapshot is still not a cross-user delivery mechanism. |
| Candidate entry and OTP | `generateKey` -> `POST /api/assessment/{token}/generate-key`; `verifyKey` -> `POST /api/assessment/{token}/verify-key` | `AssessmentLinkGate`, `AssessmentRoutes`, `AssessmentVerification` | Link reaches the verification screen after the current login gate. OTP generation/verification outcomes are consumed by UI. Assignment/schedule/attempt/rate-limit enforcement cannot be traced beyond this API boundary. |
| Start and answer | `startAssessment` -> `POST /api/assessment/{token}/start`; answer/code persistence APIs; local `saveSession` | `AssessmentInstructionsPage`, `AssessmentPage`, question components | Start response supplies attempt/timer/questions to the state machine; answer/code state is locally recoverable and persistence calls are made. Backend connectivity recovery and enforcement remain unverified. |
| Submit and results | `evaluateQuiz`, coding save/evaluation, `endAssessment` -> `POST /api/assessment/{token}/end`; results API | `useAssessment.submit`, `AssessmentCompleted` | Client flushes code, evaluates MCQ, finalizes attempt, then displays returned results. Interview-eligibility decision and durable combined reporting are not connected in verified local source. |
| Admin tracking | `getAssessments` and analytics APIs | `AdminDashboard`, analytics screens | Dashboard/analytics UI is present, but complete lifecycle data availability depends on the external service and remains unverified. |

### Journey B: Individual Career Assessment

| Step | Controller/API and service | UI screen | Connection result |
|---|---|---|---|
| Registration and upload | auth APIs; `interviewAPI.analyzeResume` or `analyzeResumeWithBackend` -> `POST /resume/analyze` | Register/Login, `/resume`, `/upload-resume` | Both resume upload branches parse data; ATS branch validates file extension/size. |
| Review and confirm | local parsed profile normalization; `resumeProfileConfirmed` session marker | `/resume` and `/upload-resume` in `ResumeUpload` | Newly added editable JSON review is the gate. Confirmed profile is saved before role discovery; unconfirmed introduction redirects to `/resume`. |
| Role discovery and selection | `discoverRolesFromResume` -> `POST /roles/discover`; `getRoleRequirements` -> `POST /roles/requirements` | ATS role list and requirements panel | Roles are sourced from the service. Selecting a role stores requirements in `roleInterviewContext`. ATS now builds the expected resume profile and carries selected role into `/intro`. Maintained mapping-table semantics remain unverified. |
| Interview questions and evaluation | `discoverTopicsForRoleSkill`, `generateRoleInterviewQuestions`, `evaluateRoleInterviewAnswer`; FastAPI `/interview/discover-topics`, `/interview/concept-questions`, `/interview/evaluate` | `/intro`, `/interview/questions` | Role context and resume can reach the interview. Fixed concept forwarding so selected concept reaches generator. Durable criteria/response storage and adaptive config remain unverified. |
| Report, learning plan, reassessment | interview history/report and progress services; course UI | `InterviewReport`, dashboard, courses/performance | Report/history and practice surfaces are present, but a complete persisted career report and backend-authorized weekly plan are disconnected/missing. |

### Remaining Disconnected or Unverified Handoffs

- Admin assignment snapshot -> student dashboard is disconnected across browsers because it uses `localStorage`; no confirmed student assignment-list API contract is available in this repository.
- External assessment API -> server-calculated interview eligibility -> institutional interview UI is not established by the visible client/service contract.
- Interview results -> weekly plan -> progress/reassessment is not implemented; no subscription-checked plan API is present.
- OTP policy, eligibility, schedule, attempts, coding sandbox, and report RBAC cannot be verified without the external assessment service implementation.

The focused frontend production build passed after the connected-flow edits; build emitted existing CSS nesting and large-chunk warnings.

## Phase 4: Tests

| Requirement | Test coverage/status | Notes |
|---|---|---|
| Schedule enforcement | Blocked | Enforcement belongs to the external Node assessment API, whose source is not in this workspace. |
| Eligibility | Blocked | Assessment API implementation is unavailable; frontend tests cannot establish backend authorization. |
| OTP expiry, single-use, retry limit | Blocked | Only client calls exist locally; expiry and attempt policy must be tested in the external service. |
| Auto-submit | Partial | Assessment UI timer triggers `useAssessment.submit`; backend timeout/finalization behavior cannot be tested locally. |
| Interview eligibility | Blocked | No verified server eligibility response/handoff is available in this repository. |
| Resume confirmation | Implemented; build-validated | Confirmation gate is in both upload screens; no DOM test framework is installed. |
| Subscription check | Blocked | Weekly plan/subscription endpoint is absent; the existing dashboard subscription display is not authorization. |
| Role concept forwarding | Added | `roleinterview/tests/test_interview_concept_endpoint.py` mocks the question generator and checks independent skill/concept propagation. |

Executed checks:

- `npm run build` passed (`tsc --noEmit` and Vite production build); existing CSS nesting and chunk-size warnings remain. Build output rewrote tracked `dist/` hashed assets.
- Updated `roleinterview/run_backend.ps1` passed a PowerShell parser check.
- `roleinterview/app/main.py` passed Pylance syntax validation.
- `roleinterview/tests/test_interview_concept_endpoint.py`: `python -m unittest discover -s tests -v` passed (1 test).
- Pylance diagnostics found no errors in the changed JSX files; the new test file passed syntax validation.

### Files Changed

- `docs/gap-report.md`
- `roleinterview/app/main.py`
- `roleinterview/run_backend.ps1`
- `roleinterview/tests/test_interview_concept_endpoint.py`
- `src/admin/components/assessment/AssessmentCreate.jsx`
- `src/components/Interview/ResumeUpload.jsx`
- `src/components/Interview/VoiceIntroduction.jsx`
- `src/services/resumeRoleApi.js`
- `vite.config.js`
- `dist/index.html`
- Generated bundle replacements under `dist/assets/`: deleted `AssessmentRoutes-59914a82.js`, `cssMode-a00f20cf.js`, `freemarker2-3cb12c68.js`, `handlebars-27c40209.js`, `html-1355bc5a.js`, `htmlMode-f182381a.js`, `index-4c80a5fc.js`, `index-b26ea960.js`, `javascript-7e1c5181.js`, `jsonMode-866e8c4c.js`, `liquid-68884736.js`, `lspLanguageFeatures-011135bb.js`, `mdx-ca394d44.js`, `python-1242ca85.js`, `razor-228136bd.js`, `tsMode-64513a04.js`, `typescript-8c333965.js`, `workers-f87b84ab.js`, `xml-e13fec2f.js`, `yaml-e01cce33.js`; added `AssessmentRoutes-b37a77c4.js`, `cssMode-3ab833d7.js`, `freemarker2-e73e4eff.js`, `handlebars-b1eed992.js`, `html-a6a9c71e.js`, `htmlMode-fa391727.js`, `index-60e71b86.js`, `index-b699e21f.js`, `javascript-38d23472.js`, `jsonMode-a742eaef.js`, `liquid-3123f0ca.js`, `lspLanguageFeatures-7001a221.js`, `mdx-f33bf680.js`, `python-24556bf3.js`, `razor-74157364.js`, `tsMode-a41d6fd3.js`, `typescript-55718342.js`, `workers-d9d0f81c.js`, `xml-9cb0c315.js`, `yaml-8bf155fb.js`.

### Remaining Gaps

- Server-side exam schedule, eligibility, attempt/retake/concurrency rules, OTP expiry/single-use/retry limit, hidden-test sandbox limits, interview eligibility, and report RBAC remain unverified and unimplemented in this checkout because the configured Node assessment API source is absent.
- Student assignment delivery still relies on admin-browser local storage; a student-facing API endpoint/contract is needed for cross-device assignment discovery and notifications.
- Weekly learning plan generation and backend subscription authorization are absent. Existing dashboard subscription data is display-only and must not be treated as an access-control check.
- Interview-question/response persistence, complete combined reports, maintained role-skill mapping guarantees, and adaptive-difficulty defaults need backend confirmation.
- The assessment login-vs-token access policy remains under **Needs My Decision**; the current login gate was preserved.
- A browser-level UI test framework and assessment API integration environment are not configured, so the resume confirmation gate is build-validated but not DOM-tested, and external assessment behaviors have no runnable tests here.

## Additive Persistent Workflow Update

The missing local persistence/API boundary was addressed with an opt-in FastAPI
core workflow service. This does not replace the external Node API or legacy
authentication. New tables are namespaced `core_`; protected APIs fail closed
until the actual legacy JWT verification contract is configured.

### Implemented and locally verified

- Institution assessment persistence, candidate roster synchronization, publish
  links, server-side eligibility/schedule validation, OTP limits, timer-bound
  submission, MCQ/coding evaluation persistence, interview eligibility, separate
  assessment-interview records, and final report generation.
- Individual career profile confirmation, role recommendation/goal/skill gaps,
  skill-wise interview and stored evaluations, actual-data report generation,
  server-side subscription checks, personalized learning plan, and progress
  updates.
- Optional frontend core mode connects admin assessment creation/publication,
  candidate exam and assessment interview flows, and the `/upload-resume`
  career-assessment route. Assessment interviews no longer redirect into the
  Practice Interviews route.
- `npm run typecheck`, `npm run build`, and
  `python -m unittest discover -s tests -p test_core_workflows.py -v` passed.

### Still blocked / not end-to-end verified

- Production JWT verification claims/key/issuer/audience and account-subject
  mapping, database provisioning/export, SMTP delivery, Judge0, and Ollama were
  not supplied or exercised. Core mode must remain disabled until these are
  configured and confirmed.
- Browser journeys and the legacy Node API were not integration-tested. Existing
  Node admin dashboards/analytics and assignment discovery were not migrated.
- Admins must enter actual question JSON in core mode; the existing question-bank
  APIs do not expose a verified coding-question/hidden-test contract usable by
  this new service.
- The new PostgreSQL migration was not run against production data. See
  [docs/core-workflows.md](./core-workflows.md) for deployment prerequisites,
  environment values, and commands.