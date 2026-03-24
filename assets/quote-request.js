(() => {
  if (window.__quoteRequestInitialized) return;
  window.__quoteRequestInitialized = true;
  const DEBUG = true;
  const SUBMIT_IFRAME_NAME = 'quote-request-submit-frame';

  function debugInfo(...args) {
    if (!DEBUG) return;
    console.info('[quote-request]', ...args);
  }

  function debugError(...args) {
    if (!DEBUG) return;
    console.error('[quote-request]', ...args);
  }

  const SELECTORS = {
    openButton: '[data-quote-open]',
    closeButton: '[data-quote-close]',
    modal: '[data-quote-modal]',
    form: '.quote-request-modal__form',
    formState: '[data-quote-form-state]',
    successState: '[data-quote-success]',
    error: '[data-quote-error]',
    submit: '[data-quote-submit]',
  };

  function openModal(targetId, trigger) {
    const modal = document.getElementById(targetId);
    if (!modal) return;
    modal.dataset.returnFocus = trigger?.id || '';
    modal.showModal();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.close();
    const returnFocusId = modal.dataset.returnFocus;
    if (returnFocusId) {
      const returnFocusEl = document.getElementById(returnFocusId);
      returnFocusEl?.focus();
    }
  }

  function setError(form, message) {
    const errorEl = form.querySelector(SELECTORS.error);
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.toggle('hidden', !message);
  }

  function getCaptchaValue(form) {
    const captchaInput = form.querySelector('[name="h-captcha-response"]');
    return captchaInput ? String(captchaInput.value || '').trim() : '';
  }

  function ensureCaptchaReady(form) {
    return new Promise((resolve) => {
      if (!window.Shopify?.captcha?.protect) {
        debugInfo('Shopify captcha helper not available; continuing without explicit protect.');
        resolve();
        return;
      }

      debugInfo('Wiring Shopify captcha protection.');
      window.Shopify.captcha.protect(form, () => {
        debugInfo('Shopify captcha protection callback fired.');
        resolve();
      });
    });
  }

  async function waitForCaptchaToken(form, timeoutMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const token = getCaptchaValue(form);
      if (token) return token;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return getCaptchaValue(form);
  }

  function ensureSubmitIframe() {
    let iframe = document.querySelector(`iframe[name="${SUBMIT_IFRAME_NAME}"]`);
    if (iframe) return iframe;

    iframe = document.createElement('iframe');
    iframe.name = SUBMIT_IFRAME_NAME;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    return iframe;
  }

  function submitThroughIframe(form) {
    return new Promise((resolve, reject) => {
      const iframe = ensureSubmitIframe();
      const timeoutId = setTimeout(() => {
        reject(new Error('Quote request timed out. Please try again.'));
      }, 15000);

      const previousTarget = form.getAttribute('target');
      form.setAttribute('target', SUBMIT_IFRAME_NAME);

      const onLoad = () => {
        try {
          const href = iframe.contentWindow?.location?.href || '';
          debugInfo('Iframe submit completed', { href });

          if (!href || href === 'about:blank') {
            return;
          }

          if (href.includes('contact_posted=true')) {
            clearTimeout(timeoutId);
            resolve();
            return;
          }

          clearTimeout(timeoutId);
          reject(new Error('Failed to send quote request.'));
        } catch (error) {
          clearTimeout(timeoutId);
          reject(new Error('Failed to verify quote request result.'));
        } finally {
          if (previousTarget) {
            form.setAttribute('target', previousTarget);
          } else {
            form.removeAttribute('target');
          }
        }
      };

      iframe.addEventListener('load', onLoad, { once: true });

      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.submit();
      }
    });
  }

  function showSuccessState(modal) {
    if (!modal) return;
    const formState = modal.querySelector(SELECTORS.formState);
    const successState = modal.querySelector(SELECTORS.successState);
    formState?.classList.add('hidden');
    successState?.classList.remove('hidden');
    successState?.focus();
  }

  async function handlePostedRedirectState() {
    const url = new URL(window.location.href);
    const wasPosted = url.searchParams.get('contact_posted') === 'true';
    if (!wasPosted) return;

    debugInfo('Detected contact_posted redirect state.');

    try {
      await clearCartAndRefreshUI();
    } catch (error) {
      debugError('Post-redirect cart clear failed', error);
    }

    const hashId = window.location.hash ? window.location.hash.slice(1) : '';
    const modal =
      document.getElementById(hashId?.replace(/^QuoteRequestForm-/, 'QuoteRequestModal-')) ||
      document.querySelector(SELECTORS.modal);

    if (modal && !modal.open) {
      modal.showModal();
    }
    showSuccessState(modal);

    url.searchParams.delete('contact_posted');
    const nextHash = modal?.id ? `#${modal.id}` : '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}${nextHash}`);
  }

  async function clearCartAndRefreshUI() {
    debugInfo('Clearing cart...');
    const clearResponse = await fetch(window.routes?.cart_clear_url || '/cart/clear.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: '{}',
    });

    if (!clearResponse.ok) {
      let clearBody = '';
      try {
        clearBody = await clearResponse.text();
      } catch (error) {
        debugError('Unable to read cart clear response body', error);
      }
      debugError('Cart clear failed', {
        status: clearResponse.status,
        statusText: clearResponse.statusText,
        body: clearBody,
      });
      throw new Error('Quote sent, but cart could not be cleared. Please refresh your cart.');
    }
    debugInfo('Cart cleared successfully.');

    const cartDrawer = document.querySelector('cart-drawer');
    cartDrawer?.classList.add('is-empty');

    const cartItems = document.querySelector('cart-items');
    cartItems?.classList.add('is-empty');

    const cartFooter = document.getElementById('main-cart-footer');
    cartFooter?.classList.add('is-empty');
  }

  async function onSubmit(form) {
    const modal = form.closest(SELECTORS.modal);
    const formState = modal?.querySelector(SELECTORS.formState);
    const successState = modal?.querySelector(SELECTORS.successState);
    const submitButton = form.querySelector(SELECTORS.submit);

    setError(form, '');
    submitButton?.setAttribute('disabled', 'disabled');
    debugInfo('Submit started', {
      action: form.action,
      modalId: modal?.id || null,
    });

    try {
      await ensureCaptchaReady(form);
      const captchaValue = await waitForCaptchaToken(form, 1200);
      debugInfo('Captcha token status', {
        present: Boolean(captchaValue),
        length: captchaValue.length,
      });

      const formData = new FormData(form);
      const summary = formData.get('contact[cart_summary]');
      const notes = formData.get('contact[body]');
      const combinedBody = [notes, '', '--- Cart summary ---', summary].filter(Boolean).join('\n');
      const bodyInput = form.querySelector('[name="contact[body]"]');
      if (bodyInput) {
        bodyInput.value = combinedBody;
      }
      debugInfo('Prepared payload', {
        name: formData.get('contact[name]'),
        email: formData.get('contact[email]'),
        hasPhone: Boolean(formData.get('contact[phone]')),
        bodyLength: String(combinedBody || '').length,
      });

      await submitThroughIframe(form);

      await clearCartAndRefreshUI();

      formState?.classList.add('hidden');
      successState?.classList.remove('hidden');
      successState?.focus();
      debugInfo('Quote flow completed successfully.');
    } catch (error) {
      debugError('Quote flow failed', error);
      setError(form, error.message || 'Unable to submit quote request. Please try again.');
    } finally {
      submitButton?.removeAttribute('disabled');
      debugInfo('Submit finalized.');
    }
  }

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest(SELECTORS.openButton);
    if (openButton) {
      const targetId = openButton.dataset.quoteTarget;
      if (targetId) {
        if (!openButton.id) {
          openButton.id = `QuoteOpen-${Math.random().toString(36).slice(2, 10)}`;
        }
        openModal(targetId, openButton);
      }
      return;
    }

    const closeButton = event.target.closest(SELECTORS.closeButton);
    if (closeButton) {
      const modal = closeButton.closest(SELECTORS.modal);
      closeModal(modal);
      return;
    }
  });

  document.addEventListener('click', (event) => {
    const modal = event.target.closest(SELECTORS.modal);
    if (!modal) return;
    const isDialogBackdropClick = event.target === modal;
    if (isDialogBackdropClick) closeModal(modal);
  });

  document.addEventListener('click', (event) => {
    const submitButton = event.target.closest(SELECTORS.submit);
    if (!submitButton) return;
    const form = submitButton.closest(SELECTORS.form);
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();
    if (!form.reportValidity()) return;
    debugInfo('Submit button click intercepted.');
    onSubmit(form).catch((error) => {
      debugError('Unhandled submit error from button click', error);
      setError(form, 'Unable to submit quote request. Please try again.');
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const modal = document.querySelector(`${SELECTORS.modal}[open]`);
    if (!modal) return;
    event.preventDefault();
    closeModal(modal);
  });

  handlePostedRedirectState().catch((error) => {
    debugError('Failed to handle posted redirect state', error);
  });
})();
