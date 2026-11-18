import requests

API = "http://127.0.0.1:8000"

resume_text = """
Data Analyst with experience in SQL, Python, Excel, Power BI,
data cleaning, data visualization, and statistical analysis.
Created dashboards and analyzed business datasets.
"""

roles = ["Data Analyst", "Data Scientist", "Data Engineer"]

for role in roles:
    print("\n" + "=" * 65)
    print("ROLE:", role)

    response = requests.post(
        f"{API}/roles/requirements",
        json={
            "role": role,
            "resume_text": resume_text,
        },
        timeout=240,
    )

    print("HTTP STATUS:", response.status_code)
    response.raise_for_status()

    data = response.json()
    requirements = data.get("requirements", data)

    required = requirements.get("role_required_skills", [])
    matched = requirements.get("common_skills", [])
    missing = requirements.get("missing_role_skills", [])
    areas = requirements.get("skill_areas", [])

    print("Required skills:", len(required))
    print("Matched skills:", len(matched))
    print("Missing skills:", len(missing))

    print("\nREQUIRED:")
    for skill in required:
        print(" -", skill.get("skill") if isinstance(skill, dict) else skill)

    print("\nMATCHED:")
    for skill in matched:
        print(" -", skill.get("skill") if isinstance(skill, dict) else skill)

    print("\nMISSING:")
    for skill in missing:
        print(" -", skill.get("skill") if isinstance(skill, dict) else skill)

    print("\nSKILL AREA EVIDENCE:")
    for area in areas:
        if isinstance(area, dict):
            print(
                f" - {area.get('skill')}: "
                f"resume_supported={area.get('resume_supported')}"
            )
