# @abdulmuiz44/clientpad-whatsapp

Fetch-standard WhatsApp webhook handler and AI assistant utilities for ClientPad.
Fetch-compatible WhatsApp Cloud API helpers for ClientPad. The package is designed for self-hosted runtimes (Node, Workers, Bun, Deno-compatible servers) by accepting injected `fetch`, ClientPad credentials, Meta WhatsApp credentials, and webhook verification tokens.

## Install

```sh
pnpm add @abdulmuiz44/clientpad-whatsapp @abdulmuiz44/clientpad-core @abdulmuiz44/clientpad-sdk
```

## Environment

Set these values in your hosting platform:

```sh
CLIENTPAD_BASE_URL="https://clientpad.example.com"
CLIENTPAD_API_KEY="cp_live_..."
WHATSAPP_ACCESS_TOKEN="EAAG..."
WHATSAPP_PHONE_NUMBER_ID="1234567890"
WHATSAPP_VERIFY_TOKEN="choose-a-long-random-token"
```

Use `WHATSAPP_VERIFY_TOKEN` as the verify token when configuring the Meta webhook subscription.

## Minimal webhook handler

```ts
import { createWhatsAppWebhookHandler } from "@abdulmuiz44/clientpad-whatsapp";

export const handler = createWhatsAppWebhookHandler({
  databaseUrl: process.env.DATABASE_URL,
  workspaceId: process.env.CLIENTPAD_WORKSPACE_ID!,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  aiProvider: optionalProvider,
});
```

If `aiProvider` is omitted, the handler uses deterministic keyword routing for booking, quote, and payment intents.
const handleWhatsAppWebhook = createWhatsAppWebhookHandler({
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
  whatsAppAccessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  fetch,
  async onMessage({ message, contact }) {
    console.log("Incoming WhatsApp message", {
      from: message.from,
      type: message.type,
      name: contact?.profile?.name,
    });
  },
});

export async function POST(request: Request) {
  return handleWhatsAppWebhook(request);
}

export async function GET(request: Request) {
  return handleWhatsAppWebhook(request);
}
```

## Create ClientPad leads from WhatsApp messages

```ts
import { createServiceBusinessFlow } from "@abdulmuiz44/clientpad-whatsapp";

export const handleWhatsAppWebhook = createServiceBusinessFlow({
  clientpadBaseUrl: process.env.CLIENTPAD_BASE_URL!,
  clientpadApiKey: process.env.CLIENTPAD_API_KEY!,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
  whatsAppAccessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  fetch,
  source: "whatsapp",
  defaultServiceInterest: "general-enquiry",
  replyText: "Thanks for contacting us. Our team will follow up shortly.",
});
```

The service-business flow parses incoming webhook messages, normalizes Nigerian phone numbers to `+234...` format for ClientPad leads, creates a lead through the ClientPad SDK, and optionally sends an acknowledgement through the WhatsApp Cloud API.

## Sending messages

```ts
import {
  createReplyButtonsMessage,
  sendWhatsAppMessage,
} from "@abdulmuiz44/clientpad-whatsapp";

await sendWhatsAppMessage({
  whatsAppAccessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  fetch,
  to: "+2348012345678",
  message: createReplyButtonsMessage({
    body: "What service do you need?",
    buttons: [
      { id: "quote", title: "Get quote" },
      { id: "support", title: "Support" },
    ],
  }),
});
```

## Payload helpers

Use `parseWhatsAppWebhookPayload(payload)` when your framework already parses JSON bodies. Use `verifyMetaWebhook({ mode, token, challenge, verifyToken })` if you need to handle Meta's webhook verification outside the provided request handler.
