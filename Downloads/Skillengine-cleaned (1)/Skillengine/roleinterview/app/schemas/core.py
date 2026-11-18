from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MembershipInput(BaseModel):
    user_subject: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(default="", max_length=200)
    department: str | None = Field(default=None, max_length=120)
    year: str | None = Field(default=None, max_length=40)
    section: str | None = Field(default=None, max_length=80)


class InstitutionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class MembershipBatch(BaseModel):
    members: list[MembershipInput] = Field(min_length=1, max_length=5000)


class AssessmentQuestionInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    sequence: int = Field(ge=1)
    question_type: Literal["mcq", "coding"]
    prompt: str = Field(min_length=5, max_length=12000)
    marks: float = Field(default=1, gt=0, le=1000)
    public_data: dict = Field(default_factory=dict)
    answer_key: dict = Field(default_factory=dict)
    hidden_test_cases: list[dict] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_question_payload(self):
        if self.question_type == "mcq":
            options = self.public_data.get("options")
            correct_id = self.answer_key.get("correct_option_id")
            if not isinstance(options, list) or len(options) < 2:
                raise ValueError("MCQ questions require at least two public options.")
            if not correct_id or not any(
                isinstance(option, dict) and str(option.get("id")) == str(correct_id)
                for option in options
            ):
                raise ValueError("MCQ answer key must reference one of its public options.")
            if any(
                isinstance(option, dict)
                and ({"correct", "is_correct", "correct_answer"} & option.keys())
                for option in options
            ):
                raise ValueError("Correct-answer markers must not be included in public MCQ options.")
            if self.hidden_test_cases:
                raise ValueError("MCQ questions cannot include coding test cases.")
        else:
            if self.answer_key:
                raise ValueError("Coding answer keys must be stored as server-side test cases.")
            if not self.hidden_test_cases:
                raise ValueError("Coding questions require at least one server-side test case.")
            if {"answer_key", "hidden_test_cases", "test_cases"} & self.public_data.keys():
                raise ValueError("Private coding evaluation data must not be included in public_data.")
            if any(
                not isinstance(case, dict)
                or not isinstance(case.get("input"), str)
                or not isinstance(case.get("expected_output"), str)
                for case in self.hidden_test_cases
            ):
                raise ValueError("Coding test cases require string input and expected_output values.")
            sample_cases = self.public_data.get("sample_test_cases", [])
            if not isinstance(sample_cases, list) or any(
                not isinstance(case, dict)
                or case.get("hidden", False)
                or not isinstance(case.get("input", ""), str)
                or not isinstance(case.get("expected_output", ""), str)
                for case in sample_cases
            ):
                raise ValueError("Public sample test cases must be visible, valid input/output pairs.")
        return self


class AssessmentSectionInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=4000)
    sequence: int = Field(ge=1)
    section_type: Literal["mcq", "coding"]
    duration_seconds: int | None = Field(default=None, ge=1)
    questions: list[AssessmentQuestionInput] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_question_types(self):
        if any(question.question_type != self.section_type for question in self.questions):
            raise ValueError("Question type must match its section type.")
        return self


class AssessmentCreate(BaseModel):
    institution_id: str = Field(min_length=1, max_length=36)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=4000)
    instructions: str = Field(default="", max_length=12000)
    starts_at: datetime
    ends_at: datetime
    duration_seconds: int = Field(gt=0, le=86400)
    passing_percentage: float = Field(default=50, ge=0, le=100)
    max_attempts: int = Field(default=1, ge=1, le=10)
    target_scope: Literal["institution", "department", "year", "section", "individual"]
    target_criteria: dict = Field(default_factory=dict)
    sections: list[AssessmentSectionInput] = Field(min_length=2, max_length=20)

    @model_validator(mode="after")
    def validate_flow_inputs(self):
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("Assessment schedule must include a timezone.")
        if self.ends_at <= self.starts_at:
            raise ValueError("Assessment end time must be after its start time.")
        if {section.section_type for section in self.sections} != {"mcq", "coding"}:
            raise ValueError("An institution assessment requires both MCQ and coding sections.")
        if len({section.sequence for section in self.sections}) != len(self.sections):
            raise ValueError("Section sequence values must be unique.")
        if self.target_scope == "individual" and not self.target_criteria.get("candidate_ids"):
            raise ValueError("Individual targeting requires at least one candidate ID.")
        return self


class OtpVerify(BaseModel):
    otp: str = Field(pattern=r"^\d{6}$")


class McqAnswerInput(BaseModel):
    selected_option_id: str | None = Field(default=None, max_length=36)


class CodingSubmissionInput(BaseModel):
    source_code: str = Field(min_length=1, max_length=50000)
    language_id: int = Field(ge=1)
    mode: Literal["run", "submit"] = "run"
    stdin: str = Field(default="", max_length=20000)


class InterviewResponseInput(BaseModel):
    response: str = Field(min_length=1, max_length=20000)


class CareerSkillInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(default="technical", max_length=80)
    level: str | None = Field(default=None, max_length=40)


class CareerProfileConfirm(BaseModel):
    resume_profile: dict = Field(default_factory=dict)
    skills: list[CareerSkillInput] = Field(min_length=1, max_length=300)


class CareerRoleAnalysisRequest(BaseModel):
    role: str = Field(min_length=2, max_length=160)
    resume_text: str = Field(min_length=20, max_length=12000)


class CareerResumeInput(BaseModel):
    resume_text: str = Field(min_length=20, max_length=12000)


class CareerInterviewStart(BaseModel):
    role_analysis_id: str = Field(min_length=1, max_length=36)


class SubscriptionGrant(BaseModel):
    candidate_subject: str = Field(min_length=1, max_length=255)
    starts_at: datetime
    ends_at: datetime
    external_reference: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_period(self):
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("Subscription dates must include a timezone.")
        if self.ends_at <= self.starts_at:
            raise ValueError("Subscription end time must be after its start time.")
        return self


class LearningPlanGenerate(BaseModel):
    role_analysis_id: str = Field(min_length=1, max_length=36)
    weeks: int = Field(default=4, ge=1, le=12)


class LearningProgressInput(BaseModel):
    status: Literal["in_progress", "completed"]
    notes: str = Field(default="", max_length=2000)
