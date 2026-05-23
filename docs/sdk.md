# TypeScript SDK

`@clientpad/sdk` is the dependency-light client for apps, workers, scripts, and backend integrations.

```bash
pnpm add @clientpad/sdk
```

```ts
const leads = await clientpad.leads.list({ limit: 20 });
const created = await clientpad.leads.create({
  name: "Ada Customer",
  phone: "+234...",
  source: "WhatsApp",
});

const clients = await clientpad.clients.list();
const usage = await clientpad.usage.retrieve();
```
