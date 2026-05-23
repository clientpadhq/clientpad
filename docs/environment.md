# Environment Variables

## Database

- `DATABASE_URL`
- `API_KEY_PEPPER`

## Cloud auth

- `CLIENTPAD_CLOUD_ADMIN_TOKEN`
- Session secret/config used by the Cloud package

## Dashboard

- Cloud API base URL, normally `https://api.clientpad.xyz/api/cloud/v1`

## WhatsApp

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `CLIENTPAD_WORKSPACE_ID`

## Lemon Squeezy

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- Plan variant IDs

Never expose API keys, database URLs, admin tokens, or provider secrets in browser code.
