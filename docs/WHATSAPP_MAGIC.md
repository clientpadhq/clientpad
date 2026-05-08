# WhatsApp Magic Setup Guide

This guide explains how a small business can set up WhatsApp Business messaging for ClientPad-style customer workflows without needing to be technical. Use it as an onboarding checklist for owners, admins, and operators who need appointment reminders, quote follow-ups, payment nudges, pickup updates, and review requests.

## Before You Start

You will need:

- A business name customers recognize.
- A phone number that is not already actively used in the regular WhatsApp or WhatsApp Business mobile app, unless you are ready to migrate it.
- A Meta Business account with access to the business settings.
- One test phone that can receive WhatsApp messages.
- A public webhook callback URL from your ClientPad/automation server, such as `https://your-domain.com/webhooks/whatsapp`.

## What a WhatsApp Business Account Is

A WhatsApp Business account lets a company send and receive WhatsApp messages with customers through official Meta business tools. It is different from a personal WhatsApp account because it is meant for business identity, customer support, notifications, and approved message templates.

In practice, the account connects three things:

1. Your business profile in Meta.
2. A business phone number customers can message.
3. The WhatsApp Business Platform/API that your app or automation uses to send messages.

Use it when you want reliable customer communication, proper opt-in records, delivery status updates, templates, and a scalable way to support many customers.

## Create a Meta App

Follow these non-technical steps:

1. Go to the Meta for Developers website and sign in with the Facebook account that has access to your business.
2. Choose **Create App**.
3. Select an app type suitable for business messaging. Meta may label this as **Business** or provide a WhatsApp-focused setup path.
4. Give the app a clear name, such as `ClientPad WhatsApp` or `Your Business WhatsApp`.
5. Connect the app to your Meta Business account when asked.
6. Add the **WhatsApp** product to the app from the app dashboard.
7. Open the WhatsApp setup screen and follow Meta's prompts to create or connect a WhatsApp Business account.

Keep the app name and business name simple because teammates may need to recognize them later in Meta settings.

## Get the Phone Number ID

The Phone Number ID is not the same as the customer-facing phone number. It is Meta's internal ID for the WhatsApp number your app sends from.

To find it:

1. Open your Meta app dashboard.
2. Go to **WhatsApp**.
3. Open **API Setup** or the WhatsApp product setup page.
4. Look for the sender phone number section.
5. Copy the value called **Phone Number ID**.
6. Save it somewhere secure with your WhatsApp access token and business account details.

You will usually paste this Phone Number ID into your ClientPad integration settings or environment variables so the system knows which WhatsApp number should send messages.

## Set the Webhook Callback URL

A webhook is the delivery address Meta uses to notify your system about incoming messages, delivery updates, read receipts, and verification events.

To set it up:

1. In your Meta app dashboard, open **WhatsApp** and then **Configuration**.
2. Find the **Webhook** or **Callback URL** settings.
3. Paste your public callback URL, for example:

   ```text
   https://your-domain.com/webhooks/whatsapp
   ```

4. Enter the verify token your system expects. This is a shared secret phrase used only for webhook setup, for example `clientpad-whatsapp-verify-2026`.
5. Click **Verify and Save**.
6. Subscribe to the webhook events you need, especially messages and message status updates.

Use an HTTPS URL. Local computer URLs, private IP addresses, and staging links that are not publicly reachable will usually fail verification.

## Test With One Phone

Start small before messaging real customers.

1. Add one trusted test phone number in Meta's WhatsApp test setup if you are still using test mode.
2. Send a first test message from the Meta dashboard or your ClientPad integration.
3. Reply from the test phone with a normal message such as `Hello`.
4. Confirm your webhook receives the reply.
5. Send a second response from your system within the active customer service window.
6. Check that delivery status changes from sent to delivered or read where available.
7. Only after this works should you test with staff members or real customers who have opted in.

For Nigerian numbers, store phone numbers in international format, such as `2348012345678`, not `08012345678`.

## WhatsApp Policy Guidance

WhatsApp is strict about customer consent and message quality. Treat these rules as part of your operating process, not just a technical setup.

### Get Clear Customer Opt-In

Only message customers who clearly agreed to receive WhatsApp updates from your business. Good opt-in examples include:

- A checkout checkbox that says the customer agrees to receive WhatsApp order updates.
- A booking form note that says appointment reminders will be sent by WhatsApp.
- A signed customer form with WhatsApp notification consent.
- A direct customer message asking your business to send updates by WhatsApp.

Keep records of where and when the customer opted in.

### Understand the 24-Hour Customer Service Window

When a customer sends your business a WhatsApp message, it opens a 24-hour customer service window. During that window, your team or system can usually reply freely with normal support messages.

After the 24-hour window closes, you should not send ordinary free-form messages. You must use an approved message template for business-initiated messages.

### Use Approved Templates Outside the Window

Templates are pre-approved messages for common business situations, such as reminders, updates, and follow-ups. Create templates before you need them so your team is not blocked when customers are outside the 24-hour window.

Use templates for:

- Appointment reminders.
- Quote or invoice follow-ups.
- Payment reminders.
- Pickup or delivery reminders.
- Review requests.

### Include Opt-Out Language

Give customers a simple way to stop receiving messages. A clear line such as this is recommended in templates and recurring notifications:

```text
Reply STOP to opt out.
```

If a customer opts out, stop non-essential WhatsApp messages to that customer and update their record in ClientPad or your CRM.

## Template Examples

Replace placeholders such as `{{customer_name}}`, `{{business_name}}`, and `{{appointment_time}}` with real customer details. Keep templates direct, polite, and useful.

### Appointment Reminder

English:

```text
Hi {{customer_name}}, this is a reminder of your appointment with {{business_name}} on {{appointment_date}} at {{appointment_time}}. Please reply YES to confirm or call {{business_phone}} to reschedule. Reply STOP to opt out.
```

Light Pidgin:

```text
Hi {{customer_name}}, small reminder say your appointment with {{business_name}} na {{appointment_date}} by {{appointment_time}}. Reply YES to confirm or call {{business_phone}} if you wan change am. Reply STOP to opt out.
```

### Quote Follow-Up

English:

```text
Hi {{customer_name}}, thank you for requesting a quote from {{business_name}}. Your quote of {{quote_amount}} is ready. Reply YES if you want us to proceed, or call {{business_phone}} for questions. Reply STOP to opt out.
```

Light Pidgin:

```text
Hi {{customer_name}}, thanks for asking {{business_name}} for quote. Your quote na {{quote_amount}} and e don ready. Reply YES make we proceed, or call {{business_phone}} if you get question. Reply STOP to opt out.
```

### Payment Reminder

English:

```text
Hi {{customer_name}}, this is a friendly reminder that your payment of {{amount_due}} to {{business_name}} is due on {{due_date}}. Please pay using {{payment_link}} or contact us on {{business_phone}}. Reply STOP to opt out.
```

Light Pidgin:

```text
Hi {{customer_name}}, gentle reminder say your payment of {{amount_due}} to {{business_name}} dey due on {{due_date}}. You fit pay here: {{payment_link}} or call {{business_phone}}. Reply STOP to opt out.
```

### Pickup Reminder

English:

```text
Hi {{customer_name}}, your item is ready for pickup at {{business_name}}. Pickup time is {{pickup_window}} at {{pickup_location}}. Please bring your receipt or order number {{order_number}}. Reply STOP to opt out.
```

Light Pidgin:

```text
Hi {{customer_name}}, your item don ready for pickup at {{business_name}}. Pickup time na {{pickup_window}} for {{pickup_location}}. Abeg bring your receipt or order number {{order_number}}. Reply STOP to opt out.
```

### Review Request

English:

```text
Hi {{customer_name}}, thank you for choosing {{business_name}}. Please rate your experience here: {{review_link}}. Your feedback helps us serve you better. Reply STOP to opt out.
```

Light Pidgin:

```text
Hi {{customer_name}}, thank you for choosing {{business_name}}. Abeg rate your experience here: {{review_link}}. Your feedback go help us serve you better. Reply STOP to opt out.
```

## Nigerian-First Copy Tips

Use language that feels familiar, respectful, and practical for Nigerian customers.

- Use `Hi` or `Good morning/afternoon` for a friendly tone.
- Mention the business name early so customers know the message is real.
- Use naira amounts clearly, for example `₦25,000` or `NGN 25,000`.
- Use local context where helpful, such as branch names, pickup areas, and known landmarks.
- Keep light Pidgin optional and respectful. Do not overdo slang for formal customers.
- Avoid pressure tactics. Be clear about what the customer should do next.

Examples:

English:

```text
Good afternoon {{customer_name}}, your ₦{{amount}} invoice from {{business_name}} is ready. You can pay with this link: {{payment_link}}. Reply STOP to opt out.
```

Light Pidgin:

```text
Good afternoon {{customer_name}}, your ₦{{amount}} invoice from {{business_name}} don ready. You fit pay with this link: {{payment_link}}. Reply STOP to opt out.
```

English:

```text
Hi {{customer_name}}, your order is ready at our {{branch_name}} branch near {{landmark}}. Pickup is available from {{pickup_time}}. Reply STOP to opt out.
```

Light Pidgin:

```text
Hi {{customer_name}}, your order don ready for our {{branch_name}} branch near {{landmark}}. You fit pick am from {{pickup_time}}. Reply STOP to opt out.
```

## Troubleshooting

### Webhook Verification Fails

Check the following:

- The callback URL starts with `https://`.
- The URL is public and reachable from the internet.
- The verify token in Meta exactly matches the verify token in your system.
- Your server responds to Meta's verification request quickly.
- There are no extra spaces before or after the callback URL or verify token.

If you are testing locally, use a secure public tunnel or deploy to a staging URL before verifying the webhook.

### Token Expired

Access tokens can expire or be revoked.

What to do:

1. Generate a new token in Meta Business settings or the Meta app dashboard.
2. Replace the old token in your ClientPad environment settings.
3. Restart or redeploy the service if needed.
4. Send a test message to confirm the new token works.

For production, use a long-lived or system-user token where appropriate and limit who can view or rotate it.

### Message Not Delivered

Common causes include:

- The customer phone number is incorrect or not on WhatsApp.
- The customer has blocked the business.
- The template was rejected, paused, or does not match the approved wording.
- Your account has quality, limit, or billing restrictions.
- The message is outside the 24-hour window and was not sent with an approved template.

Check the message status webhook, Meta dashboard errors, and the exact phone number format.

### Customer Outside 24-Hour Window

If the customer has not messaged you in the last 24 hours, use an approved template instead of a normal free-form message.

Good next steps:

1. Choose the correct approved template.
2. Fill in only the approved placeholders.
3. Include useful context and opt-out language.
4. Wait for the customer to reply. Their reply opens a new 24-hour customer service window.

### Invalid Phone Format

WhatsApp expects phone numbers in international format.

For Nigeria:

- Correct: `2348012345678`
- Also acceptable in many tools: `+2348012345678`
- Incorrect for API storage: `08012345678`
- Incorrect: numbers with spaces, brackets, or hyphens, such as `0801 234 5678`

Before sending, remove spaces and punctuation, remove the leading `0`, and add Nigeria's country code `234`.
