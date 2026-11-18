from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import (
    Assessment,
    AssessmentAttempt,
    AssessmentInterview,
    AssessmentInterviewQuestion,
    AssessmentInterviewResponse,
    AssessmentReport,
    InstitutionMembership,
)
from app.schemas.core import InterviewResponseInput
from app.security import Principal, require_admin
from app.services.answer_evaluation import evaluate_answer
from app.services.question_generation import generate_concept_questions
from app.routers.core_exam import (
    _attempt_for_session,
    _build_final_report,
    _question_data,
)
from app.routers.core_admin import _require_institution_admin


router = APIRouter(tags=["core-assessment-interview"])


def _interview_data(interview: AssessmentInterview) -> dict:
    return {
        "id": interview.id,
        "assessment_id": interview.assessment_id,
        "attempt_id": interview.attempt_id,
        "candidate_id": interview.candidate_subject,
        "status": interview.status,
        "started_at": interview.started_at.isoformat(),
        "completed_at": interview.completed_at.isoformat() if interview.completed_at else None,
        "questions": [
            {
                "id": question.id,
                "sequence": question.sequence,
                "skill": question.skill,
                "question": question.prompt,
                "response": question.response.response_text if question.response else None,
                "evaluation": question.response.evaluation if question.response else None,
                "score": question.response.score if question.response else None,
                "feedback": question.response.feedback if question.response else None,
            }
            for question in interview.questions
        ],
    }


@router.post("/assessments/{assessment_id}/attempts/{attempt_id}/interview/start", status_code=201)
def start_assessment_interview(
    assessment_id: str,
    attempt_id: str,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.id != attempt_id or attempt.assignment.assessment_id != assessment_id:
        raise HTTPException(status_code=403, detail="This session does not match the assessment attempt.")
    if attempt.status not in ("completed", "expired"):
        raise HTTPException(status_code=409, detail="Submit the assessment before starting its interview.")
    if not attempt.interview_eligible:
        raise HTTPException(status_code=403, detail="The submitted assessment does not meet the interview eligibility threshold.")

    existing = db.scalar(
        select(AssessmentInterview)
        .options(selectinload(AssessmentInterview.questions))
        .where(AssessmentInterview.attempt_id == attempt.id)
    )
    if existing:
        return _interview_data(existing)

    assessment = attempt.assignment.assessment
    skill_names = list(dict.fromkeys(section.name.strip() for section in assessment.sections if section.name.strip()))
    if not skill_names:
        raise HTTPException(status_code=422, detail="The assessment has no skills configured for interview questions.")

    generated = []
    try:
        for skill in skill_names:
            result = generate_concept_questions(
                role=assessment.title,
                skill=skill,
                concept=skill,
            )
            questions = result.get("questions")
            if not isinstance(questions, list) or not questions:
                raise RuntimeError(f"No interview questions were generated for {skill}.")
            generated.extend((skill, item) for item in questions)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=f"Assessment interview question generation failed: {exc}") from exc

    interview = AssessmentInterview(
        assessment_id=assessment.id,
        attempt_id=attempt.id,
        candidate_subject=attempt.assignment.candidate_subject,
        status="in_progress",
    )
    interview.questions = [
        AssessmentInterviewQuestion(
            sequence=index,
            skill=skill,
            prompt=str(question.get("question", "")).strip(),
        )
        for index, (skill, question) in enumerate(generated, start=1)
        if isinstance(question, dict) and str(question.get("question", "")).strip()
    ]
    if not interview.questions:
        raise HTTPException(status_code=503, detail="The interview generator returned no usable questions.")
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return _interview_data(interview)


@router.get("/assessment-interviews/{interview_id}")
def get_assessment_interview(
    interview_id: str,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    interview = db.scalar(
        select(AssessmentInterview)
        .options(
            selectinload(AssessmentInterview.questions)
            .selectinload(AssessmentInterviewQuestion.response)
        )
        .where(AssessmentInterview.id == interview_id)
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Assessment interview not found.")
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.id != interview.attempt_id or attempt.assignment.candidate_subject != interview.candidate_subject:
        raise HTTPException(status_code=403, detail="This interview does not belong to the verified assessment candidate.")
    return _interview_data(interview)


@router.put("/assessment-interviews/{interview_id}/questions/{question_id}/response")
def evaluate_assessment_interview_response(
    interview_id: str,
    question_id: str,
    body: InterviewResponseInput,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    interview = db.scalar(
        select(AssessmentInterview)
        .options(selectinload(AssessmentInterview.questions))
        .where(AssessmentInterview.id == interview_id)
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Assessment interview not found.")
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.id != interview.attempt_id or attempt.assignment.candidate_subject != interview.candidate_subject:
        raise HTTPException(status_code=403, detail="This interview does not belong to the verified assessment candidate.")
    if interview.status != "in_progress":
        raise HTTPException(status_code=409, detail="This assessment interview is already complete.")
    question = next((item for item in interview.questions if item.id == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Interview question not found.")

    evaluation = evaluate_answer(
        role=attempt.assignment.assessment.title,
        skill=question.skill,
        concept=question.skill,
        difficulty="Medium",
        question=question.prompt,
        answer=body.response,
    )
    if evaluation.get("evaluation_error") or evaluation.get("marks_awarded") is None:
        raise HTTPException(status_code=503, detail="The interview evaluation service did not return a valid evaluation.")
    score = float(evaluation["marks_awarded"])
    response = question.response
    if response:
        response.response_text = body.response
        response.evaluation = evaluation
        response.score = score
        response.feedback = str(evaluation.get("feedback", ""))
        response.evaluated_at = datetime.now(timezone.utc)
    else:
        question.response = AssessmentInterviewResponse(
            response_text=body.response,
            evaluation=evaluation,
            score=score,
            feedback=str(evaluation.get("feedback", "")),
            evaluated_at=datetime.now(timezone.utc),
        )
    db.commit()
    return {
        "question_id": question.id,
        "skill": question.skill,
        "score": score,
        "feedback": evaluation.get("feedback"),
        "evaluation": evaluation,
    }


@router.post("/assessment-interviews/{interview_id}/complete")
def complete_assessment_interview(
    interview_id: str,
    assessment_session: str = Header(default="", alias="X-Assessment-Session"),
    db: Session = Depends(get_db),
):
    interview = db.scalar(
        select(AssessmentInterview)
        .options(
            selectinload(AssessmentInterview.questions)
            .selectinload(AssessmentInterviewQuestion.response)
        )
        .where(AssessmentInterview.id == interview_id)
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Assessment interview not found.")
    attempt = _attempt_for_session(db, assessment_session)
    if attempt.id != interview.attempt_id or attempt.assignment.candidate_subject != interview.candidate_subject:
        raise HTTPException(status_code=403, detail="This interview does not belong to the verified assessment candidate.")
    if interview.status == "completed":
        return _interview_data(interview)
    if not interview.questions or any(
        question.response is None or question.response.evaluation is None
        for question in interview.questions
    ):
        raise HTTPException(status_code=409, detail="Evaluate every skill-wise interview response before completing.")

    interview.status = "completed"
    interview.completed_at = datetime.now(timezone.utc)
    report = _build_final_report(db, attempt)
    if report is None:
        raise HTTPException(status_code=409, detail="Final assessment report cannot be generated before all required stages complete.")
    db.commit()
    return _interview_data(interview)


@router.get("/assessments/{assessment_id}/results")
def get_assessment_results(
    assessment_id: str,
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    assessment = db.get(Assessment, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    _require_institution_admin(db, assessment.institution_id, principal)
    reports = db.scalars(
        select(AssessmentReport)
        .where(AssessmentReport.assessment_id == assessment_id)
        .order_by(AssessmentReport.generated_at.desc())
    ).all()
    return {
        "assessment_id": assessment_id,
        "reports": [{"id": report.id, **report.report_data} for report in reports],
    }

