from app.services.role_requirements import generate_role_requirements

resume = """
Python, SQL, Excel, Power BI, Data Cleaning,
Data Visualization, Statistical Analysis
"""

result = generate_role_requirements("Data Visualization Specialist", resume)

errors = []
total_concepts = 0

for area in result["skill_areas"]:
    for concept in area["concepts"]:
        total_concepts += 1
        difficulties = concept.get("difficulty", [])

        expected = ["Easy", "Medium", "Hard"]
        if difficulties != expected:
            errors.append({
                "skill": area["skill"],
                "concept": concept.get("name"),
                "difficulty": difficulties,
            })

print("Role:", result["role"])
print("Total skills:", len(result["skill_areas"]))
print("Total concepts:", total_concepts)
print("Concepts with difficulty errors:", len(errors))

for error in errors:
    print(error)

if not errors:
    print("SUCCESS: Every concept has Easy, Medium, Hard levels.")
