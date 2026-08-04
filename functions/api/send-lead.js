export async function onRequestPost({ request, env }) {
  const defaultFromAddress = 'Mr White Teeth Whitening <info@teethwhiteningbournemouth.co.uk>';
  const defaultToAddresses = 'ajbryantsleads@gmail.com';
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return json({ error: 'RESEND_API_KEY is not configured' }, 500);
  }

  let lead;
  try {
    lead = await request.json();
  } catch (_) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const fromAddress = env.LEAD_FROM_EMAIL || defaultFromAddress;
  const toAddresses = (env.LEAD_TO_EMAILS || defaultToAddresses)
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  const replyTo = isEmail(lead.email) ? lead.email.trim() : 'info@teethwhiteningbournemouth.co.uk';

  if (!toAddresses.length) {
    console.error('Lead email is not configured: LEAD_TO_EMAILS is empty');
    return json({ error: 'Lead email recipient is not configured' }, 500);
  }

  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.name;
  const fields = [
    ['Page', lead.page_url],
    ['Form', lead.form_name],
    ['Service', lead.service],
    ['Name', name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Message', lead.message]
  ].filter(([, value]) => value);

  const text = fields.map(([label, value]) => `${label}: ${value}`).join('\n');
  const html = '<h2>New Mr White Teeth Whitening lead</h2><table>' + fields.map(([label, value]) => (
    `<tr><th align="left" style="padding:6px 12px 6px 0;">${escapeHtml(label)}</th><td style="padding:6px 0;">${escapeHtml(String(value))}</td></tr>`
  )).join('') + '</table>';

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'mr-white-website/1.0'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: toAddresses,
        reply_to: replyTo,
        subject: lead.service ? `New teeth whitening enquiry - ${lead.service}` : 'New Mr White Teeth Whitening enquiry',
        text,
        html
      })
    });
  } catch (error) {
    // Do not allow an outbound network error to crash the Pages Function.
    console.error('Resend request failed', error);
    return json({ error: 'Email service is temporarily unavailable' }, 503);
  }

  if (!response.ok) {
    const details = await response.text();
    console.error('Resend email failed', response.status, details);
    return json({ error: 'Email service rejected the message' }, 502);
  }

  return json({ ok: true });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequest() {
  return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({
      'Content-Type': 'application/json'
    }, corsHeaders(), extraHeaders)
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
