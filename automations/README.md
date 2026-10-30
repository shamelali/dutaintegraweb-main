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
declares, and treats a 404 there as a failure.

It also reads `/api/health` and classifies what it finds into two kinds of
incident, counted and alerted separately:

| Kind | Headline | What it means |
|---|---|---|
| outage | `:rotating_light:` | A route is down, a bundle 404s, or the gateway is unreachable |
| persistence | `:card_index_dividers:` | The site is up but the data layer is not durable |

The persistence case is the one that used to be invisible. `/api/health`
reported `ok: true` while leads were appended to `data/*.jsonl`, which a
serverless redeploy throws away. It now answers 503 when the store is unusable,
and the watch flags a `jsonl` backend, a missing `health_probe` table (an
unapplied migration), or a failed write/read round-trip — each named in the
alert so it is not mistaken for downtime. `/api/health` is therefore not in the
must-be-200 list; `check_datastore()` owns it.

### Configuration

Defaults are baked in; override with environment variables on the automation.

| Variable | Default | Meaning |
|---|---|---|
| `WATCH_BASE_URL` | `https://www.dutaintegra.my` | Target site |
| `WATCH_TIMEOUT` | `20` | Per-request timeout, seconds |
| `WATCH_ALERT_AFTER` | `3` | Consecutive failures before alerting |
| `WATCH_ALLOW_JSONL` | unset | Set to `1` on a preview that deliberately uses the JSONL store, so the persistence check stays quiet |

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

## Lead pipeline watch (`lead-pipeline-watch/`)

A second deterministic script that polls `/admin/pipeline`, auto-assigns
high-score leads to the `sales` role, flags stale leads, notifies on status
changes, and posts a daily pipeline summary to a webhook.

**Status: available but not yet deployed.** It is not in the deployed table
above and nothing invokes it. To use it:

1. Set `ADMIN_TOKEN` (and optionally `LEAD_PIPELINE_WEBHOOK`) on the
   automation. Auth uses the `x-admin-token` header — the same token the
   server's `requireAdminSession` accepts for scripts/cron. Do **not** use a
   Bearer token.
2. Upload the tarball (`automations/lead-pipeline-watch/`) as a new OpenHands
   automation on a 15-minute cron. Re-uploading creates a *new* automation;
   editing the file in the repo changes nothing until redeployed.
3. State is persisted in the automation KV store (`lead-pipeline-state` key)
   with a `/tmp` fallback for local runs.

It targets the legacy `/admin/pipeline` + `/admin/leads/:id` endpoints, which
both forks still serve. If you migrate ops to the Phase-4 workspace API
(`/api/workspace/admin/*`), update the paths here too.