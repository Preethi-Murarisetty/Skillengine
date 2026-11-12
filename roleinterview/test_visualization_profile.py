from app.services.role_requirements import generate_role_requirements

resume = """
Python, SQL, Excel, Power BI, Data Cleaning,
Data Visualization, Statistical Analysis
"""

result = generate_role_requirements("Data Visualization Specialist", resume)

print("Role:", result["role"])
print("Required skills:", result["role_required_skills"])
print("Matched skills:", result["common_skills"])
print("Missing skills:", result["missing_role_skills"])

for area in result["skill_areas"]:
    print(f"\n{area['skill']} | supported={area['resume_supported']}")
    print("Concepts:", [c["name"] for c in area["concepts"]])
