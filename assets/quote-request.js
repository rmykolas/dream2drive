(() => {
  if (window.__quoteRequestInitialized) return;
  window.__quoteRequestInitialized = true;

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
    const clearResponse = await fetch(window.routes?.cart_clear_url || '/cart/clear.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: '{}',
    });

    if (!clearResponse.ok) {
      throw new Error('Quote sent, but cart could not be cleared. Please refresh your cart.');
    }

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

    try {
      const formData = new FormData(form);
      const summary = formData.get('contact[cart_summary]');
      const notes = formData.get('contact[body]');
      const combinedBody = [notes, '', '--- Cart summary ---', summary].filter(Boolean).join('\n');
      formData.set('contact[body]', combinedBody);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send quote request.');
      }

      await clearCartAndRefreshUI();

      formState?.classList.add('hidden');
      successState?.classList.remove('hidden');
      successState?.focus();
    } catch (error) {
      setError(form, error.message || 'Unable to submit quote request. Please try again.');
    } finally {
      submitButton?.removeAttribute('disabled');
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
    onSubmit(form);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const modal = document.querySelector(`${SELECTORS.modal}[open]`);
    if (!modal) return;
    event.preventDefault();
    closeModal(modal);
  });
})();
