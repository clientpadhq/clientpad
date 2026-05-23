# Troubleshooting

## Dashboard says disconnected

Confirm the Cloud API URL, `/health`, `/readiness`, and operator session are valid.

## API key rejected

Check that the key is workspace-scoped, stored server-side, and sent as `Authorization: Bearer ...`.

## DNS still pending

Wait for Netlify certificate provisioning and nameserver propagation before changing primary domains.

## WhatsApp not receiving

Verify phone number ID, verify token, app secret, access token, webhook URL, and default workspace ID.

## Billing checkout missing

Confirm Lemon Squeezy API key, store ID, webhook secret, and variant IDs are configured in the Cloud host.

## Preview vs live confusion

Preview data is simulated. Live mode requires Cloud connectivity, auth, workspace access, and readiness checks.
