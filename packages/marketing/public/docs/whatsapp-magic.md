# WhatsApp Magic — ClientPad

ClientPad's WhatsApp integration turns everyday WhatsApp conversations into structured CRM activity. Service businesses can capture leads, manage bookings, send payment links, and collect reviews — all through WhatsApp.

## Capabilities

- **Lead Capture** — Incoming WhatsApp messages auto-create leads with contact info and intent detection.
- **Booking Flows** — Clients can request services, receive quotes, and confirm bookings in chat.
- **Payment Links** — Send payment links through supported providers and track payment status.
- **Follow-Ups** — Automated reminders, follow-up messages, and review requests.
- **Pipeline Tracking** — Each WhatsApp conversation maps to a CRM pipeline stage.
- **Team Inbox** — Shared inbox with assignment, AI reply suggestions, and owner-approval workflows.

## Setup

ClientPad connects to the WhatsApp Business Platform through provider-based integration. You'll need:

1. A Meta Business account
2. A WhatsApp Business phone number
3. Webhook configuration pointing to your ClientPad server

```bash
clientpad init --whatsapp
clientpad migrate
clientpad whatsapp:setup
clientpad whatsapp:flows salon
```

## Webhook Server

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

## Supported Features

- WhatsApp message receipt and sending
- Conversation threading and assignment
- AI-suggested reply drafts
- Pipeline stage management
- Owner approval workflows for sensitive actions
- Provider-based payment link delivery

## Limitations

- Requires a Meta Business Account and WhatsApp Business Platform access
- Payment processing requires a supported payment provider integration
- Message template approval follows Meta's policies

[← Back to ClientPad](/)
