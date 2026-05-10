# WhatsApp Cloud API Example

This example shows how to connect a WhatsApp Cloud API webhook to ClientPad while keeping customer-facing automations low-data and easy to customize.

It includes:

- `server.mjs` — an Express webhook server mounted at `/whatsapp/webhook`.
- `flows/salon.json` — salon booking, services, payment, and review prompts.
- `flows/mechanic.json` — mechanic inspection, quote, emergency, location, and pickup flows.
- `flows/tailor.json` — tailor order, measurement/photo, payment, completion, and review flows.

The flow files are intentionally plain JSON examples. Adapt the field names to your WhatsApp sender, workflow engine, or ClientPad integration layer.

## Install

From the repository root:

```bash
pnpm add express
pnpm add @clientpad/server
```

## Environment variables

```bash
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/clientpad
API_KEY_PEPPER=replace-with-a-long-random-secret
CLIENTPAD_API_KEY=cp_live_or_test_key
WHATSAPP_VERIFY_TOKEN=choose-a-webhook-verification-token
WHATSAPP_ACCESS_TOKEN=EAAG...from-meta
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_APP_SECRET=optional-meta-app-secret
BUSINESS_NAME="ClientPad Demo Salon"
```

## Run

```bash
node examples/whatsapp/server.mjs
```

Expose the server with a public HTTPS URL, then configure your Meta WhatsApp Cloud API webhook callback URL as:

```text
https://your-domain.example/whatsapp/webhook
```

Use the same `WHATSAPP_VERIFY_TOKEN` value when Meta asks for the webhook verification token.

## What the server does

- Handles Meta webhook verification with `GET /whatsapp/webhook`.
- Receives WhatsApp Cloud API messages with `POST /whatsapp/webhook`.
- Stores a lightweight inbound lead/event in ClientPad through `createClientPadHandler`.
- Sends a low-data text reply by default.
- Keeps media optional; the flow JSON files include placeholder image URLs only.

## WhatsApp Cloud API constraints to remember

- Reply buttons support a maximum of **3** buttons per interactive message.
- List messages support a maximum of **10** rows per message.
- Free-form customer service messages are available only inside the **24-hour customer service window** after a user messages you.
- Outside that 24-hour session window, you must use approved WhatsApp message templates.

## Low-data media guidance

The included flows default to text, reply buttons, and lists. If you add images, keep them optional and compressed, and replace placeholder URLs such as `https://example.com/images/salon-style.jpg` with your own hosted assets.
