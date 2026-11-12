from pathlib import Path

p = Path("app/services/role_requirements.py")
s = p.read_text(encoding="utf-8")

marker = "    # Compare skills using normalized names and common aliases."
if marker not in s:
    raise SystemExit("ERROR: Comparison block marker not found; no changes made.")

debug = '''    print("\\nDEBUG resume_skills:", resume_skills)
    print("DEBUG raw_required_skills:", raw_required_skills)
    print("DEBUG final_area_skills:", [area["skill"] for area in final_areas])

'''
if "DEBUG raw_required_skills:" in s:
    print("Debug prints already exist; no changes made.")
else:
    s = s.replace(marker, debug + marker, 1)
    p.write_text(s, encoding="utf-8")
    print("Debug prints added.")
