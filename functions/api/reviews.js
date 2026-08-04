const REVIEW_PREFIX = 'review:';
const RATE_PREFIX = 'review-rate:';

export async function onRequestGet({ env }) {
  if (!env.REVIEWS_KV) {
    return json({ reviews: [], storageConfigured: false });
  }

  try {
    const listed = await env.REVIEWS_KV.list({ prefix: REVIEW_PREFIX, limit: 100 });
    const reviews = (await Promise.all(listed.keys.map(async ({ name }) => {
      try {
        return await env.REVIEWS_KV.get(name, 'json');
      } catch (_) {
        return null;
      }
    })))
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return json({ reviews, storageConfigured: true });
  } catch (error) {
    console.error('Review lookup failed', error);
    return json({ error: 'Reviews are temporarily unavailable' }, 503);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.REVIEWS_KV) {
    return json({ error: 'Review storage is not configured' }, 503);
  }

  let submission;
  try {
    submission = await request.json();
  } catch (_) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (clean(submission.website)) {
    return json({ ok: true });
  }

  const name = clean(submission.name);
  const message = clean(submission.message);

  if (name.length < 2 || name.length > 80) {
    return json({ error: 'Please enter a name between 2 and 80 characters' }, 400);
  }
  if (message.length < 10 || message.length > 500) {
    return json({ error: 'Please enter a review between 10 and 500 characters' }, 400);
  }
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co\.uk|net|org)\b)/i.test(message)) {
    return json({ error: 'Links are not allowed in reviews' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateKey = RATE_PREFIX + await sha256(ip);
  if (await env.REVIEWS_KV.get(rateKey)) {
    return json({ error: 'Please wait before submitting another review' }, 429);
  }

  const createdAt = new Date().toISOString();
  const review = {
    id: crypto.randomUUID(),
    name,
    message,
    createdAt,
    source: 'website'
  };

  try {
    await Promise.all([
      env.REVIEWS_KV.put(REVIEW_PREFIX + createdAt + ':' + review.id, JSON.stringify(review)),
      env.REVIEWS_KV.put(rateKey, '1', { expirationTtl: 600 })
    ]);
  } catch (error) {
    console.error('Review storage failed', error);
    return json({ error: 'We could not save your review' }, 503);
  }

  await sendNotification(review, env);
  return json({ ok: true, review }, 201);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequest() {
  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
}

async function sendNotification(review, env) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) return;

  const from = env.LEAD_FROM_EMAIL || 'Mr White Teeth Whitening <info@teethwhiteningbournemouth.co.uk>';
  const to = (env.LEAD_TO_EMAILS || 'ajbryantsleads@gmail.com')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  if (!to.length) return;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'mr-white-website/1.0'
      },
      body: JSON.stringify({
        from,
        to,
        subject: `New website review from ${review.name}`,
        text: `Name: ${review.name}\nReview: ${review.message}\nSubmitted: ${review.createdAt}`,
        html: `<h2>New Mr White website review</h2><p><strong>Name:</strong> ${escapeHtml(review.name)}</p><p><strong>Review:</strong> ${escapeHtml(review.message)}</p><p><strong>Submitted:</strong> ${escapeHtml(review.createdAt)}</p>`
      })
    });
    if (!response.ok) {
      console.error('Review notification failed', response.status, await response.text());
    }
  } catch (error) {
    console.error('Review notification request failed', error);
  }
}

function clean(value) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders(), extraHeaders)
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
