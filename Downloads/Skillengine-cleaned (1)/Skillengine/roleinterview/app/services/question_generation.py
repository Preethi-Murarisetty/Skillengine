import json
import re
import requests


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:1.5b"

QUESTION_COUNT = 10
DIFFICULTY = "Medium"
MAX_ATTEMPTS = 5
REQUEST_TIMEOUT = 180


def _call_ollama(prompt: str) -> str:
    """Generate a JSON response from Ollama."""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.4,
        },
    }

    try:
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()

    except requests.RequestException as exc:
        raise RuntimeError(
            "Could not connect to Ollama. "
            "Check whether Ollama is running."
        ) from exc

    except ValueError as exc:
        raise RuntimeError(
            "Ollama returned an invalid response."
        ) from exc

    result = data.get("response", "")

    if not isinstance(result, str) or not result.strip():
        raise RuntimeError("Ollama returned an empty response.")

    return result.strip()


def _parse_json(raw_text: str) -> dict:
    """Parse JSON returned by Ollama."""

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)

        if not match:
            raise ValueError("The model did not return valid JSON.")

        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise ValueError("The model response must be a JSON object.")

    return parsed


def _normalize_question(question: str) -> str:
    """Normalize questions for duplicate detection."""

    question = question.lower()
    question = re.sub(r"[^a-z0-9]+", " ", question)

    return " ".join(question.split())


def _extract_questions(parsed: dict) -> list[str]:
    """Extract valid question strings."""

    raw_questions = parsed.get("questions", [])

    if not isinstance(raw_questions, list):
        return []

    questions = []

    for item in raw_questions:
        if isinstance(item, str):
            question = item.strip()
        elif isinstance(item, dict):
            question = str(item.get("question", "")).strip()
        else:
            continue

        question = re.sub(r"^\s*\d+[\.\)\-:]\s*", "", question)
        question = question.strip().strip('"').strip()

        if len(question) < 20:
            continue

        if not question.endswith(("?", ".", "!")):
            question += "?"

        questions.append(question)

    return questions


def _generate_ten_medium_questions(
    role: str,
    skill: str,
    concept: str,
) -> list[dict]:
    """Generate up to ten distinct Medium-level questions."""

    accepted_questions = []
    seen_questions = set()

    for attempt in range(1, MAX_ATTEMPTS + 1):
        remaining = QUESTION_COUNT - len(accepted_questions)

        if remaining <= 0:
            break

        existing_questions = [
            item["question"] for item in accepted_questions
        ]

        existing_text = (
            "\n".join(f"- {q}" for q in existing_questions)
            if existing_questions
            else "None"
        )

        prompt = f"""
You are an experienced technical interviewer.

Generate exactly {remaining} NEW interview questions.

Role: {role}
Skill: {skill}
Concept: {concept}
Difficulty: Medium

Already generated questions. Do not repeat or rephrase them:
{existing_text}

Rules:
1. Return valid JSON only:
   {{"questions": ["Question one?", "Question two?"]}}
2. Generate {remaining} different questions.
3. Every question must relate to the specified role, skill, and concept.
4. Use practical scenarios, implementation decisions,
   troubleshooting, and problem-solving.
5. Questions must be appropriate for Medium difficulty.
6. Each question must be clear and independently answerable.
7. Do not include answers, hints, explanations, or numbering.
8. Do not repeat any existing question.
9. Do not generate multiple versions of the same question.
10. Return only the JSON object.

Generate {remaining} new questions now.
"""

        try:
            raw_response = _call_ollama(prompt)
            parsed = _parse_json(raw_response)
            candidates = _extract_questions(parsed)

        except (ValueError, RuntimeError) as exc:
            print(
                f"[Question Generation] Attempt {attempt} failed: {exc}"
            )
            continue

        for question in candidates:
            normalized = _normalize_question(question)

            if not normalized or normalized in seen_questions:
                continue

            seen_questions.add(normalized)

            accepted_questions.append({
                "skill": skill,
                "concept": concept,
                "difficulty": DIFFICULTY,
                "question": question,
            })

            if len(accepted_questions) >= QUESTION_COUNT:
                break

        print(
            f"[Question Generation] Skill={skill}, "
            f"Attempt={attempt}/{MAX_ATTEMPTS}, "
            f"Valid questions={len(accepted_questions)}/"
            f"{QUESTION_COUNT}"
        )

    if len(accepted_questions) < QUESTION_COUNT:
        print(
            f"[Question Generation] Returning "
            f"{len(accepted_questions)} valid questions for "
            f"{skill}, instead of failing with 503."
        )

    return accepted_questions[:QUESTION_COUNT]


def generate_concept_questions(
    role: str,
    skill: str,
    concept: str,
) -> dict:
    """Generate questions for one skill and concept."""

    questions = _generate_ten_medium_questions(
        role=role,
        skill=skill,
        concept=concept,
    )

    if not questions:
        raise RuntimeError(
            f"No valid questions could be generated for {skill}."
        )

    return {
        "skill": skill,
        "concept": concept,
        "questions": questions,
        "question_count": len(questions),
    }


def generate_questions_for_skill(
    role: str,
    skill_area: str,
) -> dict:
    """Maintain compatibility with the existing skill endpoint."""

    result = generate_concept_questions(
        role=role,
        skill=skill_area,
        concept=skill_area,
    )

    return {
        "skill": skill_area,
        "concept_count": 1,
        "question_count": result["question_count"],
        "questions": [
            {
                "concept": skill_area,
                "questions": result["questions"],
            }
        ],
    }
