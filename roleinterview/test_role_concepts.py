from app.services.role_requirements import generate_role_requirements

resume = """
Technical Skills
Python, SQL, Excel, Power BI, Data Cleaning,
Data Visualization, Statistical Analysis
"""

for role in ["Data Scientist", "Data Engineer"]:
    result = generate_role_requirements(role, resume)
    print("\n" + "=" * 60)
    print("ROLE:", role)

    for area in result["skill_areas"]:
        concepts = area.get("concepts", [])
        print(f"\n{area['skill']}:")
        for concept in concepts:
            print(" -", concept["name"])
