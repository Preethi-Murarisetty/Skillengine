from pathlib import Path

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

start = source.index("    # Compare resume-listed skills with the role-required skills.")
end = source.index("    return {", start)

replacement = '''    # Compare skills using normalized names and common aliases.
    def skill_key(skill):
        value = normalize_text(skill).casefold()
        aliases = {
            "sql proficiency": "sql",
            "sql query optimization": "sql",
            "python programming": "python",
            "power bi integration": "power bi",
            "powerbi": "power bi",
        }
        return aliases.get(value, value)

    resume_skill_keys = {skill_key(skill) for skill in resume_skills}
    required_skill_keys = {
        skill_key(skill)
        for skill in raw_required_skills
        if isinstance(skill, str) and normalize_text(skill)
    }

    common_skills = []
    for skill in resume_skills:
        if skill_key(skill) in required_skill_keys:
            common_skills.append(skill)

    resume_only_skills = [
        skill for skill in resume_skills
        if skill_key(skill) not in required_skill_keys
    ]

    missing_role_skills = [
        area["skill"]
        for area in final_areas
        if skill_key(area["skill"]) in required_skill_keys
        and skill_key(area["skill"]) not in resume_skill_keys
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
path.write_text(source[:start] + replacement + source[end:], encoding="utf-8")
print("SUCCESS: Skill comparison logic updated.")
