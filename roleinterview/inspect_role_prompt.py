from app.services.role_requirements import build_role_prompt

resume = """
Name: Demo Candidate
Skills: SQL, Python, Power BI, Excel, DAX, Power Query.
Project: Sales Analytics Dashboard using Power BI and DAX.
"""

prompt = build_role_prompt("Data Analyst", resume)

print("PROMPT LENGTH:", len(prompt))
print("\n--- PROMPT RULES ---")
print(prompt[prompt.find("Task:"):])
