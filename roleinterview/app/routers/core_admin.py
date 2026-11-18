from datetime import datetime, timezone
from secrets import token_urlsafe
from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import (
    Assessment,
    AssessmentAssignment,
    AssessmentQuestion,
    AssessmentSection,
    Institution,
    InstitutionMembership,
)
from app.schemas.core import AssessmentCreate, InstitutionCreate, MembershipBatch
from app.security import Principal, get_principal, require_admin


router = APIRouter(tags=["core-institution"])


@router.get("/health")
def core_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ready", "database": "connected"}


def _require_institution_admin(
    db: Session,
    institution_id: str,
    principal: Principal,
) -> Institution:
    institution = db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found.")
    membership = db.scalar(
        select(InstitutionMembership).where(
            InstitutionMembership.institution_id == institution_id,
            InstitutionMembership.user_subject == principal.subject,
            InstitutionMembership.active.is_(True),
            InstitutionMembership.membership_role.in_(("admin", "institution_admin")),
        )
    )
    if institution.created_by_subject != principal.subject and not membership:
        raise HTTPException(status_code=403, detail="You are not an administrator of this institution.")
    return institution


def _question_data(question: AssessmentQuestion, include_answers: bool = False) -> dict:
    data = {
        "id": question.id,
        "sequence": question.sequence,
        "question_type": question.question_type,
        "prompt": question.prompt,
        "marks": question.marks,
        "public_data": question.public_data,
        "hidden_test_cases": question.hidden_test_cases if include_answers else [],
    }
    if include_answers:
        data["answer_key"] = question.answer_key
    return data


def _assessment_data(assessment: Assessment, include_answers: bool = False) -> dict:
    return {
        "id": assessment.id,
        "institution_id": assessment.institution_id,
        "title": assessment.title,
        "description": assessment.description,
        "instructions": assessment.instructions,
        "starts_at": assessment.starts_at.isoformat(),
        "ends_at": assessment.ends_at.isoformat(),
        "duration_seconds": assessment.duration_seconds,
        "passing_percentage": assessment.passing_percentage,
        "status": assessment.status,
        "target_scope": assessment.target_scope,
        "target_criteria": assessment.target_criteria,
        "sections": [
            {
                "id": section.id,
                "name": section.name,
                "description": section.description,
                "sequence": section.sequence,
                "section_type": section.section_type,
                "duration_seconds": section.duration_seconds,
                "questions": [
                    _question_data(question, include_answers)
                    for question in section.questions
                ],
            }
            for section in assessment.sections
        ],
    }


@router.post("/institutions", status_code=201)
def create_institution(
    body: InstitutionCreate,
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    institution = Institution(name=body.name.strip(), created_by_subject=principal.subject)
    db.add(institution)
    db.commit()
    return {"id": institution.id, "name": institution.name}


@router.get("/auth/me")
def core_identity(principal: Principal = Depends(get_principal)):
    return {
        "subject": principal.subject,
        "email": principal.email,
        "roles": sorted(principal.roles),
    }


@router.get("/institutions")
def list_institutions(
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    memberships = select(InstitutionMembership.institution_id).where(
        InstitutionMembership.user_subject == principal.subject,
        InstitutionMembership.membership_role.in_(("admin", "institution_admin")),
        InstitutionMembership.active.is_(True),
    )
    institutions = db.scalars(
        select(Institution).where(
            (Institution.created_by_subject == principal.subject)
            | Institution.id.in_(memberships)
        )
    ).all()
    return {"institutions": [{"id": item.id, "name": item.name} for item in institutions]}


@router.post("/institutions/{institution_id}/members:sync")
def sync_members(
    institution_id: str,
    body: MembershipBatch,
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _require_institution_admin(db, institution_id, principal)
    synced = 0
    for member in body.members:
        if "@" not in member.email:
            raise HTTPException(status_code=422, detail=f"Invalid email for candidate {member.user_subject}.")
        existing = db.scalar(
            select(InstitutionMembership).where(
                InstitutionMembership.institution_id == institution_id,
                InstitutionMembership.user_subject == member.user_subject,
            )
        )
        if existing:
            existing.email = member.email.strip().lower()
            existing.full_name = member.full_name
            existing.department = member.department
            existing.year = member.year
            existing.section = member.section
            existing.active = True
        else:
            db.add(
                InstitutionMembership(
                    institution_id=institution_id,
                    user_subject=member.user_subject,
                    email=member.email.strip().lower(),
                    full_name=member.full_name,
                    department=member.department,
                    year=member.year,
                    section=member.section,
                )
            )
        synced += 1
    db.commit()
    return {"synced": synced}


@router.get("/institutions/{institution_id}/members")
def list_members(
    institution_id: str,
    department: str | None = None,
    year: str | None = None,
    section: str | None = None,
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _require_institution_admin(db, institution_id, principal)
    query = select(InstitutionMembership).where(
        InstitutionMembership.institution_id == institution_id,
        InstitutionMembership.active.is_(True),
        InstitutionMembership.membership_role == "candidate",
    )
    if department:
        query = query.where(InstitutionMembership.department == department)
    if year:
        query = query.where(InstitutionMembership.year == year)
    if section:
        query = query.where(InstitutionMembership.section == section)
    members = db.scalars(query.order_by(InstitutionMembership.full_name)).all()
    return {
        "members": [
            {
                "user_subject": member.user_subject,
                "email": member.email,
                "full_name": member.full_name,
                "department": member.department,
                "year": member.year,
                "section": member.section,
            }
            for member in members
        ]
    }


@router.post("/assessments", status_code=201)
def create_assessment(
    body: AssessmentCreate,
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _require_institution_admin(db, body.institution_id, principal)
    assessment = Assessment(
        institution_id=body.institution_id,
        created_by_subject=principal.subject,
        title=body.title,
        description=body.description,
        instructions=body.instructions,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        duration_seconds=body.duration_seconds,
        passing_percentage=body.passing_percentage,
        max_attempts=body.max_attempts,
        target_scope=body.target_scope,
        target_criteria=body.target_criteria,
    )
    for section_input in body.sections:
        section = AssessmentSection(
            name=section_input.name,
            description=section_input.description,
            sequence=section_input.sequence,
            section_type=section_input.section_type,
            duration_seconds=section_input.duration_seconds,
        )
        section.questions = [
            AssessmentQuestion(
                sequence=question.sequence,
                question_type=question.question_type,
                prompt=question.prompt,
                marks=question.marks,
                public_data=question.public_data,
                answer_key=question.answer_key,
                hidden_test_cases=question.hidden_test_cases,
            )
            for question in section_input.questions
        ]
        assessment.sections.append(section)
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return _assessment_data(assessment, include_answers=True)


@router.get("/assessments")
def list_assessments(
    institution_id: str = Query(min_length=1, max_length=36),
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _require_institution_admin(db, institution_id, principal)
    assessments = db.scalars(
        select(Assessment)
        .options(selectinload(Assessment.sections).selectinload(AssessmentSection.questions))
        .where(Assessment.institution_id == institution_id)
        .order_by(Assessment.created_at.desc())
    ).all()
    return {"assessments": [_assessment_data(item) for item in assessments]}


@router.get("/assessments/{assessment_id}")
def get_assessment(
    assessment_id: str,
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    assessment = db.scalar(
        select(Assessment)
        .options(selectinload(Assessment.sections).selectinload(AssessmentSection.questions))
        .where(Assessment.id == assessment_id)
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    _require_institution_admin(db, assessment.institution_id, principal)
    return _assessment_data(assessment, include_answers=True)


def _target_memberships(db: Session, assessment: Assessment) -> list[InstitutionMembership]:
    criteria = assessment.target_criteria or {}
    query = select(InstitutionMembership).where(
        InstitutionMembership.institution_id == assessment.institution_id,
        InstitutionMembership.active.is_(True),
        InstitutionMembership.membership_role == "candidate",
    )

    filter_fields = {
        "department": "department",
        "year": "year",
        "section": "section",
    }
    if assessment.target_scope == "individual":
        ids = [str(value) for value in criteria.get("candidate_ids", [])]
        if not ids:
            raise HTTPException(status_code=422, detail="Individual assessment has no candidate IDs.")
        query = query.where(InstitutionMembership.user_subject.in_(ids))
    elif assessment.target_scope != "institution":
        field = filter_fields[assessment.target_scope]
        values = criteria.get(f"{field}s", criteria.get(field))
        selected = values if isinstance(values, list) else [values]
        selected = [str(value) for value in selected if value is not None and str(value).strip()]
        if not selected:
            raise HTTPException(status_code=422, detail=f"{assessment.target_scope.title()} targeting needs a filter.")
        query = query.where(getattr(InstitutionMembership, field).in_(selected))

    return db.scalars(query.order_by(InstitutionMembership.user_subject)).all()


@router.post("/assessments/{assessment_id}/publish")
def publish_assessment(
    assessment_id: str,
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    assessment = db.scalar(
        select(Assessment)
        .options(selectinload(Assessment.sections).selectinload(AssessmentSection.questions))
        .where(Assessment.id == assessment_id)
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    _require_institution_admin(db, assessment.institution_id, principal)
    if assessment.status != "draft":
        raise HTTPException(status_code=409, detail="Only a draft assessment can be published.")
    members = _target_memberships(db, assessment)
    if not members:
        raise HTTPException(status_code=422, detail="No eligible candidates match this assessment target.")

    published_at = datetime.now(timezone.utc)
    links = []
    for member in members:
        token = token_urlsafe(32)
        assignment = AssessmentAssignment(
            assessment_id=assessment.id,
            candidate_subject=member.user_subject,
            candidate_email=member.email,
            candidate_name=member.full_name,
            invite_token_hash=sha256(token.encode("utf-8")).hexdigest(),
            target_scope=assessment.target_scope,
            target_criteria=assessment.target_criteria,
            status="published",
            published_at=published_at,
        )
        db.add(assignment)
        links.append(
            {
                "candidate_id": member.user_subject,
                "candidate_email": member.email,
                "candidate_name": member.full_name,
                "token": token,
            }
        )
    assessment.status = "published"
    db.commit()
    return {
        "assessment_id": assessment.id,
        "status": assessment.status,
        "published_at": published_at.isoformat(),
        "assignments": links,
    }

