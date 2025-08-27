#!/usr/bin/env python3
"""
Alternative email sender using SMTP (Gmail, Outlook, or other SMTP service)
For urgent emails while waiting for AWS SES production access
"""

import smtplib
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os


def send_email_smtp(
    to_email: str,
    subject: str,
    body: str,
    smtp_server: str = "smtp.gmail.com",
    smtp_port: int = 587,
    from_email: Optional[str] = None,
    password: Optional[str] = None,
):
    """
    Send email using SMTP service

    For Gmail:
    - Enable 2-factor authentication
    - Generate app-specific password: https://myaccount.google.com/apppasswords
    - Use that password instead of your regular password
    """

    # Get credentials from environment if not provided
    from_email = from_email or os.environ.get("SMTP_FROM_EMAIL")
    password = password or os.environ.get("SMTP_PASSWORD")

    if not from_email or not password:
        print("Error: Set SMTP_FROM_EMAIL and SMTP_PASSWORD environment variables")
        print("Or provide them as arguments")
        return False

    # Create message
    msg = MIMEMultipart()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject

    # Add body
    msg.attach(MIMEText(body, "plain"))

    try:
        # Create SMTP session
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()  # Enable encryption
        server.login(from_email, password)

        # Send email
        text = msg.as_string()
        server.sendmail(from_email, to_email, text)
        server.quit()

        print(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"Error sending email: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python send-email-smtp.py <to_email> <subject> <body>")
        print("\nSet these environment variables:")
        print("  export SMTP_FROM_EMAIL='your-email@gmail.com'")
        print("  export SMTP_PASSWORD='your-app-password'")
        print("\nFor Gmail, get app password at: https://myaccount.google.com/apppasswords")
        sys.exit(1)

    to_email = sys.argv[1]
    subject = sys.argv[2]
    body = sys.argv[3]

    send_email_smtp(to_email, subject, body)
