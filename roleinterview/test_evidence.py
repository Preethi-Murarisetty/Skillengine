from app.services.role_requirements import (
    extract_resume_evidence,
    mentions_skill,
    is_skills_list,
)

resume = """
Name: Demo Candidate
Skills: SQL, Python, Power BI, Excel, DAX, Power Query.
Project: Sales Analytics Dashboard using Power BI and DAX.
"""

print("SKILLS DETECTION:")
for skill in ["SQL", "Python", "Power BI", "Excel", "DAX", "Power Query"]:
    print(skill, "=>", mentions_skill(skill, resume))

print("\nSKILLS HEADER DETECTION:")
for line in [
    "Skills: SQL, Python, Power BI",
    "Project: Sales Analytics Dashboard using Power BI and DAX.",
]:
    print(repr(line), "=>", is_skills_list(line))

print("\nEVIDENCE DETECTION:")
for skill in ["SQL", "Python", "Power BI", "DAX", "Java"]:
    print(skill, "=>", extract_resume_evidence(skill, resume))
