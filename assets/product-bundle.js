(() => {
  const BUNDLE_CONTAINER_SELECTOR = '.bundle-variations';
  const BUNDLE_OPTION_SELECTOR = '.bundle-variations__option';

  const getProductInfoForElement = (element) => {
    return element.closest('product-info');
  };

  const parseNumber = (value) => {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return 0;
    }

    return number;
  };

  const formatPrice = (amount) => {
    const cents = Math.round(amount * 100);

    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      const moneyFormat =
        (window.theme && (window.theme.moneyFormat || window.theme.money_format)) ||
        '{{ amount_with_comma_separator }} {{ currency }}';

      try {
        const formatted = window.Shopify.formatMoney(cents, moneyFormat);

        // Strip trailing currency code if present, e.g. "€1.029,00 EUR" -> "€1.029,00"
        return formatted.replace(/\s[A-Z]{3}$/, '');
      } catch (error) {
        // fall through to basic formatting
      }
    }

    const fixed = (cents / 100).toFixed(2);
    const withComma = fixed.replace('.', ',');

    return `€${withComma}`;
  };

  const getQuantityForProductInfo = (productInfo) => {
    if (!productInfo) {
      return 1;
    }

    const quantityInput = productInfo.querySelector('.quantity__input');
    if (!quantityInput) {
      return 1;
    }

    const value = quantityInput.value || quantityInput.min || '1';

    return parseNumber(value);
  };

  const getBasePriceForContainer = (container) => {
    const basePrice = container.dataset.bundleBasePrice;

    return parseNumber(basePrice || '0');
  };

  const getSelectedOptions = (container) => {
    return Array.from(container.querySelectorAll(`${BUNDLE_OPTION_SELECTOR}.bundle-variations__option--selected`));
  };

  // Quantity of one option (product metafield custom.config_max_qty > 1 enables the selector)
  const getOptionQty = (option) => {
    return Math.max(1, parseNumber(option.dataset.qty || '1'));
  };

  const getOptionMaxQty = (option) => {
    let max = Math.max(1, parseNumber(option.dataset.maxQty || '1'));
    const inventory = parseNumber(option.dataset.inventory || '0');
    if (option.dataset.inventoryTracked === 'true' && inventory > 0) {
      max = Math.min(max, inventory);
    }

    return max;
  };

  const getQtyControl = (option) => {
    const wrapper = option.closest('.bundle-variations__option-wrapper');

    return wrapper ? wrapper.querySelector('[data-bundle-qty]') : null;
  };

  const setOptionQty = (option, qty) => {
    const value = Math.min(Math.max(1, qty), getOptionMaxQty(option));
    option.dataset.qty = String(value);
    const control = getQtyControl(option);
    if (control) {
      const label = control.querySelector('[data-bundle-qty-value]');
      if (label) label.textContent = String(value);
    }
  };

  // Show the quantity selector only while the option is selected; reset it to 1 when deselected
  const syncQtyControl = (option) => {
    const control = getQtyControl(option);
    if (!control) {
      return;
    }

    const isSelected = option.classList.contains('bundle-variations__option--selected');
    control.style.display = isSelected ? 'inline-flex' : 'none';
    const stock = option.querySelector('[data-bundle-stock]');
    if (stock) stock.style.display = isSelected ? 'none' : '';
    if (!isSelected) {
      setOptionQty(option, 1);
    }
  };

  const calculateAddOnTotal = (container) => {
    const selectedOptions = getSelectedOptions(container);
    let total = 0;

    for (const option of selectedOptions) {
      const price = parseNumber(option.dataset.price || '0');
      total += price * getOptionQty(option);
    }

    return total;
  };

  const updateBundleTotal = (container) => {
    const productInfo = getProductInfoForElement(container);
    if (!productInfo) {
      return;
    }

    const quantity = getQuantityForProductInfo(productInfo);
    const basePrice = getBasePriceForContainer(container);
    const addOnTotal = calculateAddOnTotal(container);
    const total = (basePrice + addOnTotal) * quantity;
    const sectionId = container.dataset.bundleSection;
    if (!sectionId) {
      return;
    }

    const formatted = formatPrice(total);

    const selectors = [
      `#price-${sectionId} .price`,
      `#variable-price-${sectionId} .price`,
    ];

    selectors.forEach((selector) => {
      const nodes = productInfo.querySelectorAll(selector);

      for (const node of nodes) {
        // Replace the visible price content with the bundle total
        node.textContent = formatted;
      }
    });
  };

  // +/- buttons of an option's quantity selector. Returns true if the click was handled.
  const handleQtyClick = (event, container) => {
    const minus = event.target.closest('[data-bundle-qty-minus]');
    const plus = event.target.closest('[data-bundle-qty-plus]');
    if (!minus && !plus) {
      // A click on the counter itself must not deselect the option
      return Boolean(event.target.closest('[data-bundle-qty]'));
    }

    const wrapper = event.target.closest('.bundle-variations__option-wrapper');
    const option = wrapper ? wrapper.querySelector(BUNDLE_OPTION_SELECTOR) : null;
    if (!option) {
      return true;
    }

    setOptionQty(option, getOptionQty(option) + (plus ? 1 : -1));
    updateBundleTotal(container);

    return true;
  };

  const handleOptionClick = (event, container) => {
    const option = event.target.closest(BUNDLE_OPTION_SELECTOR);
    if (!option) {
      return;
    }

    if (option.dataset.available === 'false' || option.classList.contains('bundle-variations__option--unavailable')) {
      return;
    }

    const group = option.closest('.bundle-variations__group');
    const isMulti = !group || group.dataset.multiSelect === 'true';

    if (!isMulti && !option.classList.contains('bundle-variations__option--selected')) {
      // Single-select group: deselect the other options first
      group
        .querySelectorAll(`${BUNDLE_OPTION_SELECTOR}.bundle-variations__option--selected`)
        .forEach((selected) => {
          selected.classList.remove('bundle-variations__option--selected');
          syncQtyControl(selected);
        });
    }

    option.classList.toggle('bundle-variations__option--selected');
    syncQtyControl(option);

    if (group) {
      clearGroupError(group);
    }

    updateBundleTotal(container);
  };

  const clearGroupError = (group) => {
    group.classList.remove('bundle-variations__group--error');
    const message = group.querySelector('.bundle-variations__group-error');
    if (message) message.hidden = true;
  };

  // Returns the required groups that have no selected option and marks them
  const getMissingRequiredGroups = (container) => {
    const missing = [];
    const groups = container.querySelectorAll('.bundle-variations__group[data-required="true"]');

    groups.forEach((group) => {
      const hasSelection = group.querySelector(`${BUNDLE_OPTION_SELECTOR}.bundle-variations__option--selected`);
      if (hasSelection) {
        clearGroupError(group);
        return;
      }

      group.classList.add('bundle-variations__group--error');
      const message = group.querySelector('.bundle-variations__group-error');
      if (message) message.hidden = false;
      missing.push(group);
    });

    return missing;
  };

  const buildBundleItems = (container, productInfo) => {
    const mainVariantInput = productInfo?.querySelector('input[name="id"]');
    const mainVariantId = mainVariantInput?.value;

    if (!mainVariantId) {
      return null;
    }

    const quantity = getQuantityForProductInfo(productInfo);
    const selectedOptions = getSelectedOptions(container);
    const bundleId = `bundle-${Date.now()}`;
    const mainProductTitle = document.querySelector('.product__title h2')?.textContent?.trim() || '';

    const bundleDetails = selectedOptions.map((option, index) => {
      return {
        index: index + 1,
        productTitle: option.dataset.productTitle || '',
        optionTitle: option.dataset.optionTitle || '',
        variantId: parseNumber(option.dataset.variantId || '0'),
        price: parseNumber(option.dataset.price || '0'),
        qty: getOptionQty(option),
      };
    });

    const basePrice = getBasePriceForContainer(container);
    const addOnTotal = calculateAddOnTotal(container);
    const totalPrice = (basePrice + addOnTotal) * quantity;

    const properties = {
      _bundle: 'true',
      _bundle_id: bundleId,
      _bundle_parent_title: mainProductTitle,
      _bundle_total_price: formatPrice(totalPrice),
    };

    for (const [index, item] of bundleDetails.entries()) {
      const suffix = index + 1;
      const qtyLabel = item.qty > 1 ? ` × ${item.qty}` : '';
      const label = `${item.productTitle} - ${item.optionTitle}${qtyLabel} (${formatPrice(item.price * item.qty)})`;

      properties[`Item ${suffix}`] = label;
      properties[`_bundle_item_${suffix}_title`] = item.productTitle;
      properties[`_bundle_item_${suffix}_option`] = item.optionTitle;
      properties[`_bundle_item_${suffix}_variant_id`] = item.variantId;
      properties[`_bundle_item_${suffix}_price`] = formatPrice(item.price);
      properties[`_bundle_item_${suffix}_qty`] = item.qty;
    }

    const parentItem = {
      id: parseNumber(mainVariantId),
      quantity,
      properties,
    };

    const childItems = bundleDetails
      .filter((item) => item.variantId)
      .map((item) => {
        return {
          id: item.variantId,
          quantity: quantity * item.qty,
          properties: {
            _child_of: parseNumber(mainVariantId),
            _bundle_id: bundleId,
            _bundle_parent_title: mainProductTitle,
          },
        };
      });

    return [parentItem, ...childItems];
  };

  const initBundleForContainer = (container) => {
    if (container.dataset.bundleInitialized === 'true') {
      return;
    }

    if (!container.dataset.bundleSection) {
      return;
    }

    const productInfo = getProductInfoForElement(container);
    if (!productInfo) {
      return;
    }

    container.dataset.bundleInitialized = 'true';

    container.addEventListener('click', (event) => {
      if (handleQtyClick(event, container)) {
        return;
      }

      handleOptionClick(event, container);
    });

    const quantityInput = productInfo.querySelector('.quantity__input');
    if (quantityInput) {
      quantityInput.addEventListener('change', () => {
        updateBundleTotal(container);
      });
      quantityInput.addEventListener('input', () => {
        updateBundleTotal(container);
      });
    }

    updateBundleTotal(container);

    initBundleInfoDialogs(container);
  };

  const initBundleInfoDialogs = (container) => {
    const triggers = container.querySelectorAll('[data-bundle-info-open]');

    for (const trigger of triggers) {
      const dialogId = trigger.getAttribute('data-bundle-info-open');
      if (!dialogId) continue;

      const dialog = document.getElementById(dialogId);
      if (!dialog || typeof dialog.showModal !== 'function') continue;

      const handleOpen = () => {
        dialog.showModal();
        const heading = dialog.querySelector('.bundle-variations__info-heading');
        (heading || dialog).focus();
      };

      const handleClose = () => {
        dialog.close();
      };

      trigger.addEventListener('click', handleOpen);

      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) {
          handleClose();
        }
      });

      const closeButtons = dialog.querySelectorAll('[data-bundle-info-close]');
      closeButtons.forEach((button) => {
        button.addEventListener('click', handleClose);
      });

      dialog.addEventListener('close', () => {
        trigger.focus();
      });
    }
  };

  const initBundles = () => {
    const containers = document.querySelectorAll(BUNDLE_CONTAINER_SELECTOR);

    for (const container of containers) {
      initBundleForContainer(container);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initBundles();
  });

  document.addEventListener('product-info:loaded', (event) => {
    const productInfo = event.target.closest
      ? event.target.closest('product-info')
      : null;

    if (!productInfo) {
      return;
    }

    const container = productInfo.querySelector(BUNDLE_CONTAINER_SELECTOR);
    if (!container) {
      return;
    }

    initBundleForContainer(container);
  });

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined' && PUB_SUB_EVENTS.variantChange) {
    subscribe(PUB_SUB_EVENTS.variantChange, ({ data }) => {
      const sectionId = data?.sectionId;
      const variant = data?.variant;

      if (!sectionId || !variant || typeof variant.price !== 'number') {
        return;
      }

      const selector = `${BUNDLE_CONTAINER_SELECTOR}[data-bundle-section="${sectionId}"]`;
      const containers = document.querySelectorAll(selector);

      for (const container of containers) {
        const updatedBasePrice = (variant.price / 100).toString();
        container.dataset.bundleBasePrice = updatedBasePrice;
        initBundleForContainer(container);
        updateBundleTotal(container);
      }
    });
  }

  // Intercept the existing product form submit when bundle options are selected
  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const productInfo = form.closest('product-info');
      if (!productInfo) {
        return;
      }

      const container = productInfo.querySelector(BUNDLE_CONTAINER_SELECTOR);
      if (!container) {
        return;
      }

      const missingGroups = getMissingRequiredGroups(container);
      if (missingGroups.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        missingGroups[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const selectedOptions = getSelectedOptions(container);
      if (!selectedOptions.length) {
        // No bundle selection: let the normal product-form logic run
        return;
      }

      const items = buildBundleItems(container, productInfo);
      if (!items || !items.length) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      const submitButton = form.querySelector('[type="submit"]');
      const spinner = productInfo?.querySelector('.loading__spinner');

      if (submitButton?.hasAttribute('aria-disabled')) return;
      if (submitButton) {
        submitButton.setAttribute('aria-disabled', 'true');
        submitButton.classList.add('loading');
      }
      if (spinner) spinner.classList.remove('hidden');

      (async () => {
        try {
          const sectionsToRender = cart?.getSectionsToRender?.() || [];
          const sectionIds = sectionsToRender.map((s) => s.id);
          const addUrl = window.routes?.cart_add_url || '/cart/add';
          const jsonAddUrl = addUrl.endsWith('.js') ? addUrl : addUrl + '.js';

          const body = {
            items,
            ...(sectionIds.length && {
              sections: sectionIds.join(','),
              sections_url: window.location.pathname,
            }),
          };

          const response = await fetch(jsonAddUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          const responseText = await response.text();
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            // eslint-disable-next-line no-console
            console.error('Cart add response was not JSON:', parseError);
            alert('There was an error adding your bundle to the cart. Please try again.');
            return;
          }

          if (!response.ok) {
            // eslint-disable-next-line no-alert
            alert(data?.message || 'There was an error adding your bundle to the cart.');
            return;
          }

          if (cart && data.sections && sectionIds.length) {
            if (cart.setActiveElement) cart.setActiveElement(document.activeElement);
            cart.renderContents(data);
          } else {
            window.location.href = window.routes?.cart_url || '/cart';
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error adding bundle to cart', error);
          // eslint-disable-next-line no-alert
          alert('There was an error adding your bundle to the cart.');
        } finally {
          if (submitButton) {
            submitButton.removeAttribute('aria-disabled');
            submitButton.classList.remove('loading');
          }
          if (spinner) spinner.classList.add('hidden');
          if (cart?.classList?.contains('is-empty')) cart.classList.remove('is-empty');
        }
      })();
    },
    true
  );
})();