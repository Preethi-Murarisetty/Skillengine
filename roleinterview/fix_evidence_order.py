from pathlib import Path
import shutil

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

old = "evidence = extract_resume_evidence(resume_text, skill)"
new = "evidence = extract_resume_evidence(skill, resume_text)"

if old not in source:
    print("STOP: Expected buggy line not found. No changes made.")
    raise SystemExit(1)

backup = path.with_name("role_requirements.py.before_evidence_fix")
shutil.copy2(path, backup)

path.write_text(source.replace(old, new, 1), encoding="utf-8")
print("SUCCESS: Resume evidence argument order fixed.")
print(f"Backup: {backup}")
