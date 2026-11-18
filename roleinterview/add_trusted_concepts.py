from pathlib import Path

path = Path("app/services/role_requirements.py")
source = path.read_text(encoding="utf-8")

marker = "TRUSTED_CONCEPTS = {"
if marker not in source:
    raise SystemExit("ERROR: TRUSTED_CONCEPTS dictionary not found.")

additions = '''    "statistics": [
        "Descriptive Statistics",
        "Mean, Median, and Mode",
        "Variance and Standard Deviation",
        "Probability Distributions",
        "Sampling and Sampling Bias",
        "Correlation and Covariance",
        "Hypothesis Testing",
        "Confidence Intervals",
        "Statistical Significance",
    ],
    "dashboard development": [
        "Dashboard Design Principles",
        "KPI Selection and Definition",
        "Visual Layout and Information Hierarchy",
        "Interactive Filters and Slicers",
        "Drill-Down and Drill-Through",
        "Dashboard Performance and Usability",
        "Dashboard Validation and Publishing",
    ],
    "data storytelling": [
        "Identifying the Main Insight",
        "Structuring a Data Narrative",
        "Choosing Evidence to Support Insights",
        "Context and Business Impact",
        "Communicating Findings to Stakeholders",
        "Recommendations from Data",
    ],
    "chart selection": [
        "Comparison Charts",
        "Trend and Time-Series Charts",
        "Distribution Charts",
        "Relationship Charts",
        "Part-to-Whole Charts",
        "Choosing Charts for Data Types",
        "Avoiding Misleading Visualizations",
    ],
    "tableau": [
        "Tableau Interface and Data Connections",
        "Dimensions and Measures",
        "Calculated Fields",
        "Filters and Parameters",
        "Building Worksheets and Charts",
        "Dashboards and Actions",
        "Data Blending and Relationships",
        "Publishing and Sharing Workbooks",
    ],
'''

if '"statistics": [' in source:
    raise SystemExit(
        'The "statistics" entry already exists. No changes made.'
    )

source = source.replace(
    marker,
    marker + "\n" + additions,
    1
)

compile(source, str(path), "exec")
path.write_text(source, encoding="utf-8")

print("SUCCESS: Concepts added and Python syntax validated.")
