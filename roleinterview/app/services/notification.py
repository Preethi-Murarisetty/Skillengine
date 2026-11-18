import os
import smtplib
import smtplib
from email.message import EmailMessage

from fastapi import HTTPException


def send_assessment_otp(recipient: str, otp: str, assessment_title: str) -> None:
    host = os.getenv("SMTP_HOST", "").strip()
    sender = os.getenv("SMTP_FROM", "").strip()
    if not host or not sender:
        raise HTTPException(
            status_code=503,
            detail="Assessment OTP delivery is not configured.",
        )

    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    message = EmailMessage()
    message["Subject"] = f"Your Skillengine verification code: {assessment_title}"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(
        f"Your assessment verification code is {otp}. "
        "It expires in 5 minutes and can be used once."
    )

    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=15) as client:
                if username:
                    client.login(username, password)
                client.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=15) as client:
                client.starttls()
                if username:
                    client.login(username, password)
                client.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise HTTPException(status_code=502, detail="Assessment OTP could not be delivered.") from exc
