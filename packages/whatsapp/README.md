# @abdulmuiz44/clientpad-whatsapp

Fetch-standard WhatsApp webhook handler and AI assistant utilities for ClientPad.

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
