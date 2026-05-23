# WhatsApp Magic

ClientPad's WhatsApp integration turns inbound messages into structured client operations: leads, conversations, bookings, payments, follow-ups, and pipeline activity.

## Capabilities

- Lead capture from inbound WhatsApp messages.
- Shared owner inbox with assignment and status.
- Pipeline movement from new lead to quoted, booked, completed, paid, and review requested.
- AI-assisted reply drafts where configured.
- Payment link delivery through supported providers.
- Webhook diagnostics in the dashboard.

## Setup requirements

You need:

1. A Meta Business account.
2. A WhatsApp Business phone number.
3. WhatsApp app credentials.
4. A webhook URL pointing at your ClientPad server.
5. A default ClientPad workspace for inbound messages.

## CLI setup

```bash
clientpad init --whatsapp
clientpad migrate
clientpad whatsapp:setup
clientpad whatsapp:flows salon
```

## Webhook server

```ts
import { createWhatsAppWebhookHandler } from "@clientpad/whatsapp";

export const whatsappWebhook = createWhatsAppWebhookHandler({
  databaseUrl: process.env.DATABASE_URL!,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
  appSecret: process.env.WHATSAPP_APP_SECRET!,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  defaultWorkspaceId: process.env.CLIENTPAD_WORKSPACE_ID!,
});
```

## Dashboard diagnostics

The dashboard can show whether WhatsApp credentials are present, whether the webhook is configured, and whether recent inbound activity has reached the backend.

[Back to ClientPad](/)
