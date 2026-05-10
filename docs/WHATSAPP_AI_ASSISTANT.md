# WhatsApp AI Assistant

ClientPad includes a WhatsApp assistant package for turning inbound WhatsApp Business webhook messages into lead intent, conversation summaries, and owner-approved reply drafts.

## Package

Install or import the workspace package:

```ts
import {
  createWhatsAppWebhookHandler,
  type WhatsAppAIProvider,
} from "@clientpad/whatsapp";
```

## AI provider interface

AI providers are injected through `createWhatsAppWebhookHandler`, but injection is optional. A provider implements:

- `detectIntent(message, context)` — returns a structured intent such as `booking`, `quote`, `payment`, or `general`.
- `suggestReplies(conversation, businessProfile)` — returns suggested WhatsApp reply drafts.
- `summarizeConversation(messages)` — returns a short summary for operators and CRM context.
- `suggestReminder(client, booking, serviceType)` — returns a reminder draft for a client booking.

```ts
const aiProvider: WhatsAppAIProvider = {
  async detectIntent(message, context) {
    return { intent: "booking", confidence: 0.9, reason: "Model classification" };
  },
  async suggestReplies(conversation, businessProfile) {
    return [
      {
        body: "Thanks. Please share your preferred appointment time.",
        confidence: 0.88,
        requiresOwnerApproval: false,
      },
    ];
  },
  async summarizeConversation(messages) {
    return "Customer asked to book an appointment.";
  },
  async suggestReminder(client, booking, serviceType) {
    return {
      body: `Reminder for ${serviceType}.`,
      sendAt: null,
      confidence: 0.8,
      requiresOwnerApproval: true,
    };
  },
};
```

## Webhook handler

```ts
export const whatsappWebhookHandler = createWhatsAppWebhookHandler({
  databaseUrl: process.env.DATABASE_URL,
  workspaceId: process.env.CLIENTPAD_WORKSPACE_ID!,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  aiProvider, // optional
  businessProfile: {
    name: "Acme Services",
    timezone: "Africa/Lagos",
  },
});
```

If `aiProvider` is omitted, ClientPad uses deterministic keyword routing:

| Intent | Keywords |
| --- | --- |
| booking | `book`, `appointment`, `tomorrow`, `today` |
| quote | `price`, `how much`, `cost` |
| payment | `pay`, `transfer`, `paid` |

Messages with no keyword match are routed as `general` with low confidence so that the owner can review them.

## Stored AI outputs

Run `db/migrations/0004_whatsapp_ai_assistant.sql` before enabling the webhook. The migration adds:

- `leads.intent` for the detected intent.
- `leads.ai_summary` for the latest assistant summary.
- `whatsapp_conversations.metadata` for provider details, suggested replies, safety decisions, opt-in state, and WhatsApp template-rule metadata.

The webhook updates the latest lead with the same workspace and phone number. If no matching lead exists, it creates a new WhatsApp lead and stores the AI outputs immediately.

## Safety rules

The assistant is designed for draft-and-review workflows by default:

1. **Never auto-send sensitive financial, medical, or legal advice.** The package flags possible sensitive content and requires owner approval.
2. **Require owner approval for uncertain replies.** Replies below the configured confidence threshold default to `requiresOwnerApproval: true`.
3. **Respect WhatsApp opt-in and template rules.** `requireOptIn` defaults to `true`; provide `hasOptedIn(contact)` before enabling any automated sends. Business-initiated conversations outside WhatsApp's customer-service window must use approved templates.

`autoSendReplies` defaults to `false`. Even if enabled, the handler only marks replies as auto-sendable when the contact has opted in and every suggested reply passes the safety checks. The package does not send outbound WhatsApp messages by itself; use the returned metadata to build an owner approval queue or a compliant outbound sender.

## Recommended rollout

1. Apply the migration in development and production.
2. Start without an AI provider to validate deterministic intent routing.
3. Add a provider that implements `WhatsAppAIProvider`.
4. Review `whatsapp_conversations.metadata` in an owner dashboard before sending drafts.
5. Only enable automated outbound sending after opt-in tracking and template compliance are implemented.
