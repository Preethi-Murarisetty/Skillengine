from pathlib import Path

path = Path("app/services/role_requirements.py")
text = path.read_text(encoding="utf-8")

old = '''    resume_skill_names = [
        area["skill"]
        for area in final_areas
        if any(
            area["skill"].casefold() == resume_skill.casefold()
            for resume_skill in resume_skills
        )
    ]

    role_required_skills = [
        area["skill"]
        for area in final_areas
        if not any(
            area["skill"].casefold() == resume_skill.casefold()
            for resume_skill in resume_skills
        )
    ]
'''

new = '''    # Compare resume-listed skills with the role-required skills.
    resume_skill_keys = {skill.casefold() for skill in resume_skills}
    required_skill_keys = {
        skill.casefold()
        for skill in raw_required_skills
        if isinstance(skill, str) and normalize_text(skill)
    }

    # Use the final normalized skill areas for display names.
    common_skills = [
        area["skill"]
        for area in final_areas
        if area["skill"].casefold() in resume_skill_keys
        and area["skill"].casefold() in required_skill_keys
    ]

    resume_only_skills = [
        skill for skill in resume_skills
        if skill.casefold() not in required_skill_keys
    ]

    missing_role_skills = [
        area["skill"]
        for area in final_areas
        if area["skill"].casefold() in required_skill_keys
        and area["skill"].casefold() not in resume_skill_keys
    ]

    resume_skill_names = [
        area["skill"]
        for area in final_areas
        if area["skill"].casefold() in resume_skill_keys
    ]

    role_required_skills = [
        area["skill"]
        for area in final_areas
        if area["skill"].casefold() in required_skill_keys
    ]
'''

if old not in text:
    raise SystemExit(
        "ERROR: Expected comparison block not found. No changes made."
    )

text = text.replace(old, new, 1)

old_return = '''        "resume_skills": resume_skill_names,
        "role_required_skills": role_required_skills,
        "skill_areas": final_areas,
'''

new_return = '''        "resume_skills": resume_skill_names,
        "role_required_skills": role_required_skills,
        "common_skills": common_skills,
        "resume_only_skills": resume_only_skills,
        "missing_role_skills": missing_role_skills,
        "skill_areas": final_areas,
'''

if old_return not in text:
    raise SystemExit(
        "ERROR: Expected return block not found. Comparison patch not saved."
    )

text = text.replace(old_return, new_return, 1)
path.write_text(text, encoding="utf-8")
print("SUCCESS: Explicit skill comparison fields added.")
