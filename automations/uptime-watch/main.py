#!/usr/bin/env python3
"""Uptime and deploy-integrity watch for dutaintegra.my.

Deterministic on purpose: this is a fixed set of HTTP assertions on a schedule,
so it needs no LLM. Runs as an OpenHands automation (cron), entrypoint
`python3 main.py`.

What it catches that a naive "is the homepage up" ping does not:
  * a deploy whose index.html points at a hashed bundle that 404s (the failure
    mode this repo is most exposed to, since every build renames the bundle)
  * the API gateway going down while the static site still serves
  * routes silently regressing to 404

Alerting is optional and off unless an ALERT_WEBHOOK_URL secret is configured.
A single blip does not alert; ALERT_AFTER consecutive failures do, and a
recovery notice is sent when it comes back.
"""

import json
import os
import re
import time
import urllib.error
import urllib.request

BASE = os.environ.get("WATCH_BASE_URL", "https://www.dutaintegra.my")
TIMEOUT = float(os.environ.get("WATCH_TIMEOUT", "20"))
ALERT_AFTER = int(os.environ.get("WATCH_ALERT_AFTER", "3"))
STATE_KEY = "watch-state"

# Paths that must always answer 200. "/" is the React app; the API health probe
# covers the serverless gateway, which can fail independently of the static site.
MUST_BE_200 = ["/", "/api/health"]


# --------------------------------------------------------------------------
# Agent-server helpers (custom secrets are not in the environment by default)
# --------------------------------------------------------------------------

def get_secret(name):
    """Fetch a named secret from the agent server, or "" if unavailable."""
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
        print(f"[watch] secret {name} unavailable: {exc}")
        return ""


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
        print(f"[watch] callback error (non-fatal): {exc}")


# --------------------------------------------------------------------------
# State, so one transient blip does not page anyone
# --------------------------------------------------------------------------

_KV_TOKEN = os.environ.get("AUTOMATION_KV_TOKEN", "")
_KV_BASE = os.environ.get("AUTOMATION_API_URL", "").rstrip("/")
_LOCAL_STATE = "/tmp/watch-state.json"


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
                print(f"[watch] kv read failed ({exc}); falling back to local file")
        except Exception as exc:
            print(f"[watch] kv read failed ({exc}); falling back to local file")
    try:
        with open(_LOCAL_STATE) as fh:
            return json.load(fh)
    except Exception:
        return {}


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
            print(f"[watch] kv write failed ({exc}); falling back to local file")
    try:
        with open(_LOCAL_STATE, "w") as fh:
            json.dump(state, fh)
    except Exception as exc:
        print(f"[watch] local state write failed: {exc}")


# --------------------------------------------------------------------------
# Checks
# --------------------------------------------------------------------------

def fetch(path, method="GET"):
    """Return (status, body, elapsed_seconds). Status -1 means transport error."""
    url = BASE.rstrip("/") + path
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "di-watch/1.0"})
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            body = r.read(300_000).decode("utf-8", "replace")
            return r.status, body, time.monotonic() - started
    except urllib.error.HTTPError as exc:
        try:
            body = exc.read(50_000).decode("utf-8", "replace")
        except Exception:
            body = ""
        return exc.code, body, time.monotonic() - started
    except Exception as exc:
        return -1, f"{type(exc).__name__}: {exc}", time.monotonic() - started


def check_paths():
    """Every MUST_BE_200 path returns 200."""
    failures = []
    for path in MUST_BE_200:
        status, body, elapsed = fetch(path)
        ok = status == 200
        print(f"[watch] {path:<14} {status} {elapsed:.2f}s")
        if not ok:
            failures.append(f"{path} returned {status} (expected 200)")
            continue
        if path == "/api/health":
            # A 200 that says ok:false is still a failure worth reporting.
            try:
                payload = json.loads(body)
            except Exception:
                failures.append("/api/health did not return JSON")
                continue
            if payload.get("ok") is not True:
                failures.append(f"/api/health reported ok={payload.get('ok')!r}")
            if payload.get("inboxConfigured") is not True:
                # Not fatal: the site serves without outbound email.
                print("[watch]   warning: inboxConfigured is not true")
    return failures


def check_asset_integrity():
    """The JS bundle referenced by the homepage must actually be fetchable.

    This is the check that matters most here: every build emits a new hashed
    filename, so a deploy that ships a stale index.html or a missing asset
    produces a blank page while the homepage itself still returns 200.
    """
    status, html, _ = fetch("/")
    if status != 200:
        return ["cannot verify assets: homepage did not return 200"]

    refs = re.findall(r'(?:src|href)="(/assets/[^"]+)"', html)
    if not refs:
        return ["homepage references no /assets/* bundle"]

    failures = []
    for ref in refs:
        astatus, _, _ = fetch(ref)
        print(f"[watch] {ref} {astatus}")
        if astatus != 200:
            failures.append(f"asset {ref} returned {astatus}")
    return failures


def send_alert(webhook, text):
    if not webhook:
        return
    payload = json.dumps({"text": text}).encode()
    req = urllib.request.Request(
        webhook,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=TIMEOUT)
        print("[watch] alert sent")
    except Exception as exc:
        print(f"[watch] alert delivery failed: {exc}")


# --------------------------------------------------------------------------

def main():
    state = load_state()
    previous_failures = int(state.get("consecutive_failures", 0))
    alerted = bool(state.get("alerted", False))

    print(f"[watch] probing {BASE}")

    all_failures = []
    try:
        all_failures += check_paths()
        all_failures += check_asset_integrity()
    except Exception as exc:
        all_failures.append(f"unexpected error: {type(exc).__name__}: {exc}")

    webhook = get_secret("ALERT_WEBHOOK_URL")

    if all_failures:
        consecutive = previous_failures + 1
        print(f"[watch] FAIL ({consecutive} consecutive)")
        for f in all_failures:
            print(f"[watch]   - {f}")
        if consecutive >= ALERT_AFTER and not alerted:
            send_alert(
                webhook,
                f":rotating_light: {BASE} failing {consecutive}x in a row\n"
                + "\n".join(f"- {f}" for f in all_failures),
            )
            alerted = True
        state.update(
            consecutive_failures=consecutive,
            alerted=alerted,
            last_failures=all_failures,
            last_status="fail",
        )
    else:
        print("[watch] OK")
        if alerted:
            send_alert(webhook, f":white_check_mark: {BASE} recovered")
        state.update(
            consecutive_failures=0,
            alerted=False,
            last_failures=[],
            last_status="ok",
        )

    state["last_checked"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save_state(state)

    if all_failures:
        # Report FAILED so the run history shows the outage, but the site being
        # down is data, not a script crash.
        fire_callback("FAILED", "; ".join(all_failures))
    else:
        fire_callback("COMPLETED")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        fire_callback("FAILED", f"{type(exc).__name__}: {exc}")
        raise