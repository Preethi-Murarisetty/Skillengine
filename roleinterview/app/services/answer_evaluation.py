import json
import re
from typing import Any

import requests


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:1.5b"   # better results: "qwen2.5:3b" or "qwen2.5:7b"
MAX_ATTEMPTS = 3
REQUEST_TIMEOUT = 120

SCORE_LIMITS = {
    "correctness": 4,
    "relevance": 2,
    "completeness": 2,
    "explanation": 2,
}

CORRECTNESS_LEVELS = {
    "fully_correct": 4,
    "mostly_correct": 3,
    "partly_correct": 2,
    "minimal_correct": 1,
    "incorrect": 0,
}


def _result(
    role: str,
    skill: str,
    concept: str,
    difficulty: str,
    question: str,
    answer: str,
    correctness: int,
    relevance: int,
    completeness: int,
    explanation: int,
    feedback: str,
    strengths: list[str] | None = None,
    improvements: list[str] | None = None,
    evaluation_error: bool = False,
) -> dict[str, Any]:
    scores = {
        "correctness": max(0, min(4, int(correctness))),
        "relevance": max(0, min(2, int(relevance))),
        "completeness": max(0, min(2, int(completeness))),
        "explanation": max(0, min(2, int(explanation))),
    }

    result = {
        "role": role,
        "skill": skill,
        "concept": concept,
        "difficulty": difficulty,
        "question": question,
        "answer": answer,
        "marks_awarded": sum(scores.values()),
        "total_marks": 10,
        "is_relevant": scores["relevance"] > 0,
        "criteria": scores,
        "feedback": feedback,
        "strengths": strengths or [],
        "improvements": improvements or [],
    }

    if evaluation_error:
        result["evaluation_error"] = True

    return result


def _parse_json(raw: str) -> dict[str, Any] | None:
    if not isinstance(raw, str) or not raw.strip():
        return None

    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.I)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()

    for index, char in enumerate(raw):
        if char != "{":
            continue

        try:
            data, _ = decoder.raw_decode(raw[index:])
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            continue

    return None


def _clean_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [
            str(item).strip()
            for item in value
            if item is not None and str(item).strip()
        ][:5]

    if isinstance(value, str) and value.strip():
        return [value.strip()]

    return []


def _normalize_text(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^\w\s]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def _content_words(value: str) -> set[str]:
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "to",
        "of", "and", "or", "in", "on", "for", "with", "how", "what",
        "why", "does", "do", "it", "this", "that", "from", "by",
        "explain", "describe", "discuss", "provide", "give", "show",
        "your", "their", "answer", "correctly", "can", "could",
        "would", "should", "difference", "between",
    }

    return {
        word
        for word in re.findall(r"[a-z0-9]+", value.lower())
        if word not in stop_words and len(word) > 2
    }


def _has_example(answer: str) -> bool:
    """
    Heuristic detection for concrete examples.

    This supports code examples and common explanatory examples.
    It is not a substitute for semantic understanding.
    """
    patterns = [
        r"```",
        r"`[^`]+`",
        r"\w+\s*=\s*[^=]",
        r"\bfor\s+\w+\s+in\b",
        r"\bfor example\b",
        r"\bfor instance\b",
        r"\bsuch as\b",
        r"\be\.g\.",
        r"\ban example is\b",
        r"\bimagine\b",
        r"\bsuppose\b",
        r"\bconsider\b",
        r"\bexample:\s*",
    ]

    return any(
        re.search(pattern, answer, flags=re.I)
        for pattern in patterns
    )


def _to_level(value: Any, low: int, high: int) -> int | None:
    """Convert a model-provided level to an int within [low, high]."""
    try:
        level = int(value)
    except (TypeError, ValueError):
        return None

    if level < low or level > high:
        return None

    return level


def _call_ollama(prompt: str) -> str:
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0,
                "num_predict": 1200,
            },
        },
        timeout=REQUEST_TIMEOUT,
    )

    response.raise_for_status()

    content = response.json().get("response", "")

    if not isinstance(content, str) or not content.strip():
        raise ValueError("Ollama returned an empty response.")

    return content.strip()


def _build_prompt(
    role: str,
    skill: str,
    concept: str,
    difficulty: str,
    question: str,
    answer: str,
    retry_feedback: str = "",
) -> str:
    # NOTE: The JSON template below uses placeholders only.
    # Small models copy concrete example values (e.g. "mostly_correct"),
    # which made every answer score the same. Never put real values here.
    return f"""
You are a strict, fair and accurate interview answer evaluator.

The question may belong to ANY profession or subject.
Evaluate the actual meaning of the answer, not just its length
or the presence of keywords.

ROLE: {role or "Not specified"}
SKILL: {skill or "Not specified"}
TOPIC: {concept or "Not specified"}
DIFFICULTY: {difficulty or "Medium"}

QUESTION:
{question}

CANDIDATE ANSWER:
{answer}

STEP 1: IDENTIFY REQUIREMENTS

Identify 2 to 5 distinct requirements based on the question.

Rules:
- Each requirement must cover ONE thing only.
- Do not combine a definition, comparison, example, or explanation
  into a single requirement when they can be assessed separately.
- If an example is requested, make providing an example a separate
  requirement.
- If a comparison is requested, make the comparison a separate
  requirement.
- Do not add requirements that the question does not request.
- Mark addressed=true only when the answer actually addresses it
  correctly.
- Evidence must be an exact quotation copied from the answer.
- For a missing requirement, use addressed=false and evidence="".
- Do not invent evidence.

STEP 2: CORRECTNESS

First write one sentence of reasoning in "correctness_reasoning":
what is right and what is wrong in the answer.
Then choose exactly one correctness_level:
- fully_correct: accurate, demonstrates strong understanding.
- mostly_correct: generally accurate with minor errors.
- partly_correct: some correct understanding but significant errors.
- minimal_correct: only a small amount of correct understanding.
- incorrect: wrong, or no meaningful correct understanding.

Important:
Do NOT default to "mostly_correct". Pick the level that truly fits.
Missing details affect completeness, not automatically correctness.
A brief but factually correct statement may still be correct.
Do not call an answer incorrect merely because it is short.

STEP 3: RELEVANCE

relevance_level (integer):
- 2: directly addresses the question, even if incomplete.
- 1: only loosely or partially related.
- 0: unrelated or contains no meaningful response.

STEP 4: EXPLANATION

explanation_level (integer):
- 2: clear explanation or reasoning appropriate to the question.
- 1: a basic but meaningful explanation.
- 0: no meaningful explanation (just a keyword or one-line statement).

Do not require code unless the question explicitly asks for code.

STEP 5: FEEDBACK

- State only what the candidate actually demonstrated.
- Identify requested parts that are missing.
- Do not claim an example or comparison is missing when it is present.
- Accept correct synonyms and alternative approaches.
- Separate factual accuracy from completeness.
- Do not reward verbosity by itself.

{retry_feedback}

Return ONLY valid JSON with exactly these keys. Fill in the values
based on your own assessment (the values below are blank on purpose):
{{
  "requirements": [
    {{"requirement": "", "addressed": false, "evidence": ""}},
    {{"requirement": "", "addressed": false, "evidence": ""}}
  ],
  "correctness_reasoning": "",
  "correctness_level": "",
  "relevance_level": 0,
  "explanation_level": 0,
  "feedback": "",
  "strengths": [],
  "improvements": []
}}
Rules for the JSON:
- "addressed" must be the JSON value true or false (no quotes).
- "correctness_level" must be exactly one of: fully_correct, mostly_correct,
  partly_correct, minimal_correct, incorrect.
- "relevance_level" and "explanation_level" must be the numbers 0, 1 or 2.
""".strip()


def _to_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        v = value.strip().lower()
        if v in ("true", "yes", "y", "1"):
            return True
        if v in ("false", "no", "n", "0", ""):
            return False
    return None


def _parse_correctness(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    v = value.strip().lower().replace(" ", "_").replace("-", "_")

    if v in CORRECTNESS_LEVELS:
        return v

    matches = [key for key in CORRECTNESS_LEVELS if key in v]
    return matches[0] if len(matches) == 1 else None


def _evidence_in_answer(evidence: str, answer_normalized: str) -> bool:
    """Exact match, or near-exact (>= 80% of evidence words in answer)."""
    evidence_normalized = _normalize_text(evidence)

    if not evidence_normalized:
        return False

    if evidence_normalized in answer_normalized:
        return True

    words = evidence_normalized.split()
    if len(words) < 3:
        return False

    answer_set = set(answer_normalized.split())
    hits = sum(1 for w in words if w in answer_set)
    return hits / len(words) >= 0.8


DEBUG = False  # set True to print how each requirement was verified


def _stem(word: str) -> str:
    for suffix in ("ing", "ed", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


def _stem_set(text: str) -> set[str]:
    return {_stem(w) for w in _content_words(text)}


def _overlap_support(
    requirement: str,
    evidence: str,
    answer: str,
    question: str,
) -> float:
    """
    Fraction of the requirement's answer-specific words that appear in the
    answer. Words that already appear in the question are ignored so an
    answer cannot earn credit by just repeating the question.
    """
    wanted = _stem_set(f"{requirement} {evidence}") - _stem_set(question)

    if len(wanted) < 2:
        wanted = _stem_set(f"{requirement} {evidence}")

    if not wanted:
        return 0.0

    answer_stems = _stem_set(answer)
    return len(wanted & answer_stems) / len(wanted)


def _validate_evaluation(
    parsed: dict[str, Any] | None,
    answer: str,
    question: str = "",
    concept: str = "",
) -> tuple[dict[str, int], str, list[str], list[str]] | None:
    if not isinstance(parsed, dict):
        return None

    requirements = parsed.get("requirements")
    if not isinstance(requirements, list):
        return None

    answer_normalized = _normalize_text(answer)
    valid_requirements = []

    for item in requirements[:5]:
        if not isinstance(item, dict):
            continue

        requirement = item.get("requirement")
        addressed = _to_bool(item.get("addressed"))
        evidence = item.get("evidence", "")

        if not isinstance(requirement, str) or not requirement.strip():
            continue  # blank / unfilled template row

        if addressed is None:
            continue

        if not isinstance(evidence, str):
            evidence = ""

        requirement = requirement.strip()
        evidence_exists = _evidence_in_answer(evidence, answer_normalized)
        support = _overlap_support(requirement, evidence, answer, question)

        requirement_lower = requirement.lower()
        is_example_requirement = any(
            word in requirement_lower
            for word in ("example", "illustration", "sample", "instance")
        )

        # Small models often mark addressed=false or paraphrase the quote
        # even when the answer clearly covers the requirement, so the
        # answer text itself is also checked (word overlap).
        if addressed and (evidence_exists or support >= 0.6):
            evidence_verified = True
        elif support >= 0.85:
            evidence_verified = True
        else:
            evidence_verified = False

        if is_example_requirement:
            evidence_verified = evidence_verified and _has_example(answer)

        if DEBUG:
            print(
                f"[REQ] {requirement!r} model_addressed={addressed} "
                f"quote_found={evidence_exists} support={support:.2f} "
                f"-> verified={evidence_verified}"
            )

        valid_requirements.append({
            "requirement": requirement,
            "addressed": evidence_verified,
        })

    # Accept 1+ requirements (small models often return only one).
    if not valid_requirements:
        return None

    total = len(valid_requirements)
    covered_items = [i for i in valid_requirements if i["addressed"]]
    missing_items = [i for i in valid_requirements if not i["addressed"]]

    covered = len(covered_items)
    coverage = covered / total

    # ---- Model-provided levels, with fallback derived from coverage ----
    level_key = _parse_correctness(parsed.get("correctness_level"))

    if level_key is not None:
        model_correctness = CORRECTNESS_LEVELS[level_key]
    elif covered == 0:
        model_correctness = 0
    elif coverage >= 0.8:
        model_correctness = 3
    elif coverage >= 0.5:
        model_correctness = 2
    else:
        model_correctness = 1

    model_relevance = _to_level(parsed.get("relevance_level"), 0, 2)
    if model_relevance is None:
        model_relevance = 2 if covered > 0 else 1

    model_explanation = _to_level(parsed.get("explanation_level"), 0, 2)
    if model_explanation is None:
        model_explanation = (
            2 if coverage >= 0.8 else 1 if covered > 0 else 0
        )

    # ---- Completeness: purely from verified coverage ----
    if covered == 0:
        completeness = 0
    elif coverage >= 0.8:
        completeness = 2
    elif coverage >= 0.4:
        completeness = 1
    else:
        completeness = 0

    # ---- Correctness: model's level, capped by verified coverage ----
    correctness = model_correctness
    if covered == 0:
        correctness = min(correctness, 1)
    elif coverage < 0.5:
        correctness = min(correctness, 2)
    elif coverage < 0.8:
        correctness = min(correctness, 3)

    # ---- Relevance: model's level, sanity-checked ----
    relevance = model_relevance
    if covered > 0 and relevance == 0:
        relevance = 1

    topic_words = _content_words(question + " " + concept)
    answer_words = _content_words(answer)
    has_overlap = bool(topic_words & answer_words)

    if covered == 0:
        relevance = min(relevance, 1)
        if not has_overlap:
            relevance = 0
    elif not has_overlap:
        relevance = min(relevance, 1)

    # ---- Explanation: model's level, capped ----
    explanation = model_explanation
    if covered == 0:
        explanation = 0
    elif coverage < 0.5:
        explanation = min(explanation, 1)

    if len(answer.split()) < 8:
        explanation = min(explanation, 1)

    # ---- Depth caps: a 10/10 needs a substantial, well-structured answer ----
    words_count = len(answer.split())
    sentence_count = len([
        s for s in re.split(r"[.!?\n]+", answer) if len(s.split()) >= 3
    ])

    if words_count < 10:
        correctness = min(correctness, 1)
        completeness = min(completeness, 1)
        explanation = 0
    elif words_count < 20:
        correctness = min(correctness, 2)
        completeness = min(completeness, 1)
        explanation = min(explanation, 1)
    elif words_count < 40:
        correctness = min(correctness, 3)
        explanation = min(explanation, 1)

    # Full correctness marks need depth: 50+ words AND (example or 4+ sentences)
    if correctness >= 4 and not (
        words_count >= 50 and (_has_example(answer) or sentence_count >= 4)
    ):
        correctness = 3

    # Full explanation marks need a multi-sentence explanation
    if explanation >= 2 and sentence_count < 3:
        explanation = 1

    strengths = [
        f"Addressed: {item['requirement']}" for item in covered_items
    ][:5]

    improvements = [
        f"Still needed: {item['requirement']}" for item in missing_items
    ][:5]

    for extra in _clean_list(parsed.get("improvements")):
        if len(improvements) >= 5:
            break
        if extra not in improvements:
            improvements.append(extra)

    model_feedback = parsed.get("feedback")
    model_feedback = (
        model_feedback.strip()[:400]
        if isinstance(model_feedback, str)
        else ""
    )

    if covered == 0:
        summary = (
            "No requirement could be verified from the answer. "
            "Address the question's main points."
        )
    elif missing_items:
        summary = f"The answer addresses {covered} of {total} requirements."
    else:
        summary = f"The answer addresses all {total} requirements."

    feedback = f"{summary} {model_feedback}".strip()

    scores = {
        "correctness": correctness,
        "relevance": relevance,
        "completeness": completeness,
        "explanation": explanation,
    }

    return scores, feedback, strengths, improvements


def evaluate_answer(
    role: str = "",
    skill: str = "",
    concept: str = "",
    difficulty: str = "Medium",
    question: str = "",
    answer: str = "",
    **kwargs: Any,
) -> dict[str, Any]:
    answer = answer or str(
        kwargs.get("candidate_answer", kwargs.get("user_answer", ""))
    )
    question = question or str(kwargs.get("current_question", ""))
    skill = skill or str(kwargs.get("current_skill", ""))
    concept = concept or str(kwargs.get("topic", ""))
    role = role or str(kwargs.get("job_role", ""))

    answer = answer.strip()
    question = question.strip()

    if not question:
        return _result(
            role, skill, concept, difficulty, question, answer,
            0, 0, 0, 0,
            "The question is missing, so evaluation cannot be performed.",
            improvements=["Provide the interview question."],
        )

    if not answer:
        return _result(
            role, skill, concept, difficulty, question, answer,
            0, 0, 0, 0,
            "No answer was provided.",
            improvements=["Provide an answer to the question."],
        )

    last_error = "The model did not return a valid evaluation."

    for attempt in range(MAX_ATTEMPTS):
        retry_feedback = ""

        if attempt > 0:
            retry_feedback = (
                "Your previous response failed validation. Return at "
                "least two distinct requirements. Separate examples "
                "and comparisons from definitions. Evidence must be "
                "copied exactly from the answer. relevance_level and "
                "explanation_level must be integers 0, 1 or 2. "
                "Return valid JSON."
            )

        prompt = _build_prompt(
            role=role,
            skill=skill,
            concept=concept,
            difficulty=difficulty,
            question=question,
            answer=answer,
            retry_feedback=retry_feedback,
        )

        try:
            raw = _call_ollama(prompt)
            parsed = _parse_json(raw)
            validated = _validate_evaluation(
                parsed, answer, question=question, concept=concept
            )

            if validated is None:
                print("INVALID OLLAMA EVALUATION:", repr(raw))
                last_error = (
                    "The model returned an evaluation that failed "
                    "JSON, score, or evidence validation."
                )
                continue

            scores, feedback, strengths, improvements = validated

            return _result(
                role=role,
                skill=skill,
                concept=concept,
                difficulty=difficulty,
                question=question,
                answer=answer,
                correctness=scores["correctness"],
                relevance=scores["relevance"],
                completeness=scores["completeness"],
                explanation=scores["explanation"],
                feedback=feedback,
                strengths=strengths,
                improvements=improvements,
            )

        except (requests.RequestException, ValueError, TypeError) as exc:
            last_error = f"Evaluation request failed: {exc}"
            print(last_error)

    return {
        "role": role,
        "skill": skill,
        "concept": concept,
        "difficulty": difficulty,
        "question": question,
        "answer": answer,
        "marks_awarded": None,
        "total_marks": 10,
        "is_relevant": None,
        "criteria": None,
        "feedback": (
            "Evaluation could not be completed reliably. " + last_error
        ),
        "strengths": [],
        "improvements": [
            "Check that Ollama is running.",
            f"Check that the '{OLLAMA_MODEL}' model is available.",
            "Retry the evaluation.",
        ],
        "evaluation_error": True,
    }