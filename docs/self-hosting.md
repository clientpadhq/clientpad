# Self-hosting

Self-hosted ClientPad deployments run your PostgreSQL database, migrations, server package, and dashboard.

## Steps

1. Create a PostgreSQL database and set `DATABASE_URL`.
2. Run `clientpad migrate`.
3. Create a workspace API key with `clientpad api-key create`.
4. Mount `createClientPadHandler` in a fetch-compatible runtime.
5. Point the dashboard at your Cloud/API URL.
6. Add the WhatsApp webhook handler when you are ready for live conversations.
