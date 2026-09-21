# Duta Integra automations

## Uptime and deploy-integrity watch (`uptime-watch/`)

A deterministic HTTP probe for `https://www.dutaintegra.my`, run as an OpenHands
automation on a cron schedule. No LLM is involved — the checks are a fixed set of
assertions, so every run is cheap and predictable.

### Why not just ping `/`

The homepage can return 200 while the site is completely broken. Every build
emits a new hashed bundle (`index-<hash>.js`), so a deploy that ships a stale
`index.html` or fails to upload assets yields a blank page that still answers
200. The watch therefore also fetches every `/assets/*` reference the homepage
declares, and treats a 404 there as a failure. It also probes `/api/health` on
its own, since the serverless gateway can fail while the static site keeps
serving — and checks `ok: true` in the response body, because a 200 alone
doesn't prove the API is healthy.

### Configuration

Defaults are baked in; override with environment variables on the automation.

| Variable | Default | Meaning |
|---|---|---|
| `WATCH_BASE_URL` | `https://www.dutaintegra.my` | Target site |
| `WATCH_TIMEOUT` | `20` | Per-request timeout, seconds |
| `WATCH_ALERT_AFTER` | `3` | Consecutive failures before alerting |

### Alerting is opt-in

No alert channel is configured by default, so the automation is safe to deploy
immediately — it will just record run history in the OpenHands UI. To enable
alerting, add a secret named `ALERT_WEBHOOK_URL` holding a Slack (or any) webhook
URL. The script fetches it from the agent server at runtime.

Alerting is deliberately damped: a single blip never notifies. `ALERT_AFTER`
consecutive failures trigger one alert, further failures stay quiet, and a
recovery notice is sent when the site comes back. Consecutive-failure state lives
in the automation KV store, falling back to a local file for local runs.

### Running it locally

```bash
python3 automations/uptime-watch/main.py
# or point it somewhere else:
WATCH_BASE_URL=http://127.0.0.1:4711 python3 automations/uptime-watch/main.py
```

Locally `AGENT_SERVER_URL` and `SESSION_API_KEY` are unset, so no secret is
fetched, no webhook fires, and state goes to `/tmp/watch-state.json`. That is the
intended behaviour, not a misconfiguration.

The callback function only posts when `AUTOMATION_CALLBACK_URL` is set, which
only happens inside a real automation run.

### Suggested schedule

Every 15 minutes (`*/15 * * * *`) is a reasonable balance — the probe is a
handful of requests, and the damping means brief deploy windows don't page
anyone. Going tighter than 5 minutes buys little for a marketing site and adds
load.