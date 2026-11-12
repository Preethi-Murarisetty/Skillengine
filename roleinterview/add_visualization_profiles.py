from pathlib import Path

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

marker = 'ROLE_SKILLS = {'
if marker not in source:
    raise SystemExit("ERROR: ROLE_SKILLS dictionary not found. No changes made.")

profiles = '''    "data visualization specialist": [
        "Data Visualization", "Data Analysis", "Statistics",
        "Dashboard Development", "Data Storytelling",
        "Chart Selection", "Power BI", "Tableau", "SQL"
    ],
    "business intelligence analyst": [
        "SQL", "Data Analysis", "Data Visualization",
        "Dashboard Development", "Power BI", "Tableau",
        "Data Modeling", "ETL Concepts", "KPI Reporting"
    ],
    "power bi developer": [
        "Power BI", "DAX", "Power Query", "Data Modeling",
        "Data Visualization", "Dashboard Development",
        "SQL", "Data Transformation", "Data Refresh"
    ],
    "tableau developer": [
        "Tableau", "Data Visualization", "Dashboard Development",
        "Calculated Fields", "Filters and Parameters",
        "Data Blending", "SQL", "Data Analysis"
    ],
'''

if '"data visualization specialist":' in source:
    print("Visualization profiles already exist. No changes made.")
else:
    source = source.replace(marker, marker + "\n" + profiles, 1)
    path.write_text(source, encoding="utf-8")
    print("Added visualization and BI role profiles.")
