import re
from pathlib import Path

from eero import EeroClient

from core.client import COOKIE_FILE, ensure_client, reset_client
from core.errors import translate_errors

PHONE_IDENTIFIER_RE = re.compile(r"^[\+\d\s\-\(\)]+$")


async def auth_status() -> dict:
    client = await ensure_client()
    if not client.is_authenticated:
        return {"authenticated": False, "demo": False}

    try:
        account = await client.get_account()
        return {
            "authenticated": True,
            "demo": False,
            "name": account.get("name", ""),
            "email": account.get("email", {}).get("value", ""),
        }
    except Exception:
        return {"authenticated": False, "demo": False}


async def login(identifier: str) -> dict:
    client = await ensure_client()
    with translate_errors(status_code=400, code="auth_login_failed", message="Login failed"):
        await client.login(identifier)
        is_phone = bool(PHONE_IDENTIFIER_RE.match(identifier.strip()))
        channel = "phone" if is_phone else "email"
        return {"status": "verification_required", "message": f"Check your {channel} for a verification code."}


async def verify(code: str) -> dict:
    client = await ensure_client()
    with translate_errors(status_code=400, code="auth_verify_failed", message="Verification failed"):
        await client.verify(code)
        return {"status": "authenticated"}


async def logout() -> dict:
    client = await ensure_client()
    try:
        await client.logout()
    except Exception:
        pass

    cookie_path = Path(COOKIE_FILE)
    if cookie_path.exists():
        cookie_path.unlink()
    await reset_client()
    return {"status": "logged_out"}
