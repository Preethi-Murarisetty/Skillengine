from pathlib import Path

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

start = source.index("def extract_resume_skill_names(")
end = source.index("\ndef extract_resume_evidence(", start)

replacement = r'''def extract_resume_skill_names(resume_text):
    """Extract skills from a Skills label, even mid-sentence."""
    skills = []

    match = re.search(
        r"\b(?:technical\s+)?skills?\s*:\s*(.*)",
        resume_text,
        re.IGNORECASE,
    )

    if not match:
        return skills

    content = match.group(1)

    # Stop when a project or another resume section begins.
    content = re.split(
        r"\b(?:project|projects|experience|education|certifications?)\s*:",
        content,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]

    for candidate in re.split(r"[,;|•\r\n]", content):
        skill = candidate.strip(" \t-•.")
        if skill and len(skill) <= 60:
            if not any(item.casefold() == skill.casefold() for item in skills):
                skills.append(skill)

    return skills
'''

path.write_text(
    source[:start] + replacement + source[end:],
    encoding="utf-8",
)

print("Function replaced.")
