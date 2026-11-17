from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import (
    Assessment,
    AssessmentAssignment,
    AssessmentAttempt,
    AssessmentInterview,
    AssessmentInterviewQuestion,
    AssessmentQuestion,
    AssessmentReport,
    AssessmentSection,
    CodingSubmission,
    McqAnswer,
    OtpChallenge,
    utcnow,
)
from app.schemas.core import CodingSubmissionInput, InterviewResponseInput, McqAnswerInput, OtpVerify
from app.services.code_runner import execute_test_case
from app.services.notification import send_assessment_otp


router = APIRouter(tags=["core-exam"])
OTP_SECONDS = 300
OTP_MAX_ATTEMPTS = 3
OTP_SEND_MAX = 3
OTP_SEND_WINDOW = timedelta(minutes=15)
OTP_SEND_COOLDOWN = timedelta(seconds=60)


def _digest(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _assignment_for_token(db: Session, token: str) -> tuple[AssessmentAssignment, Assessment]:
    token_hash = _digest(token)
    assignment = db.scalar(
        select(AssessmentAssignment)
        .options(selectinload(AssessmentAssignment.assessment))
        .where(AssessmentAssignment.invite_token_hash == token_hash)
        .with_for_update()
    )
    if not assignment or assignment.status != "published":
        raise HTTPException(status_code=404, detail="This assessment link is invalid or inactive.")
    return assignment, assignment.assessment


def _check_schedule(assessment: Assessment) -> None:
    now = datetime.now(timezone.utc)
    if assessment.status != "published":
        raise HTTPException(status_code=403, detail="This assessment is not published.")
    if now < _aware(assessment.starts_at):
        raise HTTPException(status_code=403, detail="This assessment has not started yet.")
    if now >= _aware(assessment.ends_at):
        raise HTTPException(status_code=403, detail="The assessment window has closed.")


def _attempt_for_session(
    db: Session,
    session_token: str,
) -> AssessmentAttempt:
    if not session_token:
        raise HTTPException(status_code=401, detail="A verified assessment session is required.")
    attempt = db.scalar(
        select(AssessmentAttempt)
        .options(
            selectinload(AssessmentAttempt.assignment)
            .selectinload(AssessmentAssignment.assessment)
            .selectinload(Assessment.sections)
            .selectinload(AssessmentSection.questions),
            selectinload(AssessmentAttempt.answers),
            selectinload(AssessmentAttempt.coding_submissions),
        )
        .where(AssessmentAttempt.session_token_hash == _digest(session_token))
        .with_for_update()
    )
    if not attempt:
        raise HTTPException(status_code=401, detail="The assessment session is invalid.")
    return attempt


def _question_for_attempt(
    attempt: AssessmentAttempt,
    question_id: str,
) -> AssessmentQuestion:
    for section in attempt.assignment.assessment.sections:
        for question in section.questions:
            if question.id == question_id:
                return question
    raise HTTPException(status_code=404, detail="Question not found for this assessment.")


def _question_data(section: AssessmentSection, question: AssessmentQuestion) -> dict:
    data = {
        "id": question.id,
        "section_id": section.id,
        "question_type": question.question_type,
        "question_text": question.prompt,
        "marks": question.marks,
        "section": {
            "id": section.id,
            "name": section.name,
            "sequence": section.sequence,
            "type": section.section_type,
        },
    }
    if question.question_type == "mcq":
        data["options"] = question.public_data.get("options", [])
    else:
        data.update({
            key: value
            for key, value in question.public_data.items()
            if key not in {"answer_key", "hidden_test_cases", "test_cases"}
        })
        data["test_cases"] = [
            item for item in question.public_data.get("sample_test_cases", [])
            if isinstance(item, dict) and not item.get("hidden", False)
        ]
    return data


def _assessment_data(assessment: Assessment) -> dict:
    return {
        "id": assessment.id,
        "title": assessment.title,
        "description": assessment.description,
        "instructions": assessment.instructions,
        "starts_at": _aware(assessment.starts_at).isoformat(),
        "ends_at": _aware(assessment.ends_at).isoformat(),
        "duration_seconds": assessment.duration_seconds,
        "passing_percentage": assessment.passing_percentage,
        "sections": [
            {
                "id": section.id,
                "name": section.name,
                "description": section.description,
                "sequence": section.sequence,
                "section_type": section.section_type,
                "duration_seconds": section.duration_seconds,
                "question_count": len(section.questions),
                "total_marks": sum(question.marks for question in section.questions),
            }
            for section in assessment.sections
        ],
    }


def _build_final_report(
    db: Session,
    attempt: AssessmentAttempt,
) -> AssessmentReport | None:
    interview = db.scalar(
        select(AssessmentInterview)
        .options(
            selectinload(AssessmentInterview.questions)
            .selectinload(AssessmentInterviewQuestion.response)
        )
        .where(AssessmentInterview.attempt_id == attempt.id)
    )
    if attempt.interview_eligible and (not interview or interview.status != "completed"):
        return None

    report = db.scalar(select(AssessmentReport).where(AssessmentReport.attempt_id == attempt.id))
    if report:
        return report

    evaluation_rows = []
    interview_score = None
    if interview:
        scores = []
        for question in interview.questions:
            response = question.response
            evaluation_rows.append(
                {
                    "skill": question.skill,
                    "question": question.prompt,
                    "response": response.response_text if response else "",
                    "score": response.score if response else None,
                    "feedback": response.feedback if response else None,
                    "evaluation": response.evaluation if response else None,
                }
            )
            if response and response.score is not None:
                scores.append(response.score)
        interview_score = sum(scores) / len(scores) if scores else 0

    report_data = {
        "assessment_id": attempt.assignment.assessment_id,
        "assessment_title": attempt.assignment.assessment.title,
        "passing_percentage": attempt.assignment.assessment.passing_percentage,
        "attempt_id": attempt.id,
        "candidate_id": attempt.assignment.candidate_subject,
        "candidate_email": attempt.assignment.candidate_email,
        "candidate_name": attempt.assignment.candidate_name,
        "assessment_score": attempt.score,
        "max_score": attempt.max_score,
        "percentage": attempt.percentage,
        "assessment_status": attempt.status,
        "interview_eligible": bool(attempt.interview_eligible),
        "interview_id": interview.id if interview else None,
        "interview_status": interview.status if interview else None,
        "interview_average_score": interview_score,
        "interview_evaluations": evaluation_rows,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    report = AssessmentReport(
        assessment_id=attempt.assignment.assessment_id,
        attempt_id=attempt.id,
        candidate_subject=attempt.assignment.candidate_subject,
        report_data=report_data,
    )
    db.add(report)
    db.flush()
    return report


def _finalize_attempt(db: Session, attempt: AssessmentAttempt, expired: bool = False) -> dict:
    if attempt.status in ("completed", "expired"):
        return {
            "score": attempt.score,
            "max_score": attempt.max_score,
            "percentage": attempt.percentage,
            "interview_eligible": bool(attempt.interview_eligible),
            "status": attempt.status,
        }

    assessment = attempt.assignment.assessment
    question_scores = []
    section_results = []
    latest_submissions = {}
    for submission in attempt.coding_submissions:
        if submission.mode == "submit":
            latest_submissions[submission.question_id] = submission

    for section in assessment.sections:
        section_score = 0.0
        section_max = 0.0
        for question in section.questions:
            section_max += question.marks
            if question.question_type == "mcq":
                answer = next((item for item in attempt.answers if item.question_id == question.id), None)
                if answer and answer.selected_option_id == question.answer_key.get("correct_option_id"):
                    section_score += question.marks
            else:
                submission = latest_submissions.get(question.id)
                if submission and submission.total:
                    section_score += question.marks * submission.score
        question_scores.append((section.name, section_score, section_max, section.section_type))
        section_results.append(
            {
                "section_id": section.id,
                "section_name": section.name,
                "section_type": section.section_type,
                "score": section_score,
                "max_score": section_max,
                "percentage": round(section_score / section_max * 100, 2) if section_max else 0,
            }
        )

    score = sum(item[1] for item in question_scores)
    max_score = sum(item[2] for item in question_scores)
    percentage = (score / max_score * 100) if max_score else 0
    attempt.score = round(score, 2)
    attempt.max_score = round(max_score, 2)
    attempt.percentage = round(percentage, 2)
    attempt.interview_eligible = percentage >= assessment.passing_percentage
    attempt.status = "expired" if expired else "completed"
    attempt.submitted_at = datetime.now(timezone.utc)
    db.flush()
    report = _build_final_report(db, attempt)
    if report:
        db.flush()
    return {
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percentage": attempt.percentage,
        "interview_eligible": attempt.interview_eligible,
        "status": attempt.status,
        "sections": section_results,
    }


def _ensure_in_progress(db: Session, attempt: AssessmentAttempt) -> None:
    if attempt.status != "in_progress" or not attempt.ends_at:
        raise HTTPException(status_code=409, detail="This assessment attempt is not in progress.")
    if datetime.now(timezone.utc) >= _aware(attempt.ends_at):
        _finalize_attempt(db, attempt, expired=True)
        db.commit()
        raise HTTPException(status_code=410, detail="The assessment timer expired; the attempt was submitted.")


@router.get("/exam/{token}")
def get_exam_link(token: str, db: Session = Depends(get_db)):
    _, assessment = _assignment_for_token(db, token)
    _check_schedule(assessment)
    assessment = db.scalar(
        select(Assessment)
        .options(selectinload(Assessment.sections))
        .where(Assessment.id == assessment.id)
    )
    return {"assessment": _assessment_data(assessment)}


@router.post("/exam/{token}/otp")
def request_exam_otp(token: str, db: Session = Depends(get_db)):
    assignment, assessment = _assignment_for_token(db, token)
    _check_schedule(assessment)
    active_attempts = db.scalar(
        select(AssessmentAttempt.id).where(
            AssessmentAttempt.assignment_id == assignment.id,
            AssessmentAttempt.status.in_(("verified", "in_progress")),
        )
    )
    if active_attempts:
        raise HTTPException(status_code=409, detail="An assessment attempt is already active.")

    now = datetime.now(timezone.utc)
    recent_challenges = db.scalars(
        select(OtpChallenge)
        .where(
            OtpChallenge.assignment_id == assignment.id,
            OtpChallenge.created_at >= now - OTP_SEND_WINDOW,
        )
        .order_by(OtpChallenge.created_at.desc())
    ).all()
    if len(recent_challenges) >= OTP_SEND_MAX:
        raise HTTPException(status_code=429, detail="The OTP send limit was reached. Try again later.")
    if recent_challenges and _aware(recent_challenges[0].created_at) > now - OTP_SEND_COOLDOWN:
        raise HTTPException(status_code=429, detail="Wait before requesting another verification code.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    db.query(OtpChallenge).filter(
        OtpChallenge.assignment_id == assignment.id,
        OtpChallenge.consumed_at.is_(None),
    ).update({"consumed_at": now}, synchronize_session=False)
    challenge = OtpChallenge(
        assignment_id=assignment.id,
        salt=secrets.token_hex(16),
        otp_hash="",
        expires_at=now.replace(microsecond=0) + timedelta(seconds=OTP_SECONDS),
    )
    challenge.otp_hash = _digest(f"{challenge.salt}:{code}")
    try:
        send_assessment_otp(assignment.candidate_email, code, assessment.title)
    except HTTPException:
        raise
    db.add(challenge)
    db.commit()
    return {"success": True, "expires_in": OTP_SECONDS, "message": "A verification code was sent to the assigned candidate email."}


@router.post("/exam/{token}/otp/verify")
def verify_exam_otp(token: str, body: OtpVerify, db: Session = Depends(get_db)):
    assignment, assessment = _assignment_for_token(db, token)
    _check_schedule(assessment)
    challenge = db.scalar(
        select(OtpChallenge)
        .where(
            OtpChallenge.assignment_id == assignment.id,
            OtpChallenge.consumed_at.is_(None),
        )
        .order_by(OtpChallenge.created_at.desc())
        .with_for_update()
    )
    now = datetime.now(timezone.utc)
    if not challenge or _aware(challenge.expires_at) <= now:
        raise HTTPException(status_code=410, detail="The verification code expired. Request a new code.")
    if challenge.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="The verification retry limit was reached.")
    challenge.attempts += 1
    if not secrets.compare_digest(challenge.otp_hash, _digest(f"{challenge.salt}:{body.otp}")):
        if challenge.attempts >= OTP_MAX_ATTEMPTS:
            challenge.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=429 if challenge.attempts >= OTP_MAX_ATTEMPTS else 400,
            detail="The verification code is invalid.",
        )

    challenge.consumed_at = now
    existing_attempts = db.query(AssessmentAttempt).filter_by(assignment_id=assignment.id).count()
    if existing_attempts >= assessment.max_attempts:
        db.rollback()
        raise HTTPException(status_code=409, detail="The maximum number of attempts has been reached.")
    session_token = secrets.token_urlsafe(32)
    attempt = AssessmentAttempt(
        assignment_id=assignment.id,
        attempt_number=existing_attempts + 1,
        session_token_hash=_digest(session_token),
        status="verified",
        verified_at=now,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    assessment = db.scalar(
        select(Assessment)
        .options(selectinload(Assessment.sections))
        .where(Assessment.id == assessment.id)
    )
    return {
        "success": True,
        "session_token": session_token,
        "assessment_id": assessment.id,
        "assessment": _assessment_data(assessment),
        "attempt_id": attempt.id,
    }


@router.get("/exam/{token}/session")
def get_exam_session(
    token: str,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    assignment, _ = _assignment_for_token(db, token)
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.assignment_id != assignment.id:
        raise HTTPException(status_code=403, detail="This session does not belong to the assessment link.")
    return {
        "attempt_id": attempt.id,
        "status": attempt.status,
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percentage": attempt.percentage,
        "interview_eligible": attempt.interview_eligible,
        "started_at": _aware(attempt.started_at).isoformat() if attempt.started_at else None,
        "ends_at": _aware(attempt.ends_at).isoformat() if attempt.ends_at else None,
        "assessment": _assessment_data(attempt.assignment.assessment),
        "answers": [
            {"question_id": answer.question_id, "selected_option_id": answer.selected_option_id}
            for answer in attempt.answers
        ],
        "coding_drafts": {
            submission.question_id: submission.source_code
            for submission in attempt.coding_submissions
            if submission.mode == "draft"
        },
        "questions": [
            _question_data(section, question)
            for section in attempt.assignment.assessment.sections
            for question in section.questions
        ],
    }


@router.post("/exam/{token}/start")
def start_exam(
    token: str,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    assignment, assessment = _assignment_for_token(db, token)
    _check_schedule(assessment)
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.assignment_id != assignment.id:
        raise HTTPException(status_code=403, detail="This session does not belong to the assessment link.")
    if attempt.status == "in_progress":
        return get_exam_session(token, assessment_session, db)
    if attempt.status != "verified":
        raise HTTPException(status_code=409, detail="This assessment attempt cannot be started.")

    now = datetime.now(timezone.utc)
    attempt.started_at = now
    schedule_end = _aware(assessment.ends_at)
    attempt.ends_at = min(now + timedelta(seconds=assessment.duration_seconds), schedule_end)
    attempt.status = "in_progress"
    db.commit()
    db.refresh(attempt)
    questions = [
        _question_data(section, question)
        for section in assessment.sections
        for question in section.questions
    ]
    return {
        "attempt_id": attempt.id,
        "started_at": _aware(attempt.started_at).isoformat(),
        "ends_at": _aware(attempt.ends_at).isoformat(),
        "remaining_seconds": max(0, int((_aware(attempt.ends_at) - now).total_seconds())),
        "assessment": _assessment_data(assessment),
        "questions": questions,
    }


@router.put("/exam/{token}/answers/{question_id}")
def save_mcq_answer(
    token: str,
    question_id: str,
    body: McqAnswerInput,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    assignment, _ = _assignment_for_token(db, token)
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.assignment_id != assignment.id:
        raise HTTPException(status_code=403, detail="This session does not belong to the assessment link.")
    _ensure_in_progress(db, attempt)
    question = _question_for_attempt(attempt, question_id)
    if question.question_type != "mcq":
        raise HTTPException(status_code=422, detail="This question is not an MCQ.")
    option_ids = {
        str(option.get("id"))
        for option in question.public_data.get("options", [])
        if isinstance(option, dict) and option.get("id") is not None
    }
    if body.selected_option_id is not None and body.selected_option_id not in option_ids:
        raise HTTPException(status_code=422, detail="Selected option does not belong to this question.")
    answer = db.scalar(
        select(McqAnswer).where(
            McqAnswer.attempt_id == attempt.id,
            McqAnswer.question_id == question.id,
        )
    )
    if answer:
        answer.selected_option_id = body.selected_option_id
        answer.saved_at = datetime.now(timezone.utc)
    else:
        db.add(
            McqAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                selected_option_id=body.selected_option_id,
            )
        )
    db.commit()
    return {"saved": True, "question_id": question_id}


@router.post("/exam/{token}/coding/{question_id}/draft")
def save_coding_draft(
    token: str,
    question_id: str,
    body: CodingSubmissionInput,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    assignment, _ = _assignment_for_token(db, token)
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.assignment_id != assignment.id:
        raise HTTPException(status_code=403, detail="This session does not belong to the assessment link.")
    _ensure_in_progress(db, attempt)
    question = _question_for_attempt(attempt, question_id)
    if question.question_type != "coding":
        raise HTTPException(status_code=422, detail="This question is not a coding question.")
    draft = db.scalar(
        select(CodingSubmission).where(
            CodingSubmission.attempt_id == attempt.id,
            CodingSubmission.question_id == question.id,
            CodingSubmission.mode == "draft",
        )
    )
    if draft:
        draft.source_code = body.source_code
        draft.language_id = body.language_id
        draft.created_at = datetime.now(timezone.utc)
    else:
        db.add(
            CodingSubmission(
                attempt_id=attempt.id,
                question_id=question.id,
                source_code=body.source_code,
                language_id=body.language_id,
                mode="draft",
                status="saved",
                passed=0,
                total=0,
                score=0,
            )
        )
    db.commit()
    return {"saved": True, "question_id": question_id}


def _evaluate_coding_submission(
    token: str,
    question_id: str,
    body: CodingSubmissionInput,
    is_submit: bool,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session | None = None,
):
    if db is None:
        raise HTTPException(status_code=503, detail="Core API database is not configured.")
    assignment, _ = _assignment_for_token(db, token)
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.assignment_id != assignment.id:
        raise HTTPException(status_code=403, detail="This session does not belong to the assessment link.")
    _ensure_in_progress(db, attempt)
    question = _question_for_attempt(attempt, question_id)
    if question.question_type != "coding":
        raise HTTPException(status_code=422, detail="This question is not a coding question.")
    test_cases = question.hidden_test_cases if is_submit else [
        case
        for case in question.public_data.get("sample_test_cases", [])
        if isinstance(case, dict) and not case.get("hidden", False)
    ]
    if is_submit and not test_cases:
        raise HTTPException(status_code=422, detail="This coding question has no configured evaluation cases.")

    if not is_submit and not test_cases:
        outcome = execute_test_case(body.source_code, body.language_id, body.stdin)
        status = outcome.get("status", {}).get("description", "Unknown")
        submission = CodingSubmission(
            attempt_id=attempt.id,
            question_id=question.id,
            source_code=body.source_code,
            language_id=body.language_id,
            mode="run",
            status="executed",
            passed=0,
            total=0,
            score=0,
            details={
                "status": status,
                "stdout": outcome.get("stdout") or "",
                "stderr": outcome.get("stderr") or "",
                "compile_output": outcome.get("compile_output") or "",
            },
        )
        db.add(submission)
        db.commit()
        return {
            "submission_id": submission.id,
            "status": "executed",
            "output": submission.details["stdout"],
            "error": submission.details["stderr"] or submission.details["compile_output"],
        }

    results = []
    for index, case in enumerate(test_cases):
        if (
            not isinstance(case, dict)
            or not isinstance(case.get("input", ""), str)
            or not isinstance(case.get("expected_output", ""), str)
        ):
            raise HTTPException(status_code=500, detail="A coding test case is incorrectly configured.")
        outcome = execute_test_case(body.source_code, body.language_id, case.get("input", ""))
        status = outcome.get("status", {}).get("description", "Unknown")
        actual = outcome.get("stdout") or ""
        expected = str(case.get("expected_output", "")).strip()
        passed = status.lower() == "accepted" and actual.strip() == expected
        hidden = is_submit or bool(case.get("hidden", False))
        results.append(
            {
                "index": index,
                "passed": passed,
                "status": status,
                "hidden": hidden,
                "actual": actual if not hidden else None,
                "expected": expected if not hidden else None,
            }
        )

    passed_count = sum(1 for result in results if result["passed"])
    total = len(results)
    submission = CodingSubmission(
        attempt_id=attempt.id,
        question_id=question.id,
        source_code=body.source_code,
        language_id=body.language_id,
        mode="submit" if is_submit else "run",
        status=("accepted" if passed_count == total else "wrong_answer") if is_submit else (
            "accepted" if passed_count == total else "wrong_answer"
        ),
        passed=passed_count,
        total=total,
        score=passed_count / total if total else 0,
        details={"results": results},
    )
    db.add(submission)
    db.commit()
    return {
        "submission_id": submission.id,
        "status": submission.status,
        "passed": passed_count,
        "total": total,
        "results": results,
    }


@router.post("/exam/{token}/coding/{question_id}/run")
def run_coding_answer(
    token: str,
    question_id: str,
    body: CodingSubmissionInput,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    return _evaluate_coding_submission(
        token, question_id, body, False, assessment_session, db
    )


@router.post("/exam/{token}/coding/{question_id}/submit")
def submit_coding_answer(
    token: str,
    question_id: str,
    body: CodingSubmissionInput,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    return _evaluate_coding_submission(
        token, question_id, body, True, assessment_session, db
    )


@router.post("/exam/{token}/submit")
def submit_exam(
    token: str,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    assignment, _ = _assignment_for_token(db, token)
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.assignment_id != assignment.id:
        raise HTTPException(status_code=403, detail="This session does not belong to the assessment link.")
    _ensure_in_progress(db, attempt)
    result = _finalize_attempt(db, attempt)
    db.commit()
    return result


@router.get("/exam/{token}/report")
def get_candidate_exam_report(
    token: str,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    assignment, _ = _assignment_for_token(db, token)
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.assignment_id != assignment.id:
        raise HTTPException(status_code=403, detail="This session does not belong to the assessment link.")
    if attempt.status not in ("completed", "expired"):
        raise HTTPException(status_code=409, detail="The assessment has not been submitted.")
    report = _build_final_report(db, attempt)
    if not report:
        raise HTTPException(status_code=409, detail="The required assessment interview is not complete.")
    db.commit()
    return {"id": report.id, **report.report_data}

