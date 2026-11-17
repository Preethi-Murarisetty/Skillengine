import os
from typing import Any

import requests
from fastapi import HTTPException


def execute_test_case(source_code: str, language_id: int, stdin: str) -> dict[str, Any]:
    base_url = os.getenv("CORE_JUDGE0_URL", "").rstrip("/")
    if not base_url:
        raise HTTPException(status_code=503, detail="Server-side code evaluation is not configured.")

    allowed_ids = {
        int(value.strip())
        for value in os.getenv("CORE_JUDGE0_ALLOWED_LANGUAGE_IDS", "").split(",")
        if value.strip().isdigit()
    }
    if not allowed_ids:
        raise HTTPException(status_code=503, detail="Allowed coding languages are not configured.")
    if language_id not in allowed_ids:
        raise HTTPException(status_code=422, detail="The requested programming language is not allowed.")

    try:
        cpu_time_limit = float(os.getenv("CORE_JUDGE0_CPU_SECONDS", "3"))
        memory_limit = int(os.getenv("CORE_JUDGE0_MEMORY_KB", "128000"))
        timeout = float(os.getenv("CORE_JUDGE0_TIMEOUT_SECONDS", "20"))
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="Code evaluation limits are incorrectly configured.") from exc

    headers = {"Content-Type": "application/json"}
    api_key = os.getenv("CORE_JUDGE0_API_KEY", "").strip()
    if api_key:
        headers["X-Auth-Token"] = api_key

    try:
        response = requests.post(
            f"{base_url}/submissions",
            params={"base64_encoded": "false", "wait": "true"},
            headers=headers,
            json={
                "source_code": source_code,
                "language_id": language_id,
                "stdin": stdin,
                "cpu_time_limit": cpu_time_limit,
                "memory_limit": memory_limit,
            },
            timeout=timeout,
        )
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise HTTPException(status_code=502, detail="The code evaluation service failed.") from exc

    status = result.get("status")
    if not isinstance(status, dict) or not status.get("description"):
        raise HTTPException(status_code=502, detail="The code evaluation service returned an invalid result.")
    return result
