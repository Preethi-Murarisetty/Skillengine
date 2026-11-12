from pathlib import Path

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

# Remove temporary diagnostic prints added earlier.
source = source.replace(
    '    print("\nDEBUG resume_skills:", resume_skills)\n'
    '    print("DEBUG raw_required_skills:", raw_required_skills)\n'
    '    print("DEBUG final_area_skills:", [area["skill"] for area in final_areas])\n\n',
    ""
)

start_marker = "    # Compare skills using normalized names and common aliases."
if start_marker not in source:
    raise SystemExit(
        "ERROR: Comparison block not found. Backup exists; file unchanged."
    )

start = source.index(start_marker)
end = source.index("    return {", start)

replacement = '''    # Exact skill matching: case and whitespace do not matter.
    def skill_key(skill):
        return normalize_text(skill).casefold()

    resume_skill_keys = {skill_key(skill) for skill in resume_skills}

    required_skill_keys = {
        skill_key(skill)
        for skill in raw_required_skills
        if isinstance(skill, str) and normalize_text(skill)
    }

    # Skills present in both the resume and role requirements.
    common_skills = [
        skill for skill in resume_skills
        if skill_key(skill) in required_skill_keys
    ]

    # Resume skills not listed as role requirements.
    resume_only_skills = [
        skill for skill in resume_skills
        if skill_key(skill) not in required_skill_keys
    ]

    # Role requirements with no exact skill match in the resume.
    missing_role_skills = [
        skill
        for skill in raw_required_skills
        if isinstance(skill, str)
        and normalize_text(skill)
        and skill_key(skill) not in resume_skill_keys
    ]

    resume_skill_names = [
        area["skill"]
        for area in final_areas
        if skill_key(area["skill"]) in resume_skill_keys
    ]

    role_required_skills = [
        area["skill"]
        for area in final_areas
        if skill_key(area["skill"]) in required_skill_keys
    ]

'''
source = source[:start] + replacement + source[end:]
path.write_text(source, encoding="utf-8")
print("SUCCESS: Exact-match comparison updated.")
