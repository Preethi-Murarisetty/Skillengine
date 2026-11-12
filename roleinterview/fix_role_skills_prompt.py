from pathlib import Path
import shutil

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

old = """6. Include 6 to 8 important role-relevant skill areas before adding any
   additional resume skills.
7. Generate exactly 3 distinct interview concepts per skill area."""

new = """6. First generate 6 to 8 distinct, important skills genuinely required
   for the selected role. These must not simply repeat the resume skill list.
7. Then include every explicitly listed resume skill that is not already
   present. Keep role requirements and resume-listed skills distinguishable.
8. Generate exactly 3 distinct interview concepts per skill area."""

if old not in source:
    print("STOP: Expected prompt text not found. No changes made.")
    raise SystemExit(1)

backup = path.with_name("role_requirements.py.before_role_skills_fix")
shutil.copy2(path, backup)
path.write_text(source.replace(old, new, 1), encoding="utf-8")

print("SUCCESS: Role-specific skill instructions updated.")
print(f"Backup: {backup}")
