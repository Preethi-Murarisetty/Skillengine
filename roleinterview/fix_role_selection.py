from pathlib import Path

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

old = '''    role_key = normalize_skill(role)
    raw_required = []
    ai_areas = []

    # Data Analyst requirements are grounded in a stable role-specific set.
    if "data analyst" in role_key or role_key == "business data analyst":
        required_skills = DATA_ANALYST_SKILLS.copy()
    else:
        try:
            data = parse_json_response(
                call_ollama(build_role_prompt(role, resume_text))
            )
            raw_required = data.get("role_required_skills", [])
            ai_areas = data.get("skill_areas", [])
        except Exception as exc:
            print(f"WARNING: Role requirements generation failed: {exc}")

        if not isinstance(raw_required, list):
            raw_required = []
        if not isinstance(ai_areas, list):
            ai_areas = []

        required_skills = []
        for item in raw_required:
            if not isinstance(item, str):
                continue
            skill = item.strip()
            if not skill or normalize_skill(skill) in CATEGORY_NAMES:
                continue
            if not any(skills_match(skill, existing) for existing in required_skills):
                required_skills.append(skill)

        # Do not return category headings as skills if the model fails.
        if not required_skills:
            required_skills = [
                skill for skill in resume_skills
                if normalize_skill(skill) not in CATEGORY_NAMES
            ][:10]
'''

new = '''    role_key = normalize_skill(role)
    raw_required = []
    ai_areas = []

    # Prefer configured role profiles for consistent, role-specific results.
    # Match exact normalized role names; do not use resume skills as a fallback.
    profile_key = role_key
    if profile_key not in ROLE_SKILLS:
        profile_key = None

    if profile_key:
        required_skills = ROLE_SKILLS[profile_key].copy()
    else:
        try:
            data = parse_json_response(
                call_ollama(build_role_prompt(role, resume_text))
            )
            raw_required = data.get("role_required_skills", [])
            ai_areas = data.get("skill_areas", [])
        except Exception as exc:
            raise RuntimeError(
                f"Could not generate role requirements for '{role}'. "
                "Please retry or add a role profile to ROLE_SKILLS."
            ) from exc

        if not isinstance(raw_required, list):
            raw_required = []
        if not isinstance(ai_areas, list):
            ai_areas = []

        required_skills = []
        for item in raw_required:
            if not isinstance(item, str):
                continue
            skill = item.strip()
            if not skill or normalize_skill(skill) in CATEGORY_NAMES:
                continue
            if not any(
                skills_match(skill, existing)
                for existing in required_skills
            ):
                required_skills.append(skill)

        if not required_skills:
            raise RuntimeError(
                f"No valid role-specific requirements were generated for "
                f"'{role}'. Please retry or add a role profile to ROLE_SKILLS."
            )
'''

if old not in source:
    raise SystemExit(
        "ERROR: Expected old block not found. No changes made; file is unchanged."
    )

path.write_text(source.replace(old, new, 1), encoding="utf-8")
print("SUCCESS: Role selection logic updated.")
