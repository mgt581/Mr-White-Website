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
  const storedLeadId = await storeLead(env, request, lead, name, 'pending');
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
    await updateLeadDelivery(env, storedLeadId, 'failed', 'Resend request failed');
    return json({ error: 'Email service is temporarily unavailable' }, 503);
  }

  if (!response.ok) {
    const details = await response.text();
    console.error('Resend email failed', response.status, details);
    await updateLeadDelivery(env, storedLeadId, 'failed', `Resend returned ${response.status}`);
    return json({ error: 'Email service rejected the message' }, 502);
  }

  await updateLeadDelivery(env, storedLeadId, 'delivered', '');
  await storeLeadEvent(env, request, lead, 'generate_lead');
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

async function storeLead(env, request, lead, name, deliveryStatus) {
  if (!env.LEADS_DB) return null;

  try {
    await ensureLeadSchema(env.LEADS_DB);
    const result = await env.LEADS_DB.prepare(`INSERT INTO leads (
      submitted_at, name, phone, email, service, message, page, source,
      landing_page, referrer, utm_source, utm_medium, utm_campaign, utm_term,
      utm_content, gclid, fbclid, msclkid, session_id, client_id, form_name,
      delivery_status, user_agent, ip_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      new Date().toISOString(),
      clean(name || 'Website visitor', 240),
      clean(lead.phone, 80),
      clean(lead.email, 240),
      clean(lead.service || 'Website enquiry', 160),
      clean(lead.message, 4000),
      clean(lead.page_url || lead.page, 1000),
      inferredSource(lead),
      clean(lead.landing_page, 1000),
      clean(lead.referrer, 1000),
      clean(lead.utm_source, 240),
      clean(lead.utm_medium, 240),
      clean(lead.utm_campaign, 240),
      clean(lead.utm_term, 240),
      clean(lead.utm_content, 240),
      clean(lead.gclid, 300),
      clean(lead.fbclid, 300),
      clean(lead.msclkid, 300),
      clean(lead.session_id, 120),
      clean(lead.client_id, 120),
      clean(lead.form_name, 200),
      deliveryStatus,
      clean(request.headers.get('user-agent'), 1000),
      await hashIp(request.headers.get('cf-connecting-ip') || '')
    ).run();
    return result && result.meta ? Number(result.meta.last_row_id || 0) : null;
  } catch (error) {
    console.error('Lead storage failed', error);
    return null;
  }
}

async function storeLeadEvent(env, request, lead, eventName) {
  if (!env.LEADS_DB) return;

  try {
    await ensureLeadEventSchema(env.LEADS_DB);
    await env.LEADS_DB.prepare(`INSERT INTO lead_events (
      occurred_at, event_name, page, landing_page, referrer, source, medium,
      campaign, term, content, gclid, fbclid, msclkid, service, link_url,
      link_text, phone_number, whatsapp_number, email_address, session_id,
      client_id, user_agent, ip_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      new Date().toISOString(),
      eventName,
      clean(lead.page_url || lead.page, 1000),
      clean(lead.landing_page, 1000),
      clean(lead.referrer, 1000),
      inferredSource(lead),
      clean(lead.utm_medium, 160),
      clean(lead.utm_campaign, 240),
      clean(lead.utm_term, 240),
      clean(lead.utm_content, 240),
      clean(lead.gclid, 300),
      clean(lead.fbclid, 300),
      clean(lead.msclkid, 300),
      clean(lead.service, 160),
      '',
      clean(lead.form_name, 200),
      clean(lead.phone, 100),
      '',
      clean(lead.email, 240),
      clean(lead.session_id, 120),
      clean(lead.client_id, 120),
      clean(request.headers.get('user-agent'), 1000),
      await hashIp(request.headers.get('cf-connecting-ip') || '')
    ).run();
  } catch (error) {
    console.error('Lead event storage failed', error);
  }
}

async function updateLeadDelivery(env, leadId, deliveryStatus, deliveryErrors) {
  if (!env.LEADS_DB || !leadId) return;

  try {
    await env.LEADS_DB.prepare('UPDATE leads SET delivery_status = ?, delivery_errors = ? WHERE id = ?')
      .bind(deliveryStatus, deliveryErrors, leadId)
      .run();
  } catch (error) {
    console.error('Lead delivery status update failed', error);
  }
}

async function ensureLeadSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_at TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    postcode TEXT,
    service TEXT,
    timeframe TEXT,
    message TEXT,
    page TEXT,
    source TEXT,
    landing_page TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    gclid TEXT,
    fbclid TEXT,
    msclkid TEXT,
    session_id TEXT,
    client_id TEXT,
    form_name TEXT,
    marketing_consent INTEGER NOT NULL DEFAULT 0,
    delivery_status TEXT NOT NULL DEFAULT 'pending',
    delivery_errors TEXT,
    lead_status TEXT NOT NULL DEFAULT 'NEW',
    quote_value_pence INTEGER NOT NULL DEFAULT 0,
    won_revenue_pence INTEGER NOT NULL DEFAULT 0,
    status_updated_at TEXT,
    user_agent TEXT,
    ip_hash TEXT
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_leads_submitted_at ON leads (submitted_at DESC)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (lead_status)').run();
}

async function ensureLeadEventSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS lead_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at TEXT NOT NULL,
    event_name TEXT NOT NULL,
    page TEXT,
    landing_page TEXT,
    referrer TEXT,
    source TEXT,
    medium TEXT,
    campaign TEXT,
    term TEXT,
    content TEXT,
    gclid TEXT,
    fbclid TEXT,
    msclkid TEXT,
    service TEXT,
    link_url TEXT,
    link_text TEXT,
    phone_number TEXT,
    whatsapp_number TEXT,
    email_address TEXT,
    session_id TEXT,
    client_id TEXT,
    user_agent TEXT,
    ip_hash TEXT
  )`).run();
  await ensureColumns(db, 'lead_events', [
    ['email_address', 'TEXT']
  ]);
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_lead_events_occurred_at ON lead_events (occurred_at DESC)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_lead_events_event_name ON lead_events (event_name)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_lead_events_session_id ON lead_events (session_id)').run();
}

async function ensureColumns(db, tableName, additions) {
  const result = await db.prepare(`PRAGMA table_info(${tableName})`).all();
  const columns = new Set((result.results || []).map((column) => column.name));
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${name} ${definition}`).run();
    }
  }
}

function inferredSource(lead) {
  const utmSource = clean(lead.utm_source, 240).toLowerCase();
  const suppliedSource = clean(lead.source, 160).toLowerCase();
  const referrer = clean(lead.referrer, 1000).toLowerCase();

  if (utmSource) return utmSource;
  if (lead.fbclid || referrer.indexOf('facebook.com') !== -1 || referrer.indexOf('fb.com') !== -1) return 'facebook';
  if (referrer.indexOf('instagram.com') !== -1) return 'instagram';
  if (lead.gclid || referrer.indexOf('google.') !== -1 || referrer.indexOf('g.co') !== -1) return 'google';
  if (lead.msclkid || referrer.indexOf('bing.com') !== -1) return 'bing';
  if (referrer.indexOf('whatsapp.com') !== -1 || referrer.indexOf('wa.me') !== -1) return 'whatsapp';
  if (suppliedSource && suppliedSource !== 'website') return suppliedSource;
  return 'direct / unknown';
}

function clean(value, limit = 1000) {
  return String(value == null ? '' : value).trim().slice(0, limit);
}

async function hashIp(ipAddress) {
  if (!ipAddress || !crypto.subtle) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ipAddress));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
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
