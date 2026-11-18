from app.services.role_requirements import build_role_prompt, call_ollama, parse_json_response

resume = """
Name: Demo Candidate
Skills: SQL, Python, Power BI, Excel, DAX, Power Query.
Project: Sales Analytics Dashboard using Power BI and DAX.
"""

result = parse_json_response(call_ollama(build_role_prompt("Data Analyst", resume)))

print("AI ROLE-REQUIRED SKILLS:")
for skill in result.get("role_required_skills", []):
    print("-", skill)

print("\nAI SKILL AREAS:")
for area in result.get("skill_areas", []):
    print("-", area.get("skill"))
