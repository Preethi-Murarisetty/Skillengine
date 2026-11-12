from pathlib import Path
import re

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

backup = path.with_name("role_requirements.py.before_skill_fix.bak")
backup.write_text(source, encoding="utf-8")

concept_map = r'''

# Trusted concepts prevent the AI from mixing unrelated technical topics.
TRUSTED_CONCEPTS = {
    "python": [
        "Variables and Data Types",
        "Operators",
        "Conditional Statements",
        "Loops and Control Statements",
        "Functions",
        "Lists, Tuples, Sets, and Dictionaries",
        "Strings",
        "Object-Oriented Programming",
        "Exception Handling",
    ],
    "sql": [
        "SELECT and Filtering",
        "Sorting and DISTINCT",
        "Aggregate Functions",
        "GROUP BY and HAVING",
        "SQL Joins",
        "Subqueries",
        "Common Table Expressions",
        "Window Functions",
        "NULL Handling",
    ],
    "pandas": [
        "Series and DataFrames",
        "Data Selection and Filtering",
        "Handling Missing Values",
        "Grouping and Aggregation",
        "Merging and Joining DataFrames",
        "Data Transformation",
    ],
    "numpy": [
        "NumPy Arrays",
        "Array Indexing and Slicing",
        "Array Shape and Reshaping",
        "Vectorization and Broadcasting",
        "Aggregations",
        "Boolean Masking",
    ],
    "matplotlib": [
        "Line and Bar Charts",
        "Scatter Plots and Histograms",
        "Titles, Labels, and Legends",
        "Plot Customization",
        "Subplots",
    ],
    "power bi": [
        "Power BI Data Modeling",
        "Power Query Transformations",
        "DAX Measures and Calculated Columns",
        "Relationships and Filter Context",
        "Visualizations and Slicers",
        "KPI Dashboards and Reports",
    ],
    "power query": [
        "Importing Data",
        "Data Cleaning and Transformation",
        "Merge and Append Queries",
        "Data Types and Missing Values",
        "Query Refresh",
    ],
    "dax": [
        "DAX Syntax and Expressions",
        "Calculated Columns and Measures",
        "Filter Context and Row Context",
        "CALCULATE and Filter Functions",
        "Time Intelligence",
    ],
    "excel": [
        "Formulas and Functions",
        "IF and Conditional Logic",
        "Lookup Functions",
        "Sorting and Filtering",
        "Pivot Tables",
        "Conditional Formatting",
        "Charts and Dashboards",
    ],
    "data cleaning": [
        "Missing Value Handling",
        "Duplicate Detection and Removal",
        "Data Type Correction",
        "Inconsistent Value Standardization",
        "Outlier Detection",
        "Data Validation",
    ],
    "data analysis": [
        "Exploratory Data Analysis",
        "Data Aggregation",
        "Trend and Pattern Identification",
        "Comparative Analysis",
        "Insight Communication",
    ],
    "statistical analysis": [
        "Descriptive Statistics",
        "Mean, Median, and Mode",
        "Variance and Standard Deviation",
        "Probability Distributions",
        "Correlation",
        "Hypothesis Testing",
    ],
    "data visualization": [
        "Choosing Appropriate Charts",
        "Chart Interpretation",
        "Labels, Legends, and Scales",
        "Comparative and Trend Visualization",
        "Communicating Insights",
    ],
    "machine learning": [
        "Supervised and Unsupervised Learning",
        "Feature Engineering",
        "Training and Test Data",
        "Model Evaluation Metrics",
        "Overfitting and Underfitting",
    ],
    "etl concepts": [
        "Extract, Transform, and Load",
        "Data Source Integration",
        "Data Transformation",
        "Data Validation",
        "Incremental Loading",
    ],
}

CATEGORY_NAMES = {
    "data analytics and visualization",
    "data analytics & visualization",
    "data science",
    "database technologies",
    "programming",
    "machine learning",
    "tools",
    "technical skills",
    "skills",
    "languages",
    "certifications",
    "education",
    "projects",
    "experience",
}

# Used when the target role is Data Analyst. These are role skills,
# not a list of skills copied from the candidate's resume.
DATA_ANALYST_SKILLS = [
    "SQL",
    "Excel",
    "Python",
    "Data Cleaning",
    "Data Analysis",
    "Statistical Analysis",
    "Data Visualization",
    "Power BI",
    "Pandas",
    "ETL Concepts",
]
'''

if "TRUSTED_CONCEPTS = {" not in source:
    source = source.replace(
        'DIFFICULTIES = ["Easy", "Medium", "Hard"]',
        'DIFFICULTIES = ["Easy", "Medium", "Hard"]\n' + concept_map,
        1,
    )


new_extract = r'''
def extract_resume_skill_names(resume_text: str) -> list[str]:
    """Extract individual skill names from the resume Skills section."""
    section = _get_section(resume_text, SECTION_ALIASES["skills"])
    if not section:
        return []

    # Repair PDF line-wrap hyphenation, e.g. "Dashboard De-\nvelopment".
    section = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", section)

    result = []
    seen = set()

    for raw_line in section.splitlines():
        line = clean_line(raw_line)
        if not line:
            continue

        # Strip a category label, but do not treat it as a skill.
        if ":" in line:
            prefix, remainder = line.split(":", 1)
            if len(prefix.split()) <= 6:
                line = remainder.strip()

        line = line.replace("(", ",").replace(")", ",")

        for item in re.split(r"[,;|/\n]", line):
            item = re.sub(r"\s+", " ", item).strip(" .:-\t")
            if not item:
                continue

            key = normalize_skill(item)
            if not key or key in CATEGORY_NAMES:
                continue

            # Ignore obvious category labels even when punctuation differs.
            if key in {
                "data analytics and visualization",
                "data science",
                "database technologies",
                "programming",
                "machine learning",
                "tools",
                "technical skills",
            }:
                continue

            if key not in seen:
                seen.add(key)
                result.append(item)

    return result
'''

start = source.index("def extract_resume_skill_names(")
end = source.index("\ndef _resume_sections(", start)
source = source[:start] + new_extract.strip() + "\n\n" + source[end + 1:]


new_evidence = r'''
def _evidence_chunks(text: str) -> list[str]:
    """Split extracted resume text into short, readable evidence snippets."""
    text = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", text or "")
    chunks = []

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", line)
        for part in parts:
            part = re.sub(r"\s+", " ", part).strip(" •●▪◦-")
            if part:
                chunks.append(part[:350])

    return list(dict.fromkeys(chunks))


def extract_resume_evidence(
    skill: str,
    resume_text: str,
    ai_evidence: str = "",
    evidence_type: str = "",
) -> dict[str, Any]:
    """Verify a skill using resume text; never trust an AI claim alone."""
    sections = _resume_sections(resume_text)
    listed_skills = extract_resume_skill_names(resume_text)

    skill_evidence = []
    project_evidence = []
    experience_evidence = []

    # A skill explicitly listed in the Skills section is valid evidence.
    for listed_skill in listed_skills:
        if skills_match(skill, listed_skill):
            skill_evidence.append(listed_skill)

    # Search short chunks rather than entire PDF paragraphs.
    for section_name, destination in (
        ("skills", skill_evidence),
        ("summary", skill_evidence),
        ("certifications", skill_evidence),
        ("projects", project_evidence),
        ("experience", experience_evidence),
    ):
        section_text = sections.get(section_name, "")
        for chunk in _evidence_chunks(section_text):
            if any(
                skills_match(skill, listed)
                for listed in [skill]
            ):
                pattern = (
                    r"(?<!\w)"
                    + re.escape(normalize_skill(skill))
                    + r"(?!\w)"
                )
                if re.search(pattern, normalize_skill(chunk)):
                    destination.append(chunk)

    # Alias evidence is accepted only when it points to a real, short
    # resume chunk. AI-generated evidence is deliberately not trusted.
    for chunk in _evidence_chunks(resume_text):
        if len(chunk) > 350:
            continue
        for alias_line in find_resume_skill_evidence(skill, chunk):
            if alias_line.strip():
                if any(
                    alias_line.strip() in item
                    for item in _evidence_chunks(sections.get("projects", ""))
                ):
                    project_evidence.append(alias_line[:350])
                elif any(
                    alias_line.strip() in item
                    for item in _evidence_chunks(sections.get("experience", ""))
                ):
                    experience_evidence.append(alias_line[:350])
                else:
                    skill_evidence.append(alias_line[:350])

    skill_evidence = list(dict.fromkeys(skill_evidence))
    project_evidence = list(dict.fromkeys(project_evidence))
    experience_evidence = list(dict.fromkeys(experience_evidence))

    supported = bool(
        skill_evidence or project_evidence or experience_evidence
    )

    return {
        "resume_skill_evidence": skill_evidence[:5],
        "resume_project_evidence": project_evidence[:5],
        "resume_experience_evidence": experience_evidence[:5],
        "resume_supported": supported,
    }
'''

start = source.index("def extract_resume_evidence(")
end = source.index("\ndef call_ollama(", start)
source = source[:start] + new_evidence.strip() + "\n\n" + source[end + 1:]


new_generator = r'''
def generate_role_requirements(
    role: str,
    resume_text: str,
) -> dict[str, Any]:
    """Build role requirements, verify resume evidence, and validate concepts."""
    resume_text = resume_text or ""
    resume_skills = extract_resume_skill_names(resume_text)

    role_key = normalize_skill(role)
    raw_required = []
    ai_areas = []

    # Data Analyst requirements are grounded in a stable role-specific set.
    if "data analyst" in role_key or role_key == "business data analyst":
        required_skills = DATA_ANALYST_SKILLS.copy()
    else:
        try:
            data = parse_json_response(
                call_ollama(build_role_prompt(role, resume_text))
            )
            raw_required = data.get("role_required_skills", [])
            ai_areas = data.get("skill_areas", [])
        except Exception as exc:
            print(f"WARNING: Role requirements generation failed: {exc}")

        if not isinstance(raw_required, list):
            raw_required = []
        if not isinstance(ai_areas, list):
            ai_areas = []

        required_skills = []
        for item in raw_required:
            if not isinstance(item, str):
                continue
            skill = item.strip()
            if not skill or normalize_skill(skill) in CATEGORY_NAMES:
                continue
            if not any(skills_match(skill, existing) for existing in required_skills):
                required_skills.append(skill)

        # Do not return category headings as skills if the model fails.
        if not required_skills:
            required_skills = [
                skill for skill in resume_skills
                if normalize_skill(skill) not in CATEGORY_NAMES
            ][:10]

    # Create one area per role requirement. Do not add every resume skill
    # as an interview topic for a role that does not require it.
    ai_area_by_skill = {}
    for item in ai_areas:
        if isinstance(item, str):
            item = {"skill": item}
        if not isinstance(item, dict):
            continue

        name = str(item.get("skill") or item.get("name") or "").strip()
        if name and normalize_skill(name) not in CATEGORY_NAMES:
            ai_area_by_skill[normalize_skill(name)] = item

    areas = []
    common_skills = []
    missing_role_skills = []

    for skill in required_skills:
        ai_item = ai_area_by_skill.get(normalize_skill(skill), {})
        evidence = extract_resume_evidence(
            skill=skill,
            resume_text=resume_text,
        )

        supported = evidence["resume_supported"]
        if supported:
            common_skills.append(skill)
        else:
            missing_role_skills.append(skill)

        # Use a trusted concept map when available; ignore potentially
        # unrelated AI concepts for these well-known skills.
        trusted_key = normalize_skill(skill)
        concepts_list = TRUSTED_CONCEPTS.get(trusted_key)

        if concepts_list is None:
            ai_concepts = normalize_concepts(ai_item.get("concepts", []))
            concepts_list = [item["name"] for item in ai_concepts]

        if not concepts_list:
            concepts_list = [skill]

        concepts = [
            {"name": name, "difficulty": DIFFICULTIES.copy()}
            for name in concepts_list
        ]

        all_evidence = (
            evidence["resume_skill_evidence"]
            + evidence["resume_project_evidence"]
            + evidence["resume_experience_evidence"]
        )

        areas.append({
            "skill": skill,
            "resume_evidence": all_evidence[0] if all_evidence else None,
            "concepts": concepts,
            "resume_skill_evidence": evidence["resume_skill_evidence"],
            "resume_project_evidence": evidence["resume_project_evidence"],
            "resume_experience_evidence": evidence["resume_experience_evidence"],
            "resume_supported": supported,
        })

    resume_only_skills = [
        skill for skill in resume_skills
        if not any(skills_match(skill, required) for required in required_skills)
    ]

    print("DEBUG resume_skills:", resume_skills)
    print("DEBUG role_required_skills:", required_skills)
    print("DEBUG common_skills:", common_skills)
    print("DEBUG missing_role_skills:", missing_role_skills)

    return {
        "role": role,
        "resume_skills": resume_skills,
        "role_required_skills": required_skills,
        "common_skills": common_skills,
        "resume_only_skills": resume_only_skills,
        "missing_role_skills": missing_role_skills,
        "skill_areas": areas,
        "note": (
            "Resume-supported skills require evidence found in the resume. "
            "Each listed concept has Easy, Medium, and Hard difficulty levels."
        ),
    }
'''

start = source.index("def generate_role_requirements(")
source = source[:start] + new_generator.strip() + "\n"

path.write_text(source, encoding="utf-8")
print("Updated:", path)
print("Backup :", backup)
