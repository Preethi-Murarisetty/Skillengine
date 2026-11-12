import json
import logging
import re

import requests

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:1.5b"

# Ollama ki response generate cheyyadaniki extra time ivvadam.
CONNECT_TIMEOUT = 10
READ_TIMEOUT = 180


def _extract_json(raw: str) -> dict:
    """Parse a JSON object from the Ollama response."""
    raw = raw.strip()

    try:
        result = json.loads(raw)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    # Response lo JSON mundu/tarvata extra text unte extract cheyyadam.
    match = re.search(r"\{.*\}", raw, flags=re.DOTALL)

    if not match:
        raise ValueError(
            "Topic discovery returned invalid JSON."
        )

    try:
        result = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise ValueError(
            "Could not parse discovered topics."
        ) from exc

    if not isinstance(result, dict):
        raise ValueError(
            "Topic discovery must return a JSON object."
        )

    return result


def discover_topics(role: str, skill: str) -> dict:
    """
    Discover interview subtopics for one resume-supported skill.
    Does not discover or replace the candidate's skill list.
    """
    role = str(role or "").strip()
    skill = str(skill or "").strip()

    if not role or not skill:
        raise ValueError("Role and skill are required.")

    prompt = f"""
Create relevant interview subtopics for this role and skill.

Role: {role}
Skill: {skill}

Return ONLY valid JSON in this format:
{{
  "skill": "{skill}",
  "topics": [
    {{
      "topic": "Topic name",
      "description": "Short explanation of the topic"
    }}
  ]
}}

Rules:
- Generate 5 to 8 distinct, relevant subtopics.
- Cover fundamentals and important advanced concepts.
- For programming languages, include fundamentals, control flow,
  data structures, functions, error handling and OOP where applicable.
- Do not repeat the same topic.
- Do not generate interview questions.
- Do not invent unrelated technologies.
- Keep descriptions short.
- Return JSON only.
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.1,
                    "num_predict": 700,
                },
            },
            timeout=(CONNECT_TIMEOUT, READ_TIMEOUT),
        )

        response.raise_for_status()
        payload = response.json()

    except requests.exceptions.ConnectTimeout as exc:
        logger.exception(
            "Connection to Ollama timed out for skill: %s",
            skill,
        )
        raise RuntimeError(
            "Could not connect to Ollama. "
            "Check whether Ollama is running at localhost:11434."
        ) from exc

    except requests.exceptions.ReadTimeout as exc:
        logger.exception(
            "Ollama response timed out for skill: %s",
            skill,
        )
        raise RuntimeError(
            f"Ollama took longer than {READ_TIMEOUT} seconds "
            f"to generate topics for '{skill}'. "
            "Try again or check Ollama model performance."
        ) from exc

    except requests.RequestException as exc:
        logger.exception(
            "Ollama topic discovery failed for skill: %s",
            skill,
        )
        raise RuntimeError(
            "Ollama topic discovery request failed. "
            "Check that Ollama is running and the model is available."
        ) from exc

    except (ValueError, json.JSONDecodeError) as exc:
        logger.exception(
            "Invalid response from Ollama for skill: %s",
            skill,
        )
        raise RuntimeError(
            "Ollama returned an invalid response."
        ) from exc

    raw = payload.get("response", "")

    if not isinstance(raw, str) or not raw.strip():
        raise RuntimeError(
            "Ollama returned an empty topic-discovery response."
        )

    result = _extract_json(raw)
    raw_topics = result.get("topics")

    if not isinstance(raw_topics, list):
        raise ValueError(
            "Topic discovery did not return a topics list."
        )

    topics = []
    seen = set()

    for item in raw_topics:
        if isinstance(item, str):
            name = item.strip()
            description = ""

        elif isinstance(item, dict):
            name = str(
                item.get("topic") or item.get("name") or ""
            ).strip()

            description = str(
                item.get("description") or ""
            ).strip()

        else:
            continue

        key = name.casefold()

        if not name or key in seen:
            continue

        seen.add(key)

        topics.append({
            "topic": name[:200],
            "description": description[:500],
        })

    if not topics:
        raise ValueError(
            f"No valid topics were discovered for skill: {skill}."
        )

    return {
        "skill": skill,
        "topics": topics,
        "topic_count": len(topics),
    }
