(() => {
  if (window.__quoteRequestInitialized) return;
  window.__quoteRequestInitialized = true;
  const DEBUG = true;

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
    form: '[data-quote-form]',
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
      const formData = new FormData(form);
      const summary = formData.get('contact[cart_summary]');
      const notes = formData.get('contact[body]');
      const combinedBody = [notes, '', '--- Cart summary ---', summary].filter(Boolean).join('\n');
      formData.set('contact[body]', combinedBody);
      formData.delete('contact[cart_summary]');
      const encodedBody = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        encodedBody.append(key, value);
      }
      debugInfo('Prepared payload', {
        name: formData.get('contact[name]'),
        email: formData.get('contact[email]'),
        hasPhone: Boolean(formData.get('contact[phone]')),
        bodyLength: String(formData.get('contact[body]') || '').length,
      });

      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'text/html',
        },
        body: encodedBody.toString(),
      });
      debugInfo('Contact submit response', {
        status: response.status,
        ok: response.ok,
        redirected: response.redirected,
        finalUrl: response.url,
      });

      if (!response.ok) {
        let responseBody = '';
        try {
          responseBody = await response.text();
        } catch (error) {
          debugError('Unable to read contact response body', error);
        }
        debugError('Contact submit failed', {
          status: response.status,
          statusText: response.statusText,
          body: responseBody,
        });
        throw new Error('Failed to send quote request.');
      }

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

  document.addEventListener('submit', (event) => {
    const form = event.target.closest(SELECTORS.form);
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    debugInfo('Intercepted form submit event.');
    onSubmit(form).catch((error) => {
      debugError('Unhandled submit error', error);
      setError(form, 'Unable to submit quote request. Please try again.');
    });
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
})();
