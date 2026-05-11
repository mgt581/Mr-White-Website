(function () {
  'use strict';

  function trackEvent(name, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({
      event: name,
      page_location: window.location.href,
      page_title: document.title
    }, params || {}));
  }

  function getLeadAction(form) {
    return form.getAttribute('data-action') || '/api/send-lead';
  }

  function ensureStatus(form) {
    let status = form.querySelector('.form-success');
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
    const link = event.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) {
      trackEvent('phone_call_click', {
        phone_number: href.replace('tel:', ''),
        link_text: link.textContent.trim()
      });
    } else if (href.indexOf('mailto:') === 0) {
      trackEvent('email_click', {
        email_address: href.replace('mailto:', '').split('?')[0],
        link_text: link.textContent.trim()
      });
    } else if (href.indexOf('https://wa.me/') === 0) {
      trackEvent('whatsapp_click', {
        whatsapp_url: href,
        link_text: link.textContent.trim()
      });
    }
  });

  document.addEventListener('submit', async function (event) {
    const form = event.target.closest('.js-lead-form');
    if (!form) return;

    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const status = ensureStatus(form);
    const originalHtml = button ? button.innerHTML : '';

    if (button) {
      button.innerHTML = 'Sending...';
      button.disabled = true;
    }
    status.style.display = 'none';

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.form_name = form.getAttribute('aria-label') || form.id || 'lead_form';
      payload.page_url = window.location.href;

      const response = await fetch(getLeadAction(form), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Lead request failed');

      trackEvent('lead_form_submit', {
        form_name: payload.form_name,
        service: payload.service || ''
      });

      form.reset();
      status.textContent = 'Thanks, your message has been sent. We will get back to you shortly.';
      status.style.color = '#0a7f3f';
      status.style.display = 'block';
    } catch (_) {
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

  window.MrWhiteTracking = { trackEvent };
})();
