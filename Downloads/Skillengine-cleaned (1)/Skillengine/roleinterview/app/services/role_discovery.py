
import json
import re
import socket
import hashlib
from pathlib import Path
import urllib.error
import urllib.request


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:1.5b"

MAX_RESUME_CHARS = 12000
MAX_ROLES = 5
MAX_ATTEMPTS = 2

# Persistent cache: survives backend restarts.
CACHE_FILE = Path(__file__).resolve().parent / "role_discovery_cache.json"


SKILL_ALIASES = {
    "python": ["python", "python programming"],
    "sql": ["sql", "structured query language"],
    "power bi": ["power bi", "powerbi"],
    "machine learning": ["machine learning", "ml"],
    "data analysis": ["data analysis", "data analytics"],
    "data analytics": ["data analytics", "data analysis"],
    "data analyst": ["data analyst"],
    "data visualization": ["data visualization", "data visualisation"],
    "data cleaning": ["data cleaning", "data cleansing"],
    "data preprocessing": ["data preprocessing", "data pre-processing"],
    "pandas": ["pandas"],
    "numpy": ["numpy"],
    "matplotlib": ["matplotlib"],
    "excel": ["excel", "microsoft excel", "ms excel"],
    "javascript": ["javascript", "java script"],
    "react": ["react", "react.js", "reactjs"],
    "node.js": ["node.js", "nodejs", "node js"],
    "git": ["git", "github"],
    "html": ["html", "html5"],
    "css": ["css", "css3"],
    "r": ["r programming", "programming in r", "r language"],
    "tableau": ["tableau"],
    "hadoop": ["hadoop"],
    "jira": ["jira"],
    "trello": ["trello"],
    "selenium": ["selenium"],
    "jenkins": ["jenkins"],
    "tcp/ip": ["tcp/ip", "tcp ip"],
    "network security": ["network security"],
    "power query": ["power query"],
    "dax": ["dax"],
    "data modeling": ["data modeling", "data modelling"],
    "deep learning": ["deep learning"],
    "computer vision": ["computer vision"],
    "image processing": ["image processing"],
    "yolo": ["yolo"],
    "cnn": ["cnn", "convolutional neural network"],
    "statistics": ["statistics", "statistical analysis"],
    "statistical analysis": ["statistical analysis", "statistics"],
    "vlookup": ["vlookup"],
    "xlookup": ["xlookup"],
    "oop": [
        "oop",
        "object oriented programming",
        "object-oriented programming",
    ],
    "c++": ["c++"],
    "c#": ["c#"],
    "java": ["java"],
    "typescript": ["typescript"],
    "fastapi": ["fastapi"],
    "flask": ["flask"],
    "django": ["django"],
    "streamlit": ["streamlit"],
    "tensorflow": ["tensorflow"],
    "pytorch": ["pytorch"],
    "scikit-learn": ["scikit-learn", "sklearn"],
    "opencv": ["opencv", "open cv"],
    "mongodb": ["mongodb", "mongo db"],
    "mysql": ["mysql"],
    "postgresql": ["postgresql", "postgres"],
    "sqlite": ["sqlite"],
    "aws": ["aws", "amazon web services"],
    "azure": ["azure", "microsoft azure"],
    "docker": ["docker"],
    "kubernetes": ["kubernetes", "k8s"],
    "linux": ["linux"],
    "gitlab": ["gitlab"],
    "powerpoint": ["powerpoint", "power point", "ms powerpoint"],
}


def normalize_text(text: str) -> str:
    """Normalize whitespace and common PDF text formatting."""
    text = str(text or "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    text = re.sub(
        r"(?<=\w)-[ \t]*\n[ \t]*(?=\w)",
        "",
        text,
    )

    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)

    return text.strip().casefold()


def _phrase_present(phrase: str, text: str) -> bool:
    """Match a phrase without matching it inside a larger word."""
    phrase = normalize_text(phrase)
    text = normalize_text(text)

    if not phrase or not text:
        return False

    pattern = r"(?<!\w)" + re.escape(phrase) + r"(?!\w)"
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def skill_is_in_resume(skill: str, resume_text: str) -> bool:
    """Return True only if the skill or one of its aliases is present."""
    if not isinstance(skill, str) or not skill.strip():
        return False

    normalized_skill = normalize_text(skill)
    normalized_resume = normalize_text(resume_text)

    aliases = SKILL_ALIASES.get(
        normalized_skill,
        [normalized_skill],
    )

    return any(
        _phrase_present(alias, normalized_resume)
        for alias in aliases
    )


def clean_skill_list(
    skills,
    resume_text: str,
    must_be_present: bool,
) -> list[str]:
    """Validate, deduplicate, and optionally check resume evidence."""
    if not isinstance(skills, list):
        return []

    cleaned = []
    seen = set()

    for skill in skills:
        if not isinstance(skill, str):
            continue

        skill = re.sub(r"\s+", " ", skill).strip(" \t\r\n.,;:")

        if not skill or len(skill) > 100:
            continue

        key = normalize_text(skill)

        if key in seen:
            continue

        if key in {
            "none",
            "n/a",
            "na",
            "not applicable",
            "no additional skills needed",
            "not mentioned",
            "unknown",
        }:
            continue

        present = skill_is_in_resume(skill, resume_text)

        if must_be_present and not present:
            continue

        if not must_be_present and present:
            continue

        seen.add(key)
        cleaned.append(skill)

    return cleaned


def build_prompt(resume_text: str, retry: bool = False) -> str:
    retry_instruction = ""

    if retry:
        retry_instruction = """
IMPORTANT RETRY:
Re-read the resume and return corrected JSON.
Use only explicitly mentioned resume skills as supporting_skills.
Do not invent supporting skills.
A role may have one confirmed supporting skill.
Prefer roles supported by multiple skills.
"""

    return f"""
You are an evidence-based career analyst.

Discover up to {MAX_ROLES} suitable job roles from this resume.

Rules:
1. Derive job titles dynamically from the resume.
2. Recommend realistic entry-level or early-career roles when appropriate.
3. Consider actual skills, projects, education, and experience.
4. supporting_skills must be explicitly mentioned in the resume.
5. additional_skills_to_check must contain relevant skills not confirmed.
6. Do not put confirmed resume skills in additional_skills_to_check.
7. Do not invent qualifications, experience, tools, or achievements.
8. Return distinct job titles, not minor variations of one title.
9. Do not recommend unrelated roles to fill the list.
10. Explain each role using resume evidence.
11. Return valid JSON only, without Markdown.
12. Return fewer roles if the resume supports fewer roles.

Required JSON:
{{
  "roles": [
    {{
      "role": "Job title",
      "reason": "Explanation based on resume evidence",
      "supporting_skills": ["Python", "SQL"],
      "additional_skills_to_check": ["Relevant unconfirmed skill"]
    }}
  ]
}}

{retry_instruction}

RESUME:
{resume_text}
"""


def call_ollama(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "num_predict": 1800,
        },
    }

    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))

    except socket.timeout as exc:
        raise RuntimeError(
            "Ollama timed out while discovering roles. "
            "Check Ollama and retry."
        ) from exc

    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            f"Ollama returned HTTP error {exc.code}."
        ) from exc

    except urllib.error.URLError as exc:
        raise RuntimeError(
            "Cannot connect to Ollama. Check that Ollama is running."
        ) from exc

    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise RuntimeError(
            "Ollama returned an unreadable response."
        ) from exc

    if not isinstance(result, dict):
        raise RuntimeError("Ollama returned an invalid response.")

    raw_response = result.get("response", "")

    if not isinstance(raw_response, str) or not raw_response.strip():
        raise RuntimeError("Ollama returned an empty response.")

    return raw_response.strip()


def parse_roles_response(raw_response: str) -> list:
    """Parse JSON, including JSON wrapped in code fences."""
    raw_response = (raw_response or "").strip()

    raw_response = re.sub(
        r"^\s*```(?:json)?\s*",
        "",
        raw_response,
        flags=re.IGNORECASE,
    )
    raw_response = re.sub(r"\s*```\s*$", "", raw_response).strip()

    try:
        parsed = json.loads(raw_response)

    except json.JSONDecodeError:
        start = raw_response.find("{")
        end = raw_response.rfind("}")

        if start < 0 or end <= start:
            raise RuntimeError(
                "The AI returned invalid JSON. Please retry."
            )

        try:
            parsed = json.loads(raw_response[start:end + 1])
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "The AI returned invalid JSON. Please retry."
            ) from exc

    if not isinstance(parsed, dict):
        raise RuntimeError("The AI response must be a JSON object.")

    roles = parsed.get("roles")

    if not isinstance(roles, list):
        raise RuntimeError("The AI response does not contain a roles list.")

    return roles


def _role_key(role: str) -> str:
    """Normalize a job title for duplicate detection."""
    role = normalize_text(role)
    role = re.sub(r"[^\w\s+#./-]", "", role)
    return re.sub(r"\s+", " ", role).strip()


def _validate_proposed_roles(
    proposed_roles: list,
    resume_text: str,
) -> list[dict]:
    cleaned_roles = []
    seen_roles = set()

    for item in proposed_roles:
        if not isinstance(item, dict):
            continue

        role = item.get("role")

        if not isinstance(role, str):
            continue

        role = re.sub(r"\s+", " ", role).strip(" \t\r\n.,;:")

        if not role or len(role) > 120:
            continue

        role_key = _role_key(role)

        if not role_key or role_key in seen_roles:
            continue

        supporting = clean_skill_list(
            item.get("supporting_skills", []),
            resume_text,
            must_be_present=True,
        )

        additional = clean_skill_list(
            item.get("additional_skills_to_check", []),
            resume_text,
            must_be_present=False,
        )

        # Every role must have at least one verified resume skill.
        if not supporting:
            continue

        reason = (
            "Resume evidence supports this role through these skills: "
            + ", ".join(supporting)
            + ". This is a preliminary match, not a guarantee of eligibility."
        )

        cleaned_roles.append({
            "role": role,
            "reason": reason,
            "supporting_skills": supporting,
            "additional_skills_to_check": additional,
        })

        seen_roles.add(role_key)

        if len(cleaned_roles) >= MAX_ROLES:
            break

    return cleaned_roles


def _resume_cache_key(resume_text: str) -> str:
    """Generate a stable key for normalized resume content."""
    normalized = normalize_text(resume_text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _load_role_cache() -> dict:
    """Load cached role recommendations from disk."""
    try:
        if CACHE_FILE.exists():
            with CACHE_FILE.open("r", encoding="utf-8") as file:
                data = json.load(file)

            if isinstance(data, dict):
                return data

    except (OSError, json.JSONDecodeError):
        pass

    return {}


def _save_role_cache(cache: dict) -> None:
    """Save cache atomically so interrupted writes don't corrupt the file."""
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = CACHE_FILE.with_suffix(".tmp")

        with temporary_file.open("w", encoding="utf-8") as file:
            json.dump(cache, file, ensure_ascii=False, indent=2)

        temporary_file.replace(CACHE_FILE)

    except OSError:
        # Cache is an optimization; role discovery should still work
        # if the cache cannot be written.
        pass


def discover_roles_from_resume(resume_text: str) -> list[dict]:
    """
    Return cached roles for an identical resume.
    Call Ollama only when no valid cached result exists.
    """
    if not isinstance(resume_text, str) or not resume_text.strip():
        raise ValueError("Resume text cannot be empty.")

    resume_text = resume_text[:MAX_RESUME_CHARS].strip()
    cache_key = _resume_cache_key(resume_text)

    cache = _load_role_cache()
    cached_roles = cache.get(cache_key)

    # Return a saved result without asking Ollama again.
    if isinstance(cached_roles, list) and cached_roles:
        return cached_roles

    last_error = "No valid response received from Ollama."

    for attempt in range(MAX_ATTEMPTS):
        try:
            prompt = build_prompt(
                resume_text,
                retry=(attempt > 0),
            )

            raw_response = call_ollama(prompt)
            proposed_roles = parse_roles_response(raw_response)

            cleaned_roles = _validate_proposed_roles(
                proposed_roles,
                resume_text,
            )

            if cleaned_roles:
                cache[cache_key] = cleaned_roles
                _save_role_cache(cache)
                return cleaned_roles

            last_error = (
                "The AI response contained no roles with verified "
                "resume skills."
            )

        except (RuntimeError, ValueError) as exc:
            last_error = str(exc)

    raise RuntimeError(
        "Could not discover valid roles after "
        f"{MAX_ATTEMPTS} attempts. {last_error} "
        "Check resume text extraction and confirm Ollama is running "
        f"with model '{OLLAMA_MODEL}'."
    )
