(function () {
  'use strict';

  function getStorageValue(storage, key) {
    try {
      return storage.getItem(key) || '';
    } catch (_) {
      return '';
    }
  }

  function setStorageValue(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (_) {}
  }

  function randomId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function stableId(storage, key, prefix) {
    var value = getStorageValue(storage, key);
    if (!value) {
      value = randomId(prefix);
      setStorageValue(storage, key, value);
    }
    return value;
  }

  function firstTouchAttribution() {
    var key = 'mrwhite_first_touch_attribution';
    var stored = getStorageValue(sessionStorage, key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (_) {}
    }

    var params = new URLSearchParams(window.location.search);
    var attribution = {
      referrer: document.referrer || '',
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      gclid: params.get('gclid') || '',
      fbclid: params.get('fbclid') || '',
      msclkid: params.get('msclkid') || ''
    };
    setStorageValue(sessionStorage, key, JSON.stringify(attribution));
    return attribution;
  }

  function getAttribution() {
    var landingPage = getStorageValue(sessionStorage, 'mrwhite_landing_page');
    if (!landingPage) {
      landingPage = window.location.href;
      setStorageValue(sessionStorage, 'mrwhite_landing_page', landingPage);
    }

    return Object.assign({}, firstTouchAttribution(), {
      page: window.location.href,
      page_url: window.location.href,
      landing_page: landingPage,
      source: 'website',
      session_id: stableId(sessionStorage, 'mrwhite_session_id', 'session'),
      client_id: stableId(localStorage, 'mrwhite_client_id', 'client')
    });
  }

  function storeEvent(payload) {
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      try {
        if (navigator.sendBeacon('/api/lead-event', new Blob([body], { type: 'application/json' }))) return;
      } catch (_) {}
    }

    fetch('/api/lead-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body,
      keepalive: true
    }).catch(function () {});
  }

  function trackEvent(name, params, options) {
    var payload = Object.assign({}, getAttribution(), params || {}, { event_name: name });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({
      event: name,
      page_location: window.location.href,
      page_title: document.title
    }, params || {}));

    if (!options || options.store !== false) {
      storeEvent(payload);
    }
  }

  function getLeadAction(form) {
    return form.getAttribute('data-action') || '/api/send-lead';
  }

  function ensureStatus(form) {
    var status = form.querySelector('.form-success');
    if (!status) {
      status = document.createElement('p');
      status.className = 'form-success';
      status.style.display = 'none';
      status.style.color = '#0a7f3f';
      status.style.fontWeight = '700';
      status.style.marginTop = '12px';
      form.appendChild(status);
    }
    return status;
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) {
      trackEvent('phone_click', {
        phone_number: href.replace('tel:', ''),
        link_text: link.textContent.trim(),
        link_url: link.href
      });
    } else if (href.indexOf('mailto:') === 0) {
      trackEvent('email_click', {
        email_address: href.replace('mailto:', '').split('?')[0],
        link_text: link.textContent.trim(),
        link_url: link.href
      });
    } else if (/wa\.me|whatsapp\.com/i.test(link.href)) {
      trackEvent('whatsapp_click', {
        whatsapp_number: (link.href.match(/wa\.me\/([^?]+)/) || [])[1] || '',
        link_text: link.textContent.trim(),
        link_url: link.href
      });
    } else if (/contact|quote|enquir|book/i.test(href + ' ' + link.textContent)) {
      trackEvent('quote_cta_click', {
        link_text: link.textContent.trim(),
        link_url: link.href
      });
    }
  });

  document.addEventListener('submit', async function (event) {
    var form = event.target.closest('.js-lead-form');
    if (!form) return;

    event.preventDefault();
    var button = form.querySelector('[type="submit"]');
    var status = ensureStatus(form);
    var originalHtml = button ? button.innerHTML : '';
    var payload = Object.assign(Object.fromEntries(new FormData(form).entries()), getAttribution());
    payload.form_name = form.getAttribute('aria-label') || form.id || 'lead_form';

    if (button) {
      button.innerHTML = 'Sending...';
      button.disabled = true;
    }
    status.style.display = 'none';

    trackEvent('lead_form_submit_attempt', {
      form_name: payload.form_name,
      service: payload.service || ''
    });

    try {
      var response = await fetch(getLeadAction(form), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Lead request failed');

      trackEvent('generate_lead', {
        form_name: payload.form_name,
        service: payload.service || ''
      }, { store: false });

      form.reset();
      status.textContent = 'Thanks, your message has been sent. We will get back to you shortly.';
      status.style.color = '#0a7f3f';
      status.style.display = 'block';
    } catch (_) {
      trackEvent('lead_form_error', {
        form_name: payload.form_name,
        service: payload.service || ''
      });
      status.textContent = 'Sorry, your message could not be sent. Please call or WhatsApp us and we will help straight away.';
      status.style.color = '#b00020';
      status.style.display = 'block';
    } finally {
      if (button) {
        button.innerHTML = originalHtml;
        button.disabled = false;
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackEvent('page_view', { source: 'website' });
    }, { once: true });
  } else {
    trackEvent('page_view', { source: 'website' });
  }

  window.MrWhiteTracking = { trackEvent: trackEvent, getAttribution: getAttribution };
})();
