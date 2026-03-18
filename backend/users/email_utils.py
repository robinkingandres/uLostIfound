import json
import urllib.request
import urllib.error

from django.conf import settings


def send_resend_email(*, to_email, subject, text, html=None):
    """
    Send an email using Resend's HTTP API.
    Returns (ok: bool, error: str | None).
    """
    api_key = getattr(settings, 'RESEND_API_KEY', None)
    if not api_key:
        return False, "Resend API key is not configured."

    from_email = (
        getattr(settings, 'RESEND_FROM_EMAIL', None)
        or getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        or getattr(settings, 'EMAIL_HOST_USER', None)
    )
    if not from_email:
        return False, "Resend from email is not configured."

    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
    }
    if html:
        payload["html"] = html
    else:
        payload["text"] = text

    url = getattr(settings, 'RESEND_API_URL', 'https://api.resend.com/emails')
    timeout = int(getattr(settings, 'RESEND_TIMEOUT', getattr(settings, 'EMAIL_TIMEOUT', 20)))

    user_agent = getattr(settings, 'RESEND_USER_AGENT', 'uLostIfound/1.0')
    req = urllib.request.Request(
        url=url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": user_agent,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            # Resend returns 200 on success; just ensure no exception raised.
            _ = resp.read()
        return True, None
    except urllib.error.HTTPError as e:
        details = ""
        try:
            details = e.read().decode('utf-8')
        except Exception:
            details = ""
        return False, f"Resend API error {e.code}. {details}".strip()
    except Exception as e:
        return False, str(e)
