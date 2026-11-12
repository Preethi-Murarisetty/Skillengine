from pathlib import Path

path = Path("app/services/role_requirements.py")

# Read file and remove UTF-8 BOM / accidental leading invisible characters.
raw = path.read_bytes()
source = raw.decode("utf-8-sig")
source = source.lstrip("\ufeff")

# Validate before writing, so invalid Python is not saved.
compile(source, str(path), "exec")

# Save clean UTF-8 without BOM.
path.write_text(source, encoding="utf-8")

print("SUCCESS: BOM removed and Python syntax is valid.")
