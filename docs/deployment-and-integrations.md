# Deployment & Integrations Setup

Step-by-step for getting Dexii live on Render, plus the optional Twilio SMS
integration for friend invites.

---

## Environment variables

| Key | Required | Set where | Notes |
| --- | --- | --- | --- |
| `MONGO_URI` | Yes | Render dashboard | Mongo Atlas connection string. Marked `sync: false` in `render.yaml` so it is never committed. |
| `JWT_SECRET` | Yes | Auto | `generateValue: true` — Render creates it. |
| `NODE_ENV` | Yes | `render.yaml` | `production` |
| `ENABLE_MONGO` | Yes | `render.yaml` | `true` |
| `PUBLIC_APP_URL` | Yes | `render.yaml` | Canonical origin for invite links. |
| `RESEND_API_KEY` | Yes | **Render dashboard** | Declared `sync: false` in `render.yaml`, so Render prompts for the value and it is never committed. Without it, emails are only logged to the console — no error is raised and nothing is delivered. |
| `EMAIL_FROM` | No | Render dashboard | Defaults to Resend's sandbox sender. |
| `TWILIO_ACCOUNT_SID` | No | Render dashboard | See Twilio section. |
| `TWILIO_AUTH_TOKEN` | No | Render dashboard | |
| `TWILIO_FROM_NUMBER` | No | Render dashboard | E.164, e.g. `+15551234567`. |

---

## Render

### 1. Resume a suspended service

If `https://dexii.onrender.com` returns **503** with the header
`x-render-routing: suspend`, the service is suspended and no deploy will go
out until it is resumed. This is an account action; it cannot be fixed from
the codebase.

1. Open https://dashboard.render.com and select the **dexii** service.
2. Read the suspension banner:
   - **Free instance hours exhausted** — resets on the 1st of the month. To
     restore immediately, upgrade under **Settings → Instance Type**.
   - **Failed payment** — update the card under **Billing**.
3. Click **Resume Service** if offered.

> **Cause:** the free tier allows 750 instance-hours/month. The original
> keep-alive pinged every 14 minutes, 24/7, consuming roughly 730 hours and
> leaving almost no headroom for real traffic. `.github/workflows/keep-alive.yml`
> is now limited to waking hours.

### 2. Configure environment

**Environment** in the sidebar → confirm every **Required** row above is
present. Pay particular attention to `RESEND_API_KEY`, which fails silently.

#### Getting a `RESEND_API_KEY`

This is a secret issued by Resend, the email provider used for verification
codes and invite emails. It looks like `re_` followed by a random string.

1. Sign in at https://resend.com (the account that already sends Dexii's
   verification emails).
2. Go to **API Keys** in the sidebar.
3. Either copy an existing key, or **Create API Key** — name it `dexii-render`,
   permission **Sending access**. The value is shown **once**; copy it then.
4. In Render → **Environment → Add Environment Variable**, key
   `RESEND_API_KEY`, value the `re_...` string. Save.

> **Never paste the key into `render.yaml`.** That file is committed to git, so
> the secret would end up in the repository. It is declared there as
> `sync: false`, which tells Render to prompt for the value and keep it in the
> dashboard only. The same applies to `MONGO_URI`.

To send from your own domain rather than Resend's sandbox sender, verify the
domain in Resend under **Domains**, then set `EMAIL_FROM`.

### 3. Deploy

`autoDeploy: true` is set, so pushes to `main` deploy automatically. To force
one: **Manual Deploy → Deploy latest commit**.

### 4. Verify

```bash
curl https://dexii.onrender.com/api/health
# {"status":"ok","uptime":<n>}
```

This endpoint deliberately performs no database work, so it stays cheap enough
to use as the keep-alive target.

### Free-tier cold starts

The service sleeps after ~15 minutes idle and takes ~50 seconds to wake. The
branded splash screen in `src/index.html` covers this, showing a
"warming up the kettle" message rather than a blank page.

---

## Twilio (optional)

Invites work **without** Twilio. With no credentials the server returns a
`sms:` deep link and the client opens the user's own messaging app with the
invite pre-filled — zero cost, but the user taps send themselves.

Adding credentials makes the server send the SMS directly. **No code change is
required**; `server/src/utils/sendSms.js` detects the credentials at runtime.

### Steps

1. Sign up at https://www.twilio.com/try-twilio and verify your email + phone.
2. From the Console dashboard copy **Account SID** (begins `AC`) and
   **Auth Token**.
3. **Phone Numbers → Buy a number**, filter for **SMS** capability, and buy one
   (~$1.15/mo, covered by trial credit). Record it in E.164 format.
4. In Render → **Environment**, add all three variables from the table above.
5. Save. Render restarts the service automatically.

All three must be present; partial configuration stays in handoff mode.

### Caveats

- **Trial accounts can only send to numbers verified in the Twilio console.**
  Upgrade (add ~$20 credit) to message arbitrary recipients.
- **US A2P 10DLC registration is required** for reliable delivery. Unregistered
  application-to-person traffic is filtered by carriers. Twilio prompts for this.
- Pricing is roughly **$0.0079 per SMS** in the US.

### Failure behavior

A Twilio error never fails the invite. `sendSms` catches it, logs a warning,
and falls back to device handoff, returning a `warning` field. Credentials are
never logged or returned to the client.
