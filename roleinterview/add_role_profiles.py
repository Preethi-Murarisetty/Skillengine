from pathlib import Path

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

if "ROLE_SKILLS = {" in source:
    print("ROLE_SKILLS already exists. No changes made.")
    raise SystemExit(0)

marker = "DATA_ANALYST_SKILLS = ["
start = source.find(marker)

if start == -1:
    raise SystemExit("ERROR: DATA_ANALYST_SKILLS definition not found.")

# Find the end of the DATA_ANALYST_SKILLS list.
list_start = source.find("[", start)
depth = 0
quote = None
escaped = False
list_end = None

for i in range(list_start, len(source)):
    ch = source[i]

    if quote:
        if escaped:
            escaped = False
        elif ch == "\\":
            escaped = True
        elif ch == quote:
            quote = None
        continue

    if ch in ("'", '"'):
        quote = ch
    elif ch == "[":
        depth += 1
    elif ch == "]":
        depth -= 1
        if depth == 0:
            list_end = i + 1
            break

if list_end is None:
    raise SystemExit("ERROR: Could not locate end of DATA_ANALYST_SKILLS.")

profiles = '''

# Stable role-specific requirements. These describe the job, not the candidate.
ROLE_SKILLS = {
    "data analyst": DATA_ANALYST_SKILLS.copy(),
    "business data analyst": [
        "SQL", "Excel", "Data Analysis", "Business Requirements Analysis",
        "Statistical Analysis", "Data Visualization", "Power BI",
        "KPI Reporting", "Stakeholder Communication", "Data Cleaning",
    ],
    "data scientist": [
        "Python", "SQL", "Statistics", "Probability",
        "Exploratory Data Analysis", "Feature Engineering",
        "Machine Learning", "Supervised Learning", "Unsupervised Learning",
        "Model Evaluation", "Pandas", "NumPy", "Data Visualization",
    ],
    "data engineer": [
        "Python", "SQL", "ETL Concepts", "Data Modeling",
        "Data Warehousing", "Data Pipelines", "Database Design",
        "Apache Spark", "Cloud Data Platforms", "Data Quality",
        "Workflow Orchestration",
    ],
}
'''

source = source[:list_end] + profiles + source[list_end:]
path.write_text(source, encoding="utf-8")
print("SUCCESS: Added role-specific profiles.")
