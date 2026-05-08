# WhatsApp CSV Import

ClientPad can import manually exported WhatsApp lead lists with:

```bash
clientpad whatsapp:import ./whatsapp-leads.csv --workspace-id <workspace_id>
```

The command reads a CSV file, normalizes Nigerian phone numbers to `+234`, upserts leads by `(workspace_id, phone)`, and stores the latest inbound WhatsApp message when `last_message` is present.

## CSV format

Create a UTF-8 CSV with these columns:

| Column | Required | Description |
| --- | --- | --- |
| `name` | Yes | Contact or business name. If blank, the normalized phone number is used. |
| `phone` | Yes | Nigerian phone number such as `08031234567`, `8031234567`, `2348031234567`, or `+2348031234567`. |
| `last_message` | No | Most recent inbound WhatsApp message to attach to the imported lead. |
| `service_interest` | No | Product or service the contact asked about. |
| `notes` | No | Internal lead notes. |
| `source` | No | Lead source. Defaults to `whatsapp_csv`. |
| `last_message_at` | No | Message timestamp. Any JavaScript/ISO-parsable timestamp is accepted. Invalid or blank values default to import time for message rows. |

Example:

```csv
name,phone,last_message,service_interest,notes,source,last_message_at
Ada Okafor,08031234567,"Hello, do you install solar panels?",Solar installation,"Asked for Lekki pricing",whatsapp,2026-05-08T09:15:00Z
Musa Bello,+2348055551212,"Please send your catalog",Wholesale,"Follow up tomorrow",whatsapp,2026-05-08 10:30
```

## Manual export workflow

WhatsApp does not provide a one-click business lead CSV export in every product tier, so the safest manual workflow is to export contacts/chats and map them into the CSV above.

### 1. Export contacts

**Android screenshot description:** Open the Contacts app or Google Contacts, tap **Fix & manage** or the account menu, choose **Export to file**, and save a `.vcf` file. Convert the contacts you want into CSV columns `name` and `phone`.

**iPhone screenshot description:** Open iCloud Contacts in a browser, select the contacts, click the settings/gear menu, and choose **Export vCard**. Convert selected contacts into CSV columns `name` and `phone`.

Keep only contacts that are legitimate leads and that you have permission to process in ClientPad.

### 2. Export recent WhatsApp chat context

**WhatsApp mobile screenshot description:** Open the chat, tap the contact or three-dot menu, choose **More**, then **Export chat**. Pick **Without media** for a smaller text export. Copy the most recent customer message into `last_message` and its timestamp into `last_message_at`.

For group chats, copy only the customer message relevant to the lead and confirm the phone number matches the contact you are importing.

### 3. Build the import CSV

Use a spreadsheet with the exact header row:

```csv
name,phone,last_message,service_interest,notes,source,last_message_at
```

Before saving, verify:

- Phone numbers belong to Nigeria and can normalize to `+234`.
- Duplicate contacts appear only once in the file.
- `last_message` contains inbound customer text, not your outbound reply.
- Private or irrelevant chat content is removed from `notes` and `last_message`.

Export the spreadsheet as CSV, not XLSX.

## Importing

Run migrations first so the WhatsApp tables and lead phone uniqueness exist:

```bash
clientpad migrate
```

Then import:

```bash
DATABASE_URL="postgres://..." clientpad whatsapp:import ./whatsapp-leads.csv --workspace-id 00000000-0000-0000-0000-000000000000
```

The command prints validation output:

```json
{
  "imported_count": 42,
  "skipped_duplicate_count": 3,
  "invalid_phone_count": 2,
  "sample_invalid_rows": [
    { "row": 8, "phone": "12345" },
    { "row": 19, "phone": "+15551234567" }
  ]
}
```

- `imported_count` counts valid, non-duplicate CSV rows upserted into `leads`.
- `skipped_duplicate_count` counts duplicate normalized phone numbers found later in the same CSV file.
- `invalid_phone_count` counts rows that could not normalize to a Nigerian `+234` number.
- `sample_invalid_rows` shows up to five invalid rows to help correct the file.

## What ClientPad writes

For every valid row, ClientPad upserts one lead by `(workspace_id, phone)`. Existing leads with the same phone are updated with the imported name, source, service interest, and notes.

If `last_message` is present, ClientPad also creates:

1. A `whatsapp_conversations` row linked to the lead.
2. An inbound `whatsapp_messages` row with the message body and timestamp.

No outbound WhatsApp message is sent by the importer.
