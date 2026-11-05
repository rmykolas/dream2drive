(() => {
  if (window.__cartUpsellInit) return;
  window.__cartUpsellInit = true;

  const isCartPage = () => Boolean(document.getElementById('main-cart-items'));

  const setLoading = (button, loading) => {
    button.disabled = loading;
    button.classList.toggle('loading', loading);
    const spinner = button.querySelector('.cart-upsell__spinner');
    if (spinner) spinner.hidden = !loading;
  };

  const showError = (wrapper, message) => {
    const el = wrapper?.querySelector('.cart-upsell__error');
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  };

  // Variant select: update the button's variant and the shown price
  document.addEventListener('change', (event) => {
    const select = event.target.closest('[data-cart-upsell-select]');
    if (!select) return;
    const item = select.closest('[data-cart-upsell-item]');
    const button = item?.querySelector('[data-cart-upsell-add]');
    const option = select.selectedOptions[0];
    if (button && option) button.dataset.variantId = option.value;
    const price = item?.querySelector('[data-cart-upsell-price]');
    if (price && option?.dataset.price) price.textContent = option.dataset.price;
  });

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cart-upsell-add]');
    if (!button || button.disabled) return;
    event.preventDefault();

    const wrapper = button.closest('[data-cart-upsell]');
    const variantId = Number(button.dataset.variantId);
    if (!variantId) return;

    showError(wrapper, '');
    setLoading(button, true);

    const drawer = document.querySelector('cart-drawer');
    const onCartPage = isCartPage();
    const sections = !onCartPage && drawer?.getSectionsToRender ? drawer.getSectionsToRender() : [];

    const body = {
      items: [{ id: variantId, quantity: 1 }],
      ...(sections.length && {
        sections: sections.map((s) => s.id).join(','),
        sections_url: window.location.pathname,
      }),
    };

    try {
      const addUrl = (window.routes?.cart_add_url || '/cart/add') + '.js';
      const response = await fetch(addUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok || data.status) {
        showError(wrapper, data.description || data.message || 'Could not add to cart.');
        setLoading(button, false);
        return;
      }

      if (onCartPage) {
        window.location.reload();
        return;
      }

      if (drawer && data.sections) {
        drawer.renderContents(data);
      } else {
        window.location.href = window.routes?.cart_url || '/cart';
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Cart upsell add failed', error);
      showError(wrapper, 'Could not add to cart.');
      setLoading(button, false);
    }
  });
})();
