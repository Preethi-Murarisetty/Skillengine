from pathlib import Path

path = Path("app/services/role_requirements.py")
text = path.read_text(encoding="utf-8")

start = text.find("def build_role_prompt(")
end = text.find("\ndef ", start + 1)

if start == -1 or end == -1:
    raise SystemExit("ERROR: build_role_prompt function boundaries not found.")

new_function = '''def build_role_prompt(role: str, resume_text: str) -> str:
    resume_skills = extract_resume_skill_names(resume_text)

    return f"""
You are an expert technical hiring analyst.

Selected job role: {role}

Candidate resume:
{resume_text[:12000]}

Skills explicitly mentioned in the resume:
{json.dumps(resume_skills, ensure_ascii=False)}

Task:
Create a competency map for the selected job role.

Return valid JSON with TWO separate lists:
1. role_required_skills: skills genuinely required for this role.
2. skill_areas: interview skill areas and concepts for those role skills,
   followed by any resume-listed skills not already included.

Rules:
- Generate 6 to 8 distinct role-required skills appropriate for the selected role.
- Do not simply copy the candidate's resume skills into role_required_skills.
- Determine role requirements from the selected role, not just the resume.
- Include every explicitly listed resume skill in skill_areas.
- Avoid duplicate skills across skill_areas.
- For every skill area, generate exactly 3 distinct concepts:
  one Easy, one Medium, and one Hard.
- Concepts must be specific to the skill and relevant to the selected role.
- Resume mentions are evidence only, not proof of proficiency.
- Do not invent candidate experience or certifications.
- Return JSON only, without markdown or explanations.

Required JSON structure:
{{
  "role": {json.dumps(role)},
  "role_required_skills": [
    "role-specific skill 1",
    "role-specific skill 2"
  ],
  "skill_areas": [
    {{
      "skill": "skill name",
      "concepts": [
        {{"name": "basic concept", "difficulty": ["Easy"]}},
        {{"name": "intermediate concept", "difficulty": ["Medium"]}},
        {{"name": "advanced concept", "difficulty": ["Hard"]}}
      ]
    }}
  ]
}}
"""
'''

text = text[:start] + new_function + text[end:]
path.write_text(text, encoding="utf-8")
print("SUCCESS: Role prompt now requests separate role_required_skills.")
