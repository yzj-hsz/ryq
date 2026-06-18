"""邮箱验证码发送（开发默认 mock，生产可配置 SMTP）。"""
from __future__ import annotations

import os
import smtplib
from email.header import Header
from email.utils import formataddr, parseaddr
from email.mime.text import MIMEText


class EmailClient:
    def send_code(self, email: str, code: str) -> bool:
        raise NotImplementedError


class MockEmailClient(EmailClient):
    def send_code(self, email: str, code: str) -> bool:
        print(f"--- [MOCK EMAIL] Verification code {code} -> {email} ---")
        return True


class SmtpEmailClient(EmailClient):
    def __init__(
        self,
        host: str,
        port: int,
        user: str,
        password: str,
        sender: str,
        use_tls: bool = True,
    ) -> None:
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.sender = sender
        self.use_tls = use_tls

    def _sender_header_and_addr(self) -> tuple[str, str]:
        name, addr = parseaddr(self.sender)
        envelope_from = addr or self.user or self.sender
        if name and addr:
            return formataddr((str(Header(name, "utf-8")), addr)), envelope_from
        return envelope_from, envelope_from

    def send_code(self, email: str, code: str) -> bool:
        msg = MIMEText(f"您的饶有趣验证码为：{code}，5 分钟内有效。", "plain", "utf-8")
        msg["Subject"] = "饶有趣验证码"
        sender_header, envelope_from = self._sender_header_and_addr()
        msg["From"] = sender_header
        msg["To"] = email
        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.user:
                    server.login(self.user, self.password)
                server.sendmail(envelope_from, [email], msg.as_string())
            return True
        except Exception as exc:
            print(f"SMTP send failed: {exc}")
            return False


def get_email_client() -> EmailClient:
    provider = os.environ.get("EMAIL_PROVIDER", "mock").lower()
    if provider == "smtp":
        return SmtpEmailClient(
            host=os.environ.get("SMTP_HOST", "smtp.example.com"),
            port=int(os.environ.get("SMTP_PORT", "587")),
            user=os.environ.get("SMTP_USER", ""),
            password=os.environ.get("SMTP_PASSWORD", ""),
            sender=os.environ.get("SMTP_FROM", os.environ.get("SMTP_USER", "noreply@example.com")),
            use_tls=os.environ.get("SMTP_USE_TLS", "true").lower() == "true",
        )
    return MockEmailClient()
