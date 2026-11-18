import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.security import Principal, get_principal, require_admin


ADMIN = Principal(subject="admin-1", email="admin@example.test", roles=frozenset({"admin"}))
CANDIDATE = Principal(subject="candidate-1", email="candidate@example.test", roles=frozenset({"student"}))


class CoreWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _record):
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)

        def override_db():
            session = self.SessionLocal()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[require_admin] = lambda: ADMIN
        app.dependency_overrides[get_principal] = lambda: CANDIDATE
        self.client = TestClient(app)
        self.addCleanup(self.cleanup)

    def cleanup(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def create_assessment(self, candidate_ids=None, starts_delta=-60):
        institution_response = self.client.post("/api/v1/institutions", json={"name": "North Campus"})
        self.assertEqual(institution_response.status_code, 201, institution_response.text)
        institution_id = institution_response.json()["id"]
        candidate_ids = candidate_ids or ["candidate-1", "candidate-2"]
        members = [
            {
                "user_subject": candidate_id,
                "email": f"{candidate_id}@example.test",
                "full_name": candidate_id,
                "department": "Engineering",
                "year": "3",
                "section": "A",
            }
            for candidate_id in candidate_ids
        ]
        synced = self.client.post(
            f"/api/v1/institutions/{institution_id}/members:sync",
            json={"members": members},
        )
        self.assertEqual(synced.status_code, 200, synced.text)

        now = datetime.now(timezone.utc)
        payload = {
            "institution_id": institution_id,
            "title": "Backend Assessment",
            "description": "Workflow integration test",
            "instructions": "Complete each section.",
            "starts_at": (now + timedelta(seconds=starts_delta)).isoformat(),
            "ends_at": (now + timedelta(hours=2)).isoformat(),
            "duration_seconds": 3600,
            "passing_percentage": 50,
            "max_attempts": 1,
            "target_scope": "individual",
            "target_criteria": {"candidate_ids": candidate_ids},
            "sections": [
                {
                    "name": "Python",
                    "sequence": 1,
                    "section_type": "mcq",
                    "questions": [
                        {
                            "sequence": 1,
                            "question_type": "mcq",
                            "prompt": "Which option is correct?",
                            "marks": 5,
                            "public_data": {
                                "options": [
                                    {"id": "opt-1", "text": "Correct"},
                                    {"id": "opt-2", "text": "Incorrect"},
                                ]
                            },
                            "answer_key": {"correct_option_id": "opt-1"},
                        }
                    ],
                },
                {
                    "name": "Algorithms",
                    "sequence": 2,
                    "section_type": "coding",
                    "questions": [
                        {
                            "sequence": 1,
                            "question_type": "coding",
                            "prompt": "Return the input value.",
                            "marks": 10,
                            "public_data": {
                                "starter_code": "",
                                "sample_test_cases": [{"input": "1", "expected_output": "1"}],
                            },
                            "hidden_test_cases": [
                                {"input": "2", "expected_output": "2", "hidden": True}
                            ],
                        }
                    ],
                },
            ],
        }
        created = self.client.post("/api/v1/assessments", json=payload)
        self.assertEqual(created.status_code, 201, created.text)
        published = self.client.post(f"/api/v1/assessments/{created.json()['id']}/publish")
        self.assertEqual(published.status_code, 200, published.text)
        return created.json(), published.json()["assignments"]

    def test_institution_flow_persists_assessment_and_linked_interview_report(self):
        assessment, assignments = self.create_assessment(["candidate-1"])
        token = assignments[0]["token"]
        self.assertEqual(self.client.get(f"/api/v1/exam/{token}").status_code, 200)

        delivered = {}

        def capture_otp(email, otp, _title):
            delivered[email] = otp

        with patch("app.routers.core_exam.send_assessment_otp", side_effect=capture_otp):
            requested = self.client.post(f"/api/v1/exam/{token}/otp")
        self.assertEqual(requested.status_code, 200, requested.text)

        verified = self.client.post(
            f"/api/v1/exam/{token}/otp/verify",
            json={"otp": delivered["candidate-1@example.test"]},
        )
        self.assertEqual(verified.status_code, 200, verified.text)
        session_token = verified.json()["session_token"]
        headers = {"X-Assessment-Session": session_token}

        started = self.client.post(f"/api/v1/exam/{token}/start", headers=headers)
        self.assertEqual(started.status_code, 200, started.text)
        question_ids = {
            question["question_type"]: question["id"]
            for question in started.json()["questions"]
        }
        saved = self.client.put(
            f"/api/v1/exam/{token}/answers/{question_ids['mcq']}",
            headers=headers,
            json={"selected_option_id": "opt-1"},
        )
        self.assertEqual(saved.status_code, 200, saved.text)

        with patch(
            "app.routers.core_exam.execute_test_case",
            side_effect=lambda _source, _language, stdin: {
                "status": {"description": "Accepted"},
                "stdout": stdin,
                "stderr": None,
            },
        ):
            coding = self.client.post(
                f"/api/v1/exam/{token}/coding/{question_ids['coding']}/submit",
                headers=headers,
                json={"source_code": "print(input())", "language_id": 71},
            )
        self.assertEqual(coding.status_code, 200, coding.text)
        self.assertTrue(all(result["actual"] is None for result in coding.json()["results"]))

        submitted = self.client.post(f"/api/v1/exam/{token}/submit", headers=headers)
        self.assertEqual(submitted.status_code, 200, submitted.text)
        self.assertTrue(submitted.json()["interview_eligible"])

        with patch(
            "app.routers.core_interview.generate_concept_questions",
            side_effect=lambda role, skill, concept: {
                "questions": [{"question": f"Explain {skill} in {role}?"}]
            },
        ):
            interview = self.client.post(
                f"/api/v1/assessments/{assessment['id']}/attempts/"
                f"{verified.json()['attempt_id']}/interview/start",
                headers=headers,
            )
        self.assertEqual(interview.status_code, 201, interview.text)
        interview_id = interview.json()["id"]

        with patch(
            "app.routers.core_interview.evaluate_answer",
            return_value={"marks_awarded": 8, "feedback": "Clear answer", "strengths": ["clarity"]},
        ):
            for question in interview.json()["questions"]:
                response = self.client.put(
                    f"/api/v1/assessment-interviews/{interview_id}/questions/{question['id']}/response",
                    headers=headers,
                    json={"response": "A detailed candidate response."},
                )
                self.assertEqual(response.status_code, 200, response.text)

        complete = self.client.post(
            f"/api/v1/assessment-interviews/{interview_id}/complete",
            headers=headers,
        )
        self.assertEqual(complete.status_code, 200, complete.text)
        report = self.client.get(f"/api/v1/exam/{token}/report", headers=headers)
        self.assertEqual(report.status_code, 200, report.text)
        self.assertEqual(report.json()["assessment_id"], assessment["id"])
        self.assertEqual(report.json()["candidate_id"], "candidate-1")
        self.assertEqual(report.json()["interview_id"], interview_id)
        self.assertEqual(report.json()["interview_average_score"], 8)

    def test_otp_retry_limit_and_schedule_are_enforced(self):
        _, assignments = self.create_assessment(["candidate-1"])
        token = assignments[0]["token"]
        delivered = {}
        with patch(
            "app.routers.core_exam.send_assessment_otp",
            side_effect=lambda email, otp, _title: delivered.update({email: otp}),
        ):
            self.assertEqual(self.client.post(f"/api/v1/exam/{token}/otp").status_code, 200)
        for expected_status in (400, 400, 429):
            response = self.client.post(
                f"/api/v1/exam/{token}/otp/verify",
                json={"otp": "000000" if delivered.get("candidate-1@example.test") != "000000" else "000001"},
            )
            self.assertEqual(response.status_code, expected_status, response.text)

        _, future_assignments = self.create_assessment(["candidate-1"], starts_delta=3600)
        future = self.client.post(f"/api/v1/exam/{future_assignments[0]['token']}/otp")
        self.assertEqual(future.status_code, 403, future.text)

    def test_individual_career_report_subscription_and_learning_progress(self):
        confirmed = self.client.put(
            "/api/v1/career/profile/confirm",
            json={
                "resume_profile": {"full_name": "Candidate"},
                "skills": [
                    {"name": "Python", "category": "programming", "level": "intermediate"},
                    {"name": "SQL", "category": "database", "level": "beginner"},
                ],
            },
        )
        self.assertEqual(confirmed.status_code, 200, confirmed.text)

        with patch(
            "app.routers.core_career.discover_roles_from_resume",
            return_value=[{"role": "Backend Developer"}],
        ):
            roles = self.client.post(
                "/api/v1/career/roles/recommend",
                json={"resume_text": "Candidate has experience with Python and SQL."},
            )
        self.assertEqual(roles.status_code, 200, roles.text)

        requirement_data = {
            "role_required_skills": ["Python", "SQL"],
            "common_skills": ["Python"],
            "missing_role_skills": ["SQL"],
            "skill_areas": [
                {"skill": "Python", "resume_supported": True, "concepts": ["Async IO"]},
                {"skill": "SQL", "resume_supported": False, "concepts": ["Joins"]},
            ],
        }
        with patch(
            "app.routers.core_career.generate_role_requirements",
            return_value=requirement_data,
        ):
            goal = self.client.put(
                "/api/v1/career/goal",
                json={
                    "role": "Backend Developer",
                    "resume_text": "Candidate has experience with Python and SQL.",
                },
            )
        self.assertEqual(goal.status_code, 200, goal.text)

        with patch(
            "app.routers.core_career.generate_concept_questions",
            side_effect=lambda role, skill, concept: {
                "questions": [{"question": f"Explain {skill} for {role}?"}]
            },
        ):
            interview = self.client.post(
                "/api/v1/career/interviews",
                json={"role_analysis_id": goal.json()["id"]},
            )
        self.assertEqual(interview.status_code, 201, interview.text)
        interview_id = interview.json()["id"]
        with patch(
            "app.routers.core_career.evaluate_answer",
            side_effect=lambda role, skill, concept, difficulty, question, answer: {
                "marks_awarded": 8 if skill == "Python" else 4,
                "feedback": f"Feedback for {skill}",
                "strengths": ["specific example"],
                "improvements": [f"Practice {skill}"],
            },
        ):
            for question in interview.json()["questions"]:
                response = self.client.put(
                    f"/api/v1/career/interviews/{interview_id}/questions/{question['id']}/response",
                    json={"response": "A detailed candidate response."},
                )
                self.assertEqual(response.status_code, 200, response.text)
        completed = self.client.post(f"/api/v1/career/interviews/{interview_id}/complete")
        self.assertEqual(completed.status_code, 200, completed.text)
        self.assertEqual(completed.json()["skill_evaluations"]["Python"]["score"], 8)
        self.assertEqual(completed.json()["skill_evaluations"]["SQL"]["score"], 4)
        self.assertEqual(
            self.client.get(f"/api/v1/career/interviews/{interview_id}/report").status_code,
            200,
        )

        plan_body = {"role_analysis_id": goal.json()["id"], "weeks": 4}
        denied = self.client.post("/api/v1/learning-plans", json=plan_body)
        self.assertEqual(denied.status_code, 403, denied.text)

        grant = self.client.post(
            "/api/v1/subscriptions",
            json={
                "candidate_subject": CANDIDATE.subject,
                "starts_at": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),
                "ends_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "external_reference": "test-subscription",
            },
        )
        self.assertEqual(grant.status_code, 201, grant.text)
        plan = self.client.post("/api/v1/learning-plans", json=plan_body)
        self.assertEqual(plan.status_code, 201, plan.text)
        self.assertEqual({item["skill"] for item in plan.json()["items"]}, {"SQL"})
        item = plan.json()["items"][0]
        progress = self.client.patch(
            f"/api/v1/learning-plans/{plan.json()['id']}/items/{item['id']}/progress",
            json={"status": "completed", "notes": "Completed practice"},
        )
        self.assertEqual(progress.status_code, 200, progress.text)
        self.assertEqual(progress.json()["status"], "completed")

    def test_protected_api_fails_closed_when_legacy_verifier_is_missing(self):
        app.dependency_overrides.pop(get_principal, None)
        app.dependency_overrides.pop(require_admin, None)
        for name in (
            "CORE_LEGACY_JWT_ALGORITHM",
            "CORE_LEGACY_JWT_VERIFYING_KEY",
            "CORE_LEGACY_JWT_ISSUER",
            "CORE_LEGACY_JWT_AUDIENCE",
            "CORE_LEGACY_JWT_SUBJECT_CLAIM",
            "CORE_LEGACY_JWT_ROLE_CLAIM",
            "CORE_LEGACY_JWT_EMAIL_CLAIM",
        ):
            os.environ.pop(name, None)
        response = self.client.get("/api/v1/career/profile", headers={"Authorization": "Bearer legacy-token"})
        self.assertEqual(response.status_code, 503, response.text)


if __name__ == "__main__":
    unittest.main()
