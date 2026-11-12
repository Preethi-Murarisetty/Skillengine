from pathlib import Path
import shutil

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

old = '''6. Include approximately 6 to 12 role-relevant skill areas before adding any
   additional resume skills.
7. Each skill area must have at least 3 distinct interview concepts.
8. Across each skill area's concepts, cover Easy, Medium, and Hard.
9. Keep concepts specific to the skill area and selected role.
10. Do not generate interview questions or candidate scores at this stage.'''

new = '''6. Include 6 to 8 important role-relevant skill areas before adding any
   additional resume skills.
7. Generate exactly 3 distinct interview concepts per skill area.
8. Assign one concept each to Easy, Medium, and Hard.
9. Keep concepts specific to the skill area and selected role.
10. Do not generate interview questions or candidate scores at this stage.
11. Keep the JSON concise. Do not add explanations outside the JSON.'''

if old not in source:
    print("STOP: Exact prompt text not found. No changes made.")
    raise SystemExit(1)

backup = path.with_name("role_requirements.py.before_prompt_optimization")
shutil.copy2(path, backup)

path.write_text(source.replace(old, new, 1), encoding="utf-8")

print("SUCCESS: Role prompt optimized.")
print(f"Backup: {backup}")
