import assert from "node:assert/strict";
import { createWhatsAppWebhookHandler, detectDeterministicIntent } from "../dist/index.js";

const queries = [];
const db = {
  async query(text, values) {
    queries.push({ text, values });
    if (text.includes("update leads")) return { rows: [], rowCount: 0 };
    if (text.includes("insert into leads")) return { rows: [{ id: "lead_123" }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  },
};

assert.equal(detectDeterministicIntent("Can I book an appointment today?").intent, "booking");
assert.equal(detectDeterministicIntent("How much does this cost?").intent, "quote");
assert.equal(detectDeterministicIntent("I paid by transfer").intent, "payment");

const handler = createWhatsAppWebhookHandler({
  db,
  workspaceId: "workspace_123",
  requireOptIn: false,
});

const response = await handler(
  new Request("https://example.com/webhooks/whatsapp", {
    method: "POST",
    body: JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [
                  { wa_id: "15551234567", profile: { name: "Ada" } },
                ],
                messages: [
                  {
                    id: "wamid.1",
                    from: "15551234567",
                    timestamp: "1710000000",
                    type: "text",
                    text: { body: "I want to book tomorrow" },
                  },
                ],
              },
            },
          ],
        },
      ],
    }),
  })
);

assert.equal(response.status, 200);
const payload = await response.json();
assert.equal(payload.data.processed, 1);
assert.equal(payload.data.conversations[0].intent.intent, "booking");
assert.equal(queries.some((query) => query.text.includes("intent = $1") && query.text.includes("ai_summary = $2")), true);
assert.equal(queries.some((query) => query.text.includes("whatsapp_conversations")), true);

// Outbound message builder tests
import { createReplyButtonsMessage, createListMessage } from "../dist/index.js";

const buttonMsg = createReplyButtonsMessage({
  body: "Hello",
  buttons: [{ id: "yes", title: "Yes" }, { id: "no", title: "No" }],
});
assert.equal(buttonMsg.type, "interactive");
assert.equal(buttonMsg.interactive.type, "button");
assert.equal(buttonMsg.interactive.action.buttons.length, 2);

const listMsg = createListMessage({
  body: "Select one",
  button: "Open",
  sections: [{ title: "Options", rows: [{ id: "1", title: "One" }] }],
});
assert.equal(listMsg.interactive.type, "list");
assert.equal(listMsg.interactive.action.sections[0].rows[0].id, "1");
