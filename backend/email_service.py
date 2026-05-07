import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

GMAIL_ADDRESS      = os.getenv("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
APP_NAME           = os.getenv("APP_NAME", "KNE Vape Shop")


async def send_verification_email(to_email: str, name: str, code: str):
    """Send a 6-digit verification code to the user's email."""
    subject = f"{APP_NAME} — Email Verification"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: #f5f5f5; margin: 0; padding: 40px 20px; }}
        .card {{ background: #fff; max-width: 480px; margin: 0 auto;
                 border-radius: 12px; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }}
        .logo {{ font-size: 18px; font-weight: 700; color: #111; margin-bottom: 32px; }}
        h2 {{ font-size: 22px; color: #111; margin: 0 0 12px; }}
        p {{ color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }}
        .code {{ font-size: 40px; font-weight: 700; letter-spacing: 12px;
                 color: #111; background: #f0f0f0; border-radius: 10px;
                 padding: 20px 0; text-align: center; margin: 24px 0; }}
        .note {{ font-size: 13px; color: #999; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">{APP_NAME}</div>
        <h2>Verify your email</h2>
        <p>Hi {name}, enter the code below to activate your account. It expires in <strong>10 minutes</strong>.</p>
        <div class="code">{code}</div>
        <p class="note">If you did not register for {APP_NAME}, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"]    = f"{APP_NAME} <{GMAIL_ADDRESS}>"
    message["To"]      = to_email
    message.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        message,
        hostname="smtp.gmail.com",
        port=587,
        start_tls=True,
        username=GMAIL_ADDRESS,
        password=GMAIL_APP_PASSWORD,
    )


async def send_password_reset_email(to_email: str, name: str, code: str):
    """Send a password reset code (Phase 2 nice-to-have)."""
    subject = f"{APP_NAME} — Password Reset"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: #f5f5f5; margin: 0; padding: 40px 20px; }}
        .card {{ background: #fff; max-width: 480px; margin: 0 auto;
                 border-radius: 12px; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }}
        .logo {{ font-size: 18px; font-weight: 700; color: #111; margin-bottom: 32px; }}
        h2 {{ font-size: 22px; color: #111; margin: 0 0 12px; }}
        p {{ color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }}
        .code {{ font-size: 40px; font-weight: 700; letter-spacing: 12px;
                 color: #111; background: #f0f0f0; border-radius: 10px;
                 padding: 20px 0; text-align: center; margin: 24px 0; }}
        .note {{ font-size: 13px; color: #999; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">{APP_NAME}</div>
        <h2>Reset your password</h2>
        <p>Hi {name}, use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div class="code">{code}</div>
        <p class="note">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"]    = f"{APP_NAME} <{GMAIL_ADDRESS}>"
    message["To"]      = to_email
    message.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        message,
        hostname="smtp.gmail.com",
        port=587,
        start_tls=True,
        username=GMAIL_ADDRESS,
        password=GMAIL_APP_PASSWORD,
    )