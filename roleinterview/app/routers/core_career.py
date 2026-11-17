from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import (
    CareerInterview,
    CareerInterviewQuestion,
    CareerInterviewResponse,
    CareerProfile,
    CareerReport,
    CareerRoleAnalysis,
    LearningPlan,
    LearningPlanItem,
    LearningProgress,
    Subscription,
)
from app.schemas.core import (
    CareerInterviewStart,
    CareerProfileConfirm,
    CareerResumeInput,
    CareerRoleAnalysisRequest,
    InterviewResponseInput,
    LearningPlanGenerate,
    LearningProgressInput,
    SubscriptionGrant,
)
from app.security import Principal, get_principal, require_admin
from app.services.answer_evaluation import evaluate_answer
from app.services.question_generation import generate_concept_questions
from app.services.role_discovery import discover_roles_from_resume
from app.services.role_requirements import generate_role_requirements


router = APIRouter(tags=["core-career"])


def _profile_for(db: Session, principal: Principal) -> CareerProfile:
    profile = db.scalar(
        select(CareerProfile).where(CareerProfile.candidate_subject == principal.subject)
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Confirm a resume profile before continuing.")
    return profile


def _analysis_for(
    db: Session,
    principal: Principal,
    analysis_id: str,
) -> CareerRoleAnalysis:
    analysis = db.scalar(
        select(CareerRoleAnalysis)
        .join(CareerProfile)
        .where(
            CareerRoleAnalysis.id == analysis_id,
            CareerProfile.candidate_subject == principal.subject,
        )
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Career goal or skill-gap analysis not found.")
    return analysis


def _interview_for(
    db: Session,
    principal: Principal,
    interview_id: str,
) -> CareerInterview:
    interview = db.scalar(
        select(CareerInterview)
        .options(
            selectinload(CareerInterview.questions)
            .selectinload(CareerInterviewQuestion.response)
        )
        .join(CareerProfile)
        .where(
            CareerInterview.id == interview_id,
            CareerProfile.candidate_subject == principal.subject,
        )
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Career interview not found.")
    return interview


def _skill_names(value) -> list[str]:
    if not isinstance(value, list):
        return []
    names = []
    for item in value:
        if isinstance(item, str):
            name = item.strip()
        elif isinstance(item, dict):
            name = str(item.get("skill") or item.get("name") or item.get("title") or "").strip()
        else:
            continue
        if name and name.casefold() not in {existing.casefold() for existing in names}:
            names.append(name)
    return names


def _analysis_data(analysis: CareerRoleAnalysis) -> dict:
    return {
        "id": analysis.id,
        "role": analysis.role,
        "required_skills": analysis.required_skills,
        "matching_skills": analysis.matching_skills,
        "missing_skills": analysis.missing_skills,
        "weak_skills": analysis.weak_skills,
        "requirements": analysis.requirements_data,
        "created_at": analysis.created_at.isoformat(),
    }


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _active_subscription(db: Session, subject: str) -> Subscription | None:
    now = datetime.now(timezone.utc)
    records = db.scalars(
        select(Subscription).where(
            Subscription.candidate_subject == subject,
            Subscription.status == "active",
        )
    ).all()
    return next(
        (
            subscription
            for subscription in records
            if _aware(subscription.starts_at) <= now < _aware(subscription.ends_at)
        ),
        None,
    )


def _interview_data(interview: CareerInterview) -> dict:
    return {
        "id": interview.id,
        "role_analysis_id": interview.role_analysis_id,
        "role": interview.role_analysis.role,
        "status": interview.status,
        "started_at": interview.started_at.isoformat(),
        "completed_at": interview.completed_at.isoformat() if interview.completed_at else None,
        "questions": [
            {
                "id": question.id,
                "sequence": question.sequence,
                "skill": question.skill,
                "concept": question.concept,
                "question": question.prompt,
                "response": question.response.response_text if question.response else None,
                "evaluation": question.response.evaluation if question.response else None,
                "score": question.response.score if question.response else None,
                "feedback": question.response.feedback if question.response else None,
            }
            for question in interview.questions
        ],
    }


@router.put("/career/profile/confirm")
def confirm_career_profile(
    body: CareerProfileConfirm,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    profile = db.scalar(
        select(CareerProfile).where(CareerProfile.candidate_subject == principal.subject)
    )
    if profile:
        profile.email = principal.email
        profile.resume_profile = body.resume_profile
        profile.skills = [skill.model_dump() for skill in body.skills]
        profile.selected_role = None
        profile.confirmed_at = datetime.now(timezone.utc)
    else:
        profile = CareerProfile(
            candidate_subject=principal.subject,
            email=principal.email,
            resume_profile=body.resume_profile,
            skills=[skill.model_dump() for skill in body.skills],
        )
        db.add(profile)
    db.commit()
    db.refresh(profile)
    return {
        "id": profile.id,
        "candidate_id": profile.candidate_subject,
        "skills": profile.skills,
        "confirmed_at": profile.confirmed_at.isoformat(),
    }


@router.get("/career/profile")
def get_career_profile(
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    profile = _profile_for(db, principal)
    return {
        "id": profile.id,
        "candidate_id": profile.candidate_subject,
        "email": profile.email,
        "resume_profile": profile.resume_profile,
        "skills": profile.skills,
        "selected_role": profile.selected_role,
        "confirmed_at": profile.confirmed_at.isoformat(),
    }


@router.post("/career/roles/recommend")
def recommend_career_roles(
    body: CareerResumeInput,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    _profile_for(db, principal)
    try:
        roles = discover_roles_from_resume(body.resume_text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"roles": roles}


@router.put("/career/goal")
def select_career_goal(
    body: CareerRoleAnalysisRequest,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    profile = _profile_for(db, principal)
    try:
        requirements = generate_role_requirements(body.role, body.resume_text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    required = _skill_names(requirements.get("role_required_skills", []))
    matching = _skill_names(requirements.get("common_skills", []))
    missing = _skill_names(requirements.get("missing_role_skills", []))
    skill_areas = requirements.get("skill_areas", [])
    if isinstance(skill_areas, list):
        for area in skill_areas:
            if not isinstance(area, dict):
                continue
            name = str(area.get("skill") or "").strip()
            if not name:
                continue
            if area.get("resume_supported") is False and name.casefold() not in {
                item.casefold() for item in missing
            }:
                missing.append(name)
            elif area.get("resume_supported") is True and name.casefold() not in {
                item.casefold() for item in matching
            }:
                matching.append(name)
    profile_skill_names = {
        str(item.get("name", "")).casefold()
        for item in profile.skills
        if isinstance(item, dict)
    }
    weak = [
        item for item in required
        if item.casefold() in profile_skill_names
        and item.casefold() not in {match.casefold() for match in matching}
    ]
    analysis = db.scalar(
        select(CareerRoleAnalysis).where(
            CareerRoleAnalysis.profile_id == profile.id,
            CareerRoleAnalysis.role == body.role,
        )
    )
    fields = {
        "required_skills": required,
        "matching_skills": matching,
        "missing_skills": missing,
        "weak_skills": weak,
        "requirements_data": requirements,
    }
    if analysis:
        for name, value in fields.items():
            setattr(analysis, name, value)
    else:
        analysis = CareerRoleAnalysis(profile_id=profile.id, role=body.role, **fields)
        db.add(analysis)
    profile.selected_role = body.role
    db.commit()
    db.refresh(analysis)
    return _analysis_data(analysis)


@router.get("/career/skill-gaps/{analysis_id}")
def get_career_skill_gaps(
    analysis_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    return _analysis_data(_analysis_for(db, principal, analysis_id))


@router.post("/career/interviews", status_code=201)
def start_career_interview(
    body: CareerInterviewStart,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    profile = _profile_for(db, principal)
    analysis = _analysis_for(db, principal, body.role_analysis_id)
    if profile.selected_role != analysis.role:
        raise HTTPException(status_code=409, detail="Select this career goal before starting its interview.")
    skills = list(dict.fromkeys(analysis.required_skills or []))
    if not skills:
        raise HTTPException(status_code=422, detail="The selected role has no required skills to assess.")

    areas = analysis.requirements_data.get("skill_areas", [])
    concepts_by_skill = {}
    if isinstance(areas, list):
        for area in areas:
            if not isinstance(area, dict) or not area.get("skill"):
                continue
            concepts = area.get("concepts", [])
            if isinstance(concepts, list) and concepts:
                first = concepts[0]
                concept = first if isinstance(first, str) else first.get("name") if isinstance(first, dict) else None
                if concept:
                    concepts_by_skill[str(area["skill"])] = str(concept)

    generated = []
    try:
        for skill in skills:
            concept = concepts_by_skill.get(skill, skill)
            result = generate_concept_questions(
                role=analysis.role,
                skill=skill,
                concept=concept,
            )
            questions = result.get("questions")
            if not isinstance(questions, list) or not questions:
                raise RuntimeError(f"No interview questions were generated for {skill}.")
            generated.extend((skill, concept, item) for item in questions)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=f"Career interview question generation failed: {exc}") from exc

    interview = CareerInterview(profile_id=profile.id, role_analysis_id=analysis.id, status="in_progress")
    interview.questions = [
        CareerInterviewQuestion(
            sequence=index,
            skill=skill,
            concept=concept,
            prompt=str(question.get("question", "")).strip(),
        )
        for index, (skill, concept, question) in enumerate(generated, start=1)
        if isinstance(question, dict) and str(question.get("question", "")).strip()
    ]
    if not interview.questions:
        raise HTTPException(status_code=503, detail="The interview generator returned no usable questions.")
    db.add(interview)
    db.commit()
    db.refresh(interview)
    interview = _interview_for(db, principal, interview.id)
    return _interview_data(interview)


@router.get("/career/interviews/{interview_id}")
def get_career_interview(
    interview_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    return _interview_data(_interview_for(db, principal, interview_id))


@router.put("/career/interviews/{interview_id}/questions/{question_id}/response")
def evaluate_career_response(
    interview_id: str,
    question_id: str,
    body: InterviewResponseInput,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    interview = _interview_for(db, principal, interview_id)
    if interview.status != "in_progress":
        raise HTTPException(status_code=409, detail="This career interview is already complete.")
    question = next((item for item in interview.questions if item.id == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Career interview question not found.")
    analysis = db.get(CareerRoleAnalysis, interview.role_analysis_id)
    evaluation = evaluate_answer(
        role=analysis.role,
        skill=question.skill,
        concept=question.concept,
        difficulty="Medium",
        question=question.prompt,
        answer=body.response,
    )
    if evaluation.get("evaluation_error") or evaluation.get("marks_awarded") is None:
        raise HTTPException(status_code=503, detail="The interview evaluation service did not return a valid evaluation.")
    response = question.response
    now = datetime.now(timezone.utc)
    if response:
        response.response_text = body.response
        response.evaluation = evaluation
        response.score = float(evaluation["marks_awarded"])
        response.feedback = str(evaluation.get("feedback", ""))
        response.evaluated_at = now
    else:
        question.response = CareerInterviewResponse(
            response_text=body.response,
            evaluation=evaluation,
            score=float(evaluation["marks_awarded"]),
            feedback=str(evaluation.get("feedback", "")),
            evaluated_at=now,
        )
    db.commit()
    return {
        "question_id": question.id,
        "skill": question.skill,
        "score": response.score if response else question.response.score,
        "feedback": evaluation.get("feedback"),
        "evaluation": evaluation,
    }


@router.post("/career/interviews/{interview_id}/complete")
def complete_career_interview(
    interview_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    interview = _interview_for(db, principal, interview_id)
    if interview.status == "completed":
        return _interview_data(interview)
    if not interview.questions or any(
        question.response is None or question.response.evaluation is None
        for question in interview.questions
    ):
        raise HTTPException(status_code=409, detail="Evaluate every skill-wise response before completing the interview.")

    analysis = db.get(CareerRoleAnalysis, interview.role_analysis_id)
    skill_results = {}
    for question in interview.questions:
        response = question.response
        row = skill_results.setdefault(
            question.skill,
            {"scores": [], "feedback": [], "strengths": [], "improvements": []},
        )
        row["scores"].append(response.score)
        row["feedback"].append(response.feedback)
        row["strengths"].extend(response.evaluation.get("strengths", []))
        row["improvements"].extend(response.evaluation.get("improvements", []))
    by_skill = {
        skill: {
            "score": round(sum(row["scores"]) / len(row["scores"]), 2),
            "max_score": 10,
            "feedback": list(dict.fromkeys(row["feedback"])),
            "strengths": list(dict.fromkeys(row["strengths"])),
            "improvements": list(dict.fromkeys(row["improvements"])),
        }
        for skill, row in skill_results.items()
    }
    all_scores = [score for row in skill_results.values() for score in row["scores"]]
    report_data = {
        "candidate_id": principal.subject,
        "role": analysis.role,
        "career_goal_id": analysis.id,
        "overall_score": round(sum(all_scores) / len(all_scores), 2) if all_scores else 0,
        "skill_evaluations": by_skill,
        "missing_skills": analysis.missing_skills,
        "weak_skills": analysis.weak_skills,
        "recommendations": list(dict.fromkeys(
            improvement
            for row in skill_results.values()
            for improvement in row["improvements"]
        )),
        "questions": [
            {
                "skill": question.skill,
                "concept": question.concept,
                "question": question.prompt,
                "response": question.response.response_text,
                "score": question.response.score,
                "feedback": question.response.feedback,
                "evaluation": question.response.evaluation,
            }
            for question in interview.questions
        ],
    }
    interview.status = "completed"
    interview.completed_at = datetime.now(timezone.utc)
    report = CareerReport(
        profile_id=interview.profile_id,
        interview_id=interview.id,
        report_data=report_data,
    )
    db.add(report)
    db.commit()
    return {"interview_id": interview.id, **report_data}


@router.get("/career/interviews/{interview_id}/report")
def get_career_report(
    interview_id: str,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    interview = _interview_for(db, principal, interview_id)
    report = db.scalar(select(CareerReport).where(CareerReport.interview_id == interview.id))
    if not report:
        raise HTTPException(status_code=409, detail="Complete all required interview stages before requesting the report.")
    return {"id": report.id, **report.report_data}


@router.post("/subscriptions", status_code=201)
def grant_subscription(
    body: SubscriptionGrant,
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    subscription = Subscription(
        candidate_subject=body.candidate_subject,
        status="active",
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        granted_by_subject=principal.subject,
        external_reference=body.external_reference,
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return {
        "id": subscription.id,
        "candidate_id": subscription.candidate_subject,
        "status": subscription.status,
        "starts_at": subscription.starts_at.isoformat(),
        "ends_at": subscription.ends_at.isoformat(),
    }


@router.get("/subscriptions/me")
def get_my_subscription(
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    records = db.scalars(
        select(Subscription)
        .where(Subscription.candidate_subject == principal.subject)
        .order_by(Subscription.ends_at.desc())
    ).all()
    active = next(
        (
            subscription
            for subscription in records
            if subscription.status == "active"
            and _aware(subscription.starts_at) <= datetime.now(timezone.utc)
            and _aware(subscription.ends_at) > datetime.now(timezone.utc)
        ),
        None,
    )
    return {
        "eligible": active is not None,
        "subscription": (
            {
                "id": active.id,
                "status": active.status,
                "starts_at": active.starts_at.isoformat(),
                "ends_at": active.ends_at.isoformat(),
            }
            if active
            else None
        ),
    }


@router.post("/learning-plans", status_code=201)
def generate_learning_plan(
    body: LearningPlanGenerate,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    profile = _profile_for(db, principal)
    if not _active_subscription(db, principal.subject):
        raise HTTPException(status_code=403, detail="An active subscription is required to generate a learning plan.")
    analysis = _analysis_for(db, principal, body.role_analysis_id)
    if profile.selected_role != analysis.role:
        raise HTTPException(status_code=409, detail="The learning plan must match the selected career goal.")
    gaps = list(dict.fromkeys(analysis.missing_skills + analysis.weak_skills))
    if not gaps:
        raise HTTPException(status_code=422, detail="No missing or weak skills are recorded for this career goal.")

    plan = LearningPlan(
        profile_id=profile.id,
        role_analysis_id=analysis.id,
        starts_on=date.today(),
        weeks=body.weeks,
        status="active",
    )
    plan.items = [
        LearningPlanItem(
            week_number=(index % body.weeks) + 1,
            skill=skill,
            focus=f"Build {skill} for the selected {analysis.role} career goal and reassess it with skill-wise practice.",
            status="pending",
        )
        for index, skill in enumerate(gaps)
    ]
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return {
        "id": plan.id,
        "role_analysis_id": analysis.id,
        "role": analysis.role,
        "starts_on": plan.starts_on.isoformat(),
        "weeks": plan.weeks,
        "items": [
            {
                "id": item.id,
                "week_number": item.week_number,
                "skill": item.skill,
                "focus": item.focus,
                "status": item.status,
            }
            for item in plan.items
        ],
    }


@router.get("/learning-plans/me")
def get_my_learning_plan(
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    profile = _profile_for(db, principal)
    if not _active_subscription(db, principal.subject):
        raise HTTPException(status_code=403, detail="An active subscription is required to access the learning plan.")
    plan = db.scalar(
        select(LearningPlan)
        .options(selectinload(LearningPlan.items))
        .where(LearningPlan.profile_id == profile.id, LearningPlan.status == "active")
        .order_by(LearningPlan.created_at.desc())
    )
    if not plan:
        return {"plan": None}
    return {
        "plan": {
            "id": plan.id,
            "role_analysis_id": plan.role_analysis_id,
            "starts_on": plan.starts_on.isoformat(),
            "weeks": plan.weeks,
            "items": [
                {
                    "id": item.id,
                    "week_number": item.week_number,
                    "skill": item.skill,
                    "focus": item.focus,
                    "status": item.status,
                }
                for item in plan.items
            ],
        }
    }


@router.patch("/learning-plans/{plan_id}/items/{item_id}/progress")
def update_learning_progress(
    plan_id: str,
    item_id: str,
    body: LearningProgressInput,
    principal: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
):
    profile = _profile_for(db, principal)
    if not _active_subscription(db, principal.subject):
        raise HTTPException(status_code=403, detail="An active subscription is required to update learning progress.")
    item = db.scalar(
        select(LearningPlanItem)
        .join(LearningPlan)
        .where(
            LearningPlanItem.id == item_id,
            LearningPlanItem.plan_id == plan_id,
            LearningPlan.profile_id == profile.id,
        )
    )
    if not item:
        raise HTTPException(status_code=404, detail="Learning-plan item not found.")
    item.status = body.status
    db.add(
        LearningProgress(
            item_id=item.id,
            candidate_subject=principal.subject,
            action=body.status,
            notes=body.notes,
        )
    )
    db.commit()
    return {"item_id": item.id, "status": item.status}

