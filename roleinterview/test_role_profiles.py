from app.services.role_requirements import generate_role_requirements

resume = """
Technical Skills
Python, SQL, Excel, Power BI, Data Cleaning,
Data Visualization, Statistical Analysis
"""

for role in ["Data Analyst", "Data Scientist", "Data Engineer"]:
    result = generate_role_requirements(role, resume)
    print("\nROLE:", role)
    print("Required:", len(result["role_required_skills"]))
    print("Matched:", len(result["common_skills"]))
    print("Missing:", len(result["missing_role_skills"]))
    print("Required skills:", result["role_required_skills"])
    print("Missing skills:", result["missing_role_skills"])
