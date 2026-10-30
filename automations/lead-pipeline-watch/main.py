#!/usr/bin/env python3
"""Lead pipeline automation for dutaintegra.my.

Runs on a schedule (e.g., every 15 min) to:
  * Auto-assign high-score leads to roles
  * Flag stale leads (new > 24h, contacted > 3d)
  * Send webhook notifications on status changes
  * Generate daily pipeline summary

Deterministic, no LLM required.

Auth note: the admin routes accept an `x-admin-token` header (or `?token=`),
NOT a Bearer token. This script uses `x-admin-token`, matching requireAdminSession
in server/portal.mjs and server/portal-cloudflare.mjs.
"""

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

BASE = os.environ.get("WATCH_BASE_URL", "https://www.dutaintegra.my")
TIMEOUT = float(os.environ.get("WATCH_TIMEOUT", "20"))
STATE_KEY = "lead-pipeline-state"

# Thresholds
NEW_STALE_HOURS = 24
CONTACTED_STALE_DAYS = 3
HIGH_SCORE_THRESHOLD = 70
AUTO_ASSIGN_ROLE = "sales"


# --------------------------------------------------------------------------
# Agent-server helpers (custom secrets are not in the environment by default)
# --------------------------------------------------------------------------

def get_secret(name):
    """Fetch a named secret from the agent server, or '' if unavailable."""
    url = os.environ.get("AGENT_SERVER_URL", "").rstrip("/")
    key = os.environ.get("SESSION_API_KEY") or os.environ.get("OH_SESSION_API_KEYS_0", "")
    if not url or not key:
        return ""
    try:
        req = urllib.request.Request(
            f"{url}/api/settings/secrets/{name}",
            headers={"X-Session-API-Key": key},
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.read().decode().strip()
    except Exception as exc:
        print(f"[pipeline] secret {name} unavailable: {exc}")
        return ""


ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "") or get_secret("ADMIN_TOKEN")
NOTIFY_WEBHOOK = (
    os.environ.get("LEAD_PIPELINE_WEBHOOK", "")
    or get_secret("LEAD_PIPELINE_WEBHOOK")
)


def fire_callback(status="COMPLETED", error=None):
    """Signal run completion. Must be called on every exit path."""
    url = os.environ.get("AUTOMATION_CALLBACK_URL", "")
    if not url:
        return
    body = {"status": status, "run_id": os.environ.get("AUTOMATION_RUN_ID", "")}
    if error:
        body["error"] = error
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.environ.get('AUTOMATION_CALLBACK_API_KEY', '')}",
        },
    )
    try:
        urllib.request.urlopen(req, timeout=TIMEOUT)
    except Exception as exc:
        print(f"[pipeline] callback error (non-fatal): {exc}")


# --------------------------------------------------------------------------
# State, persisted in the automation KV store with a local-file fallback
# --------------------------------------------------------------------------

_KV_TOKEN = os.environ.get("AUTOMATION_KV_TOKEN", "")
_KV_BASE = os.environ.get("AUTOMATION_API_URL", "").rstrip("/")
_LOCAL_STATE = "/tmp/lead-pipeline-state.json"


def _kv_available():
    return bool(_KV_TOKEN and _KV_BASE)


def load_state():
    if _kv_available():
        try:
            req = urllib.request.Request(
                f"{_KV_BASE}/v1/kv/{STATE_KEY}",
                headers={"Authorization": f"Bearer {_KV_TOKEN}"},
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return json.loads(r.read())["value"]
        except urllib.error.HTTPError as exc:
            if exc.code != 404:
                print(f"[pipeline] kv read failed ({exc}); falling back to local file")
        except Exception as exc:
            print(f"[pipeline] kv read failed ({exc}); falling back to local file")
    try:
        with open(_LOCAL_STATE) as fh:
            return json.load(fh)
    except Exception:
        return {"last_seen_status": {}, "last_summary_sent": None}


def save_state(state):
    if _kv_available():
        try:
            req = urllib.request.Request(
                f"{_KV_BASE}/v1/kv/{STATE_KEY}",
                data=json.dumps(state).encode(),
                headers={
                    "Authorization": f"Bearer {_KV_TOKEN}",
                    "Content-Type": "application/json",
                },
                method="PUT",
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                r.read()
            return
        except Exception as exc:
            print(f"[pipeline] kv write failed ({exc}); falling back to local file")
    try:
        with open(_LOCAL_STATE, "w") as fh:
            json.dump(state, fh)
    except Exception as exc:
        print(f"[pipeline] local state write failed: {exc}")


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------

def fetch(path, method="GET", body=None, headers=None):
    """Return (status, body, elapsed_seconds). Status -1 = transport error."""
    url = BASE.rstrip("/") + path
    hdrs = {"User-Agent": "di-pipeline/1.0"}
    if ADMIN_TOKEN:
        hdrs["x-admin-token"] = ADMIN_TOKEN
    if headers:
        hdrs.update(headers)
    if body is not None:
        hdrs["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    else:
        data = None
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, r.read(200_000).decode("utf-8", "replace"), time.monotonic() - started
    except urllib.error.HTTPError as exc:
        try:
            b = exc.read(50_000).decode("utf-8", "replace")
        except Exception:
            b = ""
        return exc.code, b, time.monotonic() - started
    except Exception as exc:
        return -1, f"{type(exc).__name__}: {exc}", time.monotonic() - started


def send_webhook(text):
    if not NOTIFY_WEBHOOK:
        return
    payload = json.dumps({"text": text}).encode()
    req = urllib.request.Request(NOTIFY_WEBHOOK, data=payload, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=TIMEOUT)
        print("[pipeline] webhook sent")
    except Exception as exc:
        print(f"[pipeline] webhook failed: {exc}")


# --------------------------------------------------------------------------
# Checks
# --------------------------------------------------------------------------

def check_leads(state):
    """Fetch leads, auto-assign, flag stale, notify on status changes."""
    status, body, elapsed = fetch("/admin/pipeline", headers={"Accept": "application/json"})
    print(f"[pipeline] GET /admin/pipeline {status} {elapsed:.2f}s")
    if status != 200:
        return [f"Failed to fetch pipeline: {status}"]

    try:
        data = json.loads(body)
    except Exception as exc:
        return [f"Pipeline response not JSON: {exc}"]

    leads = data.get("leads", data.get("items", []))
    failures = []

    last_seen = state.get("last_seen_status", {})
    current_seen = {}

    for lead in leads:
        lead_id = lead.get("id")
        current_status = lead.get("status")
        current_seen[lead_id] = current_status

        # Notify on status change
        if lead_id in last_seen and last_seen[lead_id] != current_status:
            msg = (f":arrows_counterclockwise: Lead *{lead.get('name')}* ({lead.get('company', '—')}) "
                   f"moved: `{last_seen[lead_id]}` → `{current_status}` "
                   f"({lead.get('service', '—')})")
            send_webhook(msg)

        # Auto-assign high-score unassigned leads
        score = lead.get("leadScore", 0) or 0
        role = lead.get("assignedRole") or lead.get("assigned_role")
        if score >= HIGH_SCORE_THRESHOLD and not role and lead_id:
            patch_status, patch_body, _ = fetch(
                f"/admin/leads/{lead_id}",
                method="PATCH",
                body={"assigned_role": AUTO_ASSIGN_ROLE},
            )
            if patch_status == 200:
                msg = (f":star: High-score lead auto-assigned to *{AUTO_ASSIGN_ROLE}*: "
                       f"*{lead.get('name')}* ({lead.get('company', '—')}) score={score}")
                send_webhook(msg)
                print(f"[pipeline] auto-assigned {lead_id} to {AUTO_ASSIGN_ROLE}")
            else:
                failures.append(f"Auto-assign failed for {lead_id}: {patch_status} {patch_body[:120]}")

        # Flag stale leads
        created = lead.get("created_at")
        if created:
            try:
                created_dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                age = datetime.now(timezone.utc) - created_dt
                if current_status == "new" and age > timedelta(hours=NEW_STALE_HOURS):
                    print(f"[pipeline] STALE new > {NEW_STALE_HOURS}h: {lead_id}")
                elif current_status == "contacted" and age > timedelta(days=CONTACTED_STALE_DAYS):
                    print(f"[pipeline] STALE contacted > {CONTACTED_STALE_DAYS}d: {lead_id}")
            except Exception:
                pass

    state["last_seen_status"] = current_seen
    return failures


def send_daily_summary(state):
    """Send daily pipeline summary if not already sent today."""
    last = state.get("last_summary_sent")
    today = datetime.now(timezone.utc).date().isoformat()
    if last == today:
        return

    status, body, _ = fetch("/admin/pipeline", headers={"Accept": "application/json"})
    if status != 200:
        return

    try:
        data = json.loads(body)
    except Exception:
        return

    leads = data.get("leads", data.get("items", []))
    by_status = {}
    for l in leads:
        s = l.get("status", "unknown")
        by_status[s] = by_status.get(s, 0) + 1

    lines = [f":clipboard: *Daily Pipeline Summary* ({today})"]
    for s in ["new", "contacted", "qualified", "proposal", "won", "closed", "lost", "archived"]:
        if by_status.get(s):
            lines.append(f"  • {s}: {by_status[s]}")
    lines.append(f"  • *Total*: {len(leads)}")

    send_webhook("\n".join(lines))
    state["last_summary_sent"] = today


def main():
    if not ADMIN_TOKEN:
        print("[pipeline] ERROR: ADMIN_TOKEN is not set; cannot authenticate. Aborting.")
        fire_callback("FAILED", "ADMIN_TOKEN not set")
        return 1

    print(f"[pipeline] probing {BASE}")
    state = load_state()
    failures = []

    try:
        failures += check_leads(state)
        send_daily_summary(state)
    except Exception as exc:
        failures.append(f"unexpected error: {type(exc).__name__}: {exc}")

    save_state(state)

    if failures:
        print(f"[pipeline] FAIL: {len(failures)} issues")
        for f in failures:
            print(f"[pipeline]   - {f}")
        fire_callback("FAILED", "; ".join(failures))
        return 1
    else:
        print("[pipeline] OK")
        fire_callback("COMPLETED")
        return 0


if __name__ == "__main__":
    try:
        exit(main())
    except Exception as exc:
        fire_callback("FAILED", f"{type(exc).__name__}: {exc}")
        print(f"[pipeline] CRASH: {exc}")
        exit(1)