from pathlib import Path

path = Path("app/services/role_requirements.py")
text = path.read_text(encoding="utf-8")

old = '''    # Preserve all explicitly listed resume skills, even when AI omitted them.
    resume_skills = extract_resume_skill_names(resume_text)
'''

new = '''    # Add role-required skills returned separately by Ollama.
    raw_required_skills = result.get("role_required_skills", [])
    if not isinstance(raw_required_skills, list):
        raw_required_skills = []

    for required_skill in raw_required_skills:
        if not isinstance(required_skill, str):
            continue

        required_skill = normalize_text(required_skill)
        if not required_skill:
            continue

        if required_skill.casefold() not in seen_skills:
            skill_areas.append({
                "skill": required_skill,
                "concepts": [],
            })
            seen_skills.add(required_skill.casefold())

    # Preserve all explicitly listed resume skills, even when AI omitted them.
    resume_skills = extract_resume_skill_names(resume_text)
'''

if old not in text:
    raise SystemExit("ERROR: Expected insertion point not found. File unchanged.")

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("SUCCESS: Role-required skill merge added.")
