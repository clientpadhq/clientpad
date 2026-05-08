import crypto from "node:crypto";
import express from "express";
import { createClientPadHandler } from "@abdulmuiz44/clientpad-server";

const {
  API_KEY_PEPPER,
  BUSINESS_NAME = "ClientPad WhatsApp Demo",
  CLIENTPAD_API_KEY,
  DATABASE_URL,
  PORT = 3000,
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_APP_SECRET,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN,
} = process.env;

for (const [name, value] of Object.entries({ API_KEY_PEPPER, CLIENTPAD_API_KEY, DATABASE_URL, WHATSAPP_VERIFY_TOKEN })) {
  if (!value) {
    throw new Error(`${name} is required. See examples/whatsapp/README.md for setup.`);
  }
}

const app = express();

// Keep the raw body so the optional Meta signature check can verify exactly
// what WhatsApp sent.
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      req.rawBody = buffer;
    },
  })
);

const clientpad = createClientPadHandler({
  databaseUrl: DATABASE_URL,
  apiKeyPepper: API_KEY_PEPPER,
});

app.get("/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

app.post("/whatsapp/webhook", async (req, res) => {
  if (!isValidMetaSignature(req)) {
    res.sendStatus(401);
    return;
  }

  const messages = extractMessages(req.body);

  for (const message of messages) {
    await saveInboundLead(message);

    if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
      await sendWhatsAppText(
        message.from,
        `Thanks for messaging ${BUSINESS_NAME}. Reply with 1 to book, 2 for services, or 3 to talk to the owner.`
      );
    }
  }

  res.sendStatus(200);
});

async function saveInboundLead(message) {
  const lead = {
    name: message.profileName ?? `WhatsApp ${message.from}`,
    phone: message.from,
    source: "whatsapp",
    service_interest: message.type ?? "whatsapp_message",
    notes: [
      message.text
        ? `Inbound WhatsApp message: ${message.text}`
        : `Inbound WhatsApp ${message.type ?? "message"}`,
      `WhatsApp message ID: ${message.id ?? "unknown"}`,
      `WhatsApp timestamp: ${message.timestamp ?? "unknown"}`,
    ].join("\n"),
  };

  const request = new Request("http://localhost/api/public/v1/leads", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${CLIENTPAD_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(lead),
  });

  const response = await clientpad(request);
  if (!response.ok) {
    const body = await response.text();
    console.error("ClientPad lead save failed", response.status, body);
  }
}

function extractMessages(payload) {
  const results = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const contactsByWaId = new Map(
        (value.contacts ?? []).map((contact) => [contact.wa_id, contact])
      );

      for (const message of value.messages ?? []) {
        const contact = contactsByWaId.get(message.from);
        results.push({
          id: message.id,
          from: message.from,
          profileName: contact?.profile?.name,
          text: message.text?.body,
          timestamp: message.timestamp,
          type: message.type,
        });
      }
    }
  }

  return results;
}

function isValidMetaSignature(req) {
  if (!WHATSAPP_APP_SECRET) return true;

  const signature = req.get("x-hub-signature-256");
  if (!signature?.startsWith("sha256=")) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", WHATSAPP_APP_SECRET)
      .update(req.rawBody ?? Buffer.alloc(0))
      .digest("hex");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  );
}

async function sendWhatsAppText(to, body) {
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
    }
  );

  if (!response.ok) {
    console.error("WhatsApp send failed", response.status, await response.text());
  }
}

app.listen(PORT, () => {
  console.log(`WhatsApp webhook listening on http://localhost:${PORT}/whatsapp/webhook`);
});
