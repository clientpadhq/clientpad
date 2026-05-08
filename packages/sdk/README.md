# ClientPad SDK

TypeScript SDK for ClientPad's public API.

## Install

```bash
pnpm add @abdulmuiz44/clientpad-sdk
```

## Basic Usage

Expose APIs with `@abdulmuiz44/clientpad-server`, then consume them with this SDK.

```ts
import { ClientPad } from "@abdulmuiz44/clientpad-sdk";

const clientpad = new ClientPad({
  baseUrl: "https://example.com/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});

await clientpad.leads.create({
  name: "Ada Customer",
  phone: "+234...",
  source: "WhatsApp",
});
```

## Node

```ts
const leads = await clientpad.leads.list({
  limit: 50,
  offset: 0,
  status: "new",
});
```

## Next.js Route Handler

```ts
import { ClientPad } from "@abdulmuiz44/clientpad-sdk";

const clientpad = new ClientPad({
  baseUrl: process.env.CLIENTPAD_API_URL!,
  apiKey: process.env.CLIENTPAD_API_KEY!,
});

export async function POST() {
  const result = await clientpad.clients.create({
    business_name: "Ada Ventures",
    primary_contact: "Ada Customer",
  });

  return Response.json(result);
}
```

## Express

```ts
app.post("/lead", async (_req, res, next) => {
  try {
    const result = await clientpad.leads.create({
      name: "Ada Customer",
      phone: "+234...",
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

## Error Handling

```ts
import { ClientPadError } from "@abdulmuiz44/clientpad-sdk";

try {
  await clientpad.leads.list();
} catch (error) {
  if (error instanceof ClientPadError) {
    console.error(error.status, error.payload);
  }
}
```

## Custom Fetch

```ts
const clientpad = new ClientPad({
  baseUrl: "https://example.com/api/public/v1",
  apiKey: "cp_test_...",
  fetch: customFetch,
});
```
