/**
 * Customise Simulator & Racer: hover tooltips positioned with Floating UI.
 * Loads @floating-ui/dom from CDN and wires hotspot buttons to tooltips.
 * Supports both dd-customize-simulator and dd-customize-racer sections.
 */
(function () {
  const SECTION_SELECTOR = '[id^="dd-customize-simulator-"], [id^="dd-customize-racer-"]';
  const HOTSPOT_SELECTOR = '[data-hotspot-id][data-section-id]';
  const TOOLTIP_SELECTOR = '[data-tooltip-block-id][data-section-id][role="tooltip"]';
  const HIDE_DELAY_MS = 100;

  async function init() {
    const { computePosition, flip, shift, autoUpdate, size } = await import(
      'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.5/+esm'
    );

    const sections = document.querySelectorAll(SECTION_SELECTOR);
    for (const section of sections) {
      const sectionId = section.dataset.sectionId;
      if (!sectionId) continue;

      const hotspots = section.querySelectorAll(HOTSPOT_SELECTOR);
      const tooltips = section.querySelectorAll(TOOLTIP_SELECTOR);

      for (const hotspotEl of hotspots) {
        const blockId = hotspotEl.dataset.hotspotId;
        const button = hotspotEl.querySelector('button');
        const tooltipEl = section.querySelector(
          `[data-tooltip-block-id="${blockId}"][data-section-id="${sectionId}"]`
        );
        if (!button || !tooltipEl) continue;

        if (tooltipEl.parentNode !== document.body) {
          document.body.appendChild(tooltipEl);
        }

        let hideTimeout = null;
        let cleanupAutoUpdate = null;

        function updatePosition() {
          computePosition(button, tooltipEl, {
            placement: 'right',
            strategy: 'fixed',
            middleware: [
              flip({
                padding: 8,
                fallbackPlacements: ['left', 'top', 'bottom']
              }),
              shift({
                padding: 8,
                crossAxis: true
              }),
              size({
                padding: 8,
                apply({ availableWidth, elements }) {
                  const maxWidth = Math.max(220, Math.min(303, Math.floor(availableWidth)));
                  elements.floating.style.maxWidth = `${maxWidth}px`;
                }
              })
            ]
          }).then(({ x, y }) => {
            tooltipEl.style.left = `${x}px`;
            tooltipEl.style.top = `${y}px`;
          });
        }

        function showTooltip() {
          if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }
          if (cleanupAutoUpdate) {
            cleanupAutoUpdate();
            cleanupAutoUpdate = null;
          }
          tooltipEl.removeAttribute('hidden');
          tooltipEl.setAttribute('aria-hidden', 'false');
          button.setAttribute('aria-expanded', 'true');
          updatePosition();
          cleanupAutoUpdate = autoUpdate(button, tooltipEl, updatePosition);
        }

        function hideTooltip() {
          hideTimeout = setTimeout(() => {
            hideTimeout = null;
            if (cleanupAutoUpdate) {
              cleanupAutoUpdate();
              cleanupAutoUpdate = null;
            }
            tooltipEl.setAttribute('hidden', '');
            tooltipEl.setAttribute('aria-hidden', 'true');
            button.setAttribute('aria-expanded', 'false');
          }, HIDE_DELAY_MS);
        }

        function cancelHide() {
          if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }
        }

        button.addEventListener('mouseenter', showTooltip);
        button.addEventListener('mouseleave', hideTooltip);
        button.addEventListener('focus', showTooltip);
        button.addEventListener('blur', hideTooltip);

        tooltipEl.addEventListener('mouseenter', cancelHide);
        tooltipEl.addEventListener('mouseleave', hideTooltip);
        tooltipEl.addEventListener('focusin', cancelHide);
        tooltipEl.addEventListener('focusout', hideTooltip);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
