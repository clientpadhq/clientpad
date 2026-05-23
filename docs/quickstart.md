# Quickstart

Install the SDK:

```bash
pnpm add @clientpad/sdk
```

Create a lead:

```ts
import { ClientPad } from "@clientpad/sdk";

const clientpad = new ClientPad({
  baseUrl: "https://api.clientpad.xyz/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});

await clientpad.leads.create({
  name: "Ada Customer",
  phone: "+234...",
  source: "Website",
});
```

Use hosted Cloud for managed infrastructure or self-host the public API with your own PostgreSQL database.
