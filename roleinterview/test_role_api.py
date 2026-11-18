import requests

url = "http://127.0.0.1:8000/roles/requirements"

payload = {
    "role": "Data Scientist",
    "resume_text": """
    Technical Skills
    Python, SQL, Excel, Power BI, Data Cleaning,
    Data Visualization, Statistical Analysis
    """
}

response = requests.post(url, json=payload, timeout=120)

print("Status Code:", response.status_code)
print(response.text)
