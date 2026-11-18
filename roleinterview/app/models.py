from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def new_id() -> str:
    return str(uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Institution(Base):
    __tablename__ = "core_institutions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_by_subject: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    memberships: Mapped[list["InstitutionMembership"]] = relationship(
        back_populates="institution", cascade="all, delete-orphan"
    )


class InstitutionMembership(Base):
    __tablename__ = "core_institution_memberships"
    __table_args__ = (
        UniqueConstraint("institution_id", "user_subject", name="uq_core_membership_subject"),
        Index("ix_core_membership_cohort", "institution_id", "department", "year", "section"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    institution_id: Mapped[str] = mapped_column(
        ForeignKey("core_institutions.id", ondelete="CASCADE"), nullable=False
    )
    user_subject: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    department: Mapped[str | None] = mapped_column(String(120))
    year: Mapped[str | None] = mapped_column(String(40))
    section: Mapped[str | None] = mapped_column(String(80))
    membership_role: Mapped[str] = mapped_column(String(40), nullable=False, default="candidate")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    institution: Mapped[Institution] = relationship(back_populates="memberships")


class Assessment(Base):
    __tablename__ = "core_assessments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    institution_id: Mapped[str] = mapped_column(
        ForeignKey("core_institutions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    created_by_subject: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    instructions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    passing_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=50.0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft", index=True)
    target_scope: Mapped[str] = mapped_column(String(24), nullable=False, default="individual")
    target_criteria: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    sections: Mapped[list["AssessmentSection"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan", order_by="AssessmentSection.sequence"
    )
    assignments: Mapped[list["AssessmentAssignment"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan"
    )


class AssessmentSection(Base):
    __tablename__ = "core_assessment_sections"
    __table_args__ = (UniqueConstraint("assessment_id", "sequence", name="uq_core_section_sequence"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    section_type: Mapped[str] = mapped_column(String(12), nullable=False)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    assessment: Mapped[Assessment] = relationship(back_populates="sections")
    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        back_populates="section", cascade="all, delete-orphan", order_by="AssessmentQuestion.sequence"
    )


class AssessmentQuestion(Base):
    __tablename__ = "core_assessment_questions"
    __table_args__ = (UniqueConstraint("section_id", "sequence", name="uq_core_question_sequence"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    section_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_sections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[str] = mapped_column(String(12), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    marks: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    public_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    answer_key: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    hidden_test_cases: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    section: Mapped[AssessmentSection] = relationship(back_populates="questions")


class AssessmentAssignment(Base):
    __tablename__ = "core_assessment_assignments"
    __table_args__ = (
        UniqueConstraint("assessment_id", "candidate_subject", name="uq_core_assignment_candidate"),
        Index("ix_core_assignment_email", "assessment_id", "candidate_email"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_subject: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_email: Mapped[str] = mapped_column(String(320), nullable=False)
    candidate_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    invite_token_hash: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    target_scope: Mapped[str] = mapped_column(String(24), nullable=False)
    target_criteria: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="assigned")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    assessment: Mapped[Assessment] = relationship(back_populates="assignments")
    attempts: Mapped[list["AssessmentAttempt"]] = relationship(
        back_populates="assignment", cascade="all, delete-orphan"
    )


class OtpChallenge(Base):
    __tablename__ = "core_otp_challenges"
    __table_args__ = (Index("ix_core_otp_assignment_created", "assignment_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    assignment_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_assignments.id", ondelete="CASCADE"), nullable=False
    )
    salt: Mapped[str] = mapped_column(String(32), nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class AssessmentAttempt(Base):
    __tablename__ = "core_assessment_attempts"
    __table_args__ = (UniqueConstraint("assignment_id", "attempt_number", name="uq_core_attempt_number"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    assignment_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_assignments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    session_token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="verified", index=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    score: Mapped[float | None] = mapped_column(Float)
    max_score: Mapped[float | None] = mapped_column(Float)
    percentage: Mapped[float | None] = mapped_column(Float)
    interview_eligible: Mapped[bool | None] = mapped_column(Boolean)
    assignment: Mapped[AssessmentAssignment] = relationship(back_populates="attempts")
    answers: Mapped[list["McqAnswer"]] = relationship(back_populates="attempt", cascade="all, delete-orphan")
    coding_submissions: Mapped[list["CodingSubmission"]] = relationship(back_populates="attempt", cascade="all, delete-orphan")


class McqAnswer(Base):
    __tablename__ = "core_mcq_answers"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id", name="uq_core_mcq_answer"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    attempt_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_questions.id", ondelete="RESTRICT"), nullable=False
    )
    selected_option_id: Mapped[str | None] = mapped_column(String(36))
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    attempt: Mapped[AssessmentAttempt] = relationship(back_populates="answers")


class CodingSubmission(Base):
    __tablename__ = "core_coding_submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    attempt_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_questions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    language_id: Mapped[int] = mapped_column(Integer, nullable=False)
    mode: Mapped[str] = mapped_column(String(12), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    passed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    details: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    attempt: Mapped[AssessmentAttempt] = relationship(back_populates="coding_submissions")


class AssessmentInterview(Base):
    __tablename__ = "core_assessment_interviews"
    __table_args__ = (UniqueConstraint("attempt_id", name="uq_core_interview_attempt"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessments.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    attempt_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_subject: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    questions: Mapped[list["AssessmentInterviewQuestion"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan", order_by="AssessmentInterviewQuestion.sequence"
    )


class AssessmentInterviewQuestion(Base):
    __tablename__ = "core_assessment_interview_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    interview_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    skill: Mapped[str] = mapped_column(String(160), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    interview: Mapped[AssessmentInterview] = relationship(back_populates="questions")
    response: Mapped["AssessmentInterviewResponse | None"] = relationship(
        back_populates="question", uselist=False, cascade="all, delete-orphan"
    )


class AssessmentInterviewResponse(Base):
    __tablename__ = "core_assessment_interview_responses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    question_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_interview_questions.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    evaluation: Mapped[dict | None] = mapped_column(JSON)
    score: Mapped[float | None] = mapped_column(Float)
    feedback: Mapped[str | None] = mapped_column(Text)
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    question: Mapped[AssessmentInterviewQuestion] = relationship(back_populates="response")


class AssessmentReport(Base):
    __tablename__ = "core_assessment_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    assessment_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessments.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    attempt_id: Mapped[str] = mapped_column(
        ForeignKey("core_assessment_attempts.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    candidate_subject: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    report_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class CareerReport(Base):
    __tablename__ = "core_career_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    profile_id: Mapped[str] = mapped_column(
        ForeignKey("core_career_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interview_id: Mapped[str] = mapped_column(
        ForeignKey("core_career_interviews.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    report_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class CareerProfile(Base):
    __tablename__ = "core_career_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    candidate_subject: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    resume_profile: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    skills: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    selected_role: Mapped[str | None] = mapped_column(String(160))
    confirmed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    analyses: Mapped[list["CareerRoleAnalysis"]] = relationship(back_populates="profile", cascade="all, delete-orphan")


class CareerRoleAnalysis(Base):
    __tablename__ = "core_career_role_analyses"
    __table_args__ = (UniqueConstraint("profile_id", "role", name="uq_core_career_role"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    profile_id: Mapped[str] = mapped_column(
        ForeignKey("core_career_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(160), nullable=False)
    required_skills: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    matching_skills: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    missing_skills: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    weak_skills: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    requirements_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    profile: Mapped[CareerProfile] = relationship(back_populates="analyses")


class CareerInterview(Base):
    __tablename__ = "core_career_interviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    profile_id: Mapped[str] = mapped_column(
        ForeignKey("core_career_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_analysis_id: Mapped[str] = mapped_column(
        ForeignKey("core_career_role_analyses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    role_analysis: Mapped[CareerRoleAnalysis] = relationship()
    questions: Mapped[list["CareerInterviewQuestion"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan", order_by="CareerInterviewQuestion.sequence"
    )


class CareerInterviewQuestion(Base):
    __tablename__ = "core_career_interview_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    interview_id: Mapped[str] = mapped_column(
        ForeignKey("core_career_interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    skill: Mapped[str] = mapped_column(String(160), nullable=False)
    concept: Mapped[str] = mapped_column(String(200), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    interview: Mapped[CareerInterview] = relationship(back_populates="questions")
    response: Mapped["CareerInterviewResponse | None"] = relationship(
        back_populates="question", uselist=False, cascade="all, delete-orphan"
    )


class CareerInterviewResponse(Base):
    __tablename__ = "core_career_interview_responses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    question_id: Mapped[str] = mapped_column(
        ForeignKey("core_career_interview_questions.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    response_text: Mapped[str] = mapped_column(Text, nullable=False)
    evaluation: Mapped[dict | None] = mapped_column(JSON)
    score: Mapped[float | None] = mapped_column(Float)
    feedback: Mapped[str | None] = mapped_column(Text)
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    question: Mapped[CareerInterviewQuestion] = relationship(back_populates="response")


class Subscription(Base):
    __tablename__ = "core_subscriptions"
    __table_args__ = (Index("ix_core_subscription_status", "candidate_subject", "status", "ends_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    candidate_subject: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    granted_by_subject: Mapped[str] = mapped_column(String(255), nullable=False)
    external_reference: Mapped[str | None] = mapped_column(String(255))


class LearningPlan(Base):
    __tablename__ = "core_learning_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    profile_id: Mapped[str] = mapped_column(
        ForeignKey("core_career_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_analysis_id: Mapped[str] = mapped_column(
        ForeignKey("core_career_role_analyses.id", ondelete="RESTRICT"), nullable=False
    )
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    weeks: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    items: Mapped[list["LearningPlanItem"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", order_by="LearningPlanItem.week_number"
    )


class LearningPlanItem(Base):
    __tablename__ = "core_learning_plan_items"
    __table_args__ = (UniqueConstraint("plan_id", "week_number", "skill", name="uq_core_plan_skill_week"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    plan_id: Mapped[str] = mapped_column(
        ForeignKey("core_learning_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    skill: Mapped[str] = mapped_column(String(160), nullable=False)
    focus: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    plan: Mapped[LearningPlan] = relationship(back_populates="items")


class LearningProgress(Base):
    __tablename__ = "core_learning_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    item_id: Mapped[str] = mapped_column(
        ForeignKey("core_learning_plan_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_subject: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
