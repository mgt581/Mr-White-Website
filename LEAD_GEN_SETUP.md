# Lead generation setup

The website displays `info@teethwhiteningbournemouth.co.uk`.

## Email routing

Set up forwarding for:

- `info@teethwhiteningbournemouth.co.uk` to `ajbryantsleads@gmail.com`

To reply as `info@teethwhiteningbournemouth.co.uk`, add it as a send-as alias in Gmail or use a mailbox provider that supports SMTP for the domain.

## Tracking events

The site pushes these events into `window.dataLayer` for Google Tag Manager:

- `phone_call_click`
- `email_click`
- `whatsapp_click`
- `lead_form_submit`

Google Tag Manager must be installed on the site for these events to reach Google.

## Resend and Cloudflare Pages

The contact forms post to:

```text
/api/send-lead
```

This is handled by:

```text
functions/api/send-lead.js
```

Cloudflare Pages production is configured with:

```text
BUSINESS_NAME=Mr White Teeth Whitening
LEAD_FROM_EMAIL=Mr White Teeth Whitening <info@teethwhiteningbournemouth.co.uk>
LEAD_TO_EMAILS=ajbryantsleads@gmail.com
RESEND_API_KEY=<encrypted Cloudflare secret>
LEADS_EXPORT_TOKEN=<encrypted Cloudflare secret>
LEADS_DB=mr-white-leads
```

The D1 database is bound as `LEADS_DB` and stores lead submissions plus delivery status. Do not commit `RESEND_API_KEY` or `LEADS_EXPORT_TOKEN` to GitHub.
