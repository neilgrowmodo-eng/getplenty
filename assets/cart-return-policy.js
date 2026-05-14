(function () {
  const STYLE_ID = 'cart-return-policy-styles';
  const BADGE_CLASS = 'js-cart-return-policy-pill';
  const CONTAINER_CLASS = 'js-cart-return-policy-container';
  let refreshTimer = null;
  let observer = null;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${CONTAINER_CLASS} {
        width: 100%;
      }

      .${BADGE_CLASS} {
        display: inline-flex;
        align-items: center;
        min-height: 3.2rem;
        padding: 0.6rem 1.4rem;
        border-radius: 999px;
        background: rgb(var(--color-background));
        border: 0.1rem solid rgb(var(--color-line-strong));
        color: rgb(var(--color-foreground));
        font-size: 1.2rem;
        line-height: 1.2;
        font-weight: 500;
      }

      .cart-item__details .${CONTAINER_CLASS} {
        margin-top: 0.8rem;
      }

      .ajax-cart__product-controls .${CONTAINER_CLASS} {
        order: 4;
      }

      .ajax-cart__product-controls .ajax-cart__product-discounts {
        order: 5;
      }
    `;

    document.head.appendChild(style);
  }

  function getDiscountTitles(item, cart) {
    const itemDiscounts = Array.isArray(item.discounts) ? item.discounts : [];
    const cartDiscounts = Array.isArray(cart.cart_level_discount_applications)
      ? cart.cart_level_discount_applications
      : [];

    return itemDiscounts.concat(cartDiscounts).map((discount) => String(discount.title || ''));
  }

  function getReturnPolicyMessage(item, cart) {
    const hasWelcomeDiscount = getDiscountTitles(item, cart).some((title) =>
      title.toLowerCase().includes('welcome')
    );

    if (hasWelcomeDiscount) return '';

    const basePrice = Number(item.original_price || 0);
    const finalPrice = Number(item.final_price || 0);

    if (!basePrice || finalPrice >= basePrice) return '';

    const discountPercent = ((basePrice - finalPrice) / basePrice) * 100;

    if (discountPercent >= 50) return 'Final sale';
    if (discountPercent > 0) return 'Store credit only';

    return '';
  }

  function removeExistingBadges(scope) {
    scope.querySelectorAll(`.${CONTAINER_CLASS}`).forEach((node) => node.remove());
  }

  function createBadge(message) {
    const container = document.createElement('div');
    container.className = CONTAINER_CLASS;

    const badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    badge.textContent = message;

    container.appendChild(badge);
    return container;
  }

  function renderThemeCart(cart) {
    const rows = document.querySelectorAll('#main-cart-items .cart-item, #CartDrawer-CartItems .cart-item');

    rows.forEach((row, index) => {
      removeExistingBadges(row);

      const details = row.querySelector('.cart-item__details');
      const item = cart.items[index];

      if (!details || !item) return;

      const message = getReturnPolicyMessage(item, cart);
      if (!message) return;

      details.appendChild(createBadge(message));
    });
  }

  function renderAjaxCart(cart) {
    const rows = document.querySelectorAll('#ajax-cart [data-ajax-cart-products] .ajax-cart__product');

    rows.forEach((row, index) => {
      removeExistingBadges(row);

      const controls = row.querySelector('.ajax-cart__product-controls');
      const price = row.querySelector('.ajax-cart__product-price');
      const item = cart.items[index];

      if (!controls || !price || !item) return;

      const message = getReturnPolicyMessage(item, cart);
      if (!message) return;

      controls.insertBefore(createBadge(message), price);
    });
  }

  function applyReturnPolicies(cart) {
    if (!cart || !Array.isArray(cart.items)) return;

    ensureStyles();
    renderThemeCart(cart);
    renderAjaxCart(cart);
  }

  function fetchCartAndRender() {
    fetch(`${window.routes?.cart_url || '/cart'}.js`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json'
      }
    })
      .then((response) => response.json())
      .then((cart) => applyReturnPolicies(cart))
      .catch(() => {});
  }

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(fetchCartAndRender, 150);
  }

  function observeTargets() {
    if (typeof MutationObserver === 'undefined') return;

    if (!observer) {
      observer = new MutationObserver(() => {
        scheduleRefresh();
      });
    }

    [
      document.getElementById('main-cart-items'),
      document.getElementById('CartDrawer-CartItems'),
      document.querySelector('#ajax-cart [data-ajax-cart-products]')
    ]
      .filter(Boolean)
      .forEach((target) => {
        observer.observe(target, { childList: true, subtree: true });
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    scheduleRefresh();
    observeTargets();
  });

  document.addEventListener('cartChange', function () {
    observeTargets();
    scheduleRefresh();
  });

  document.addEventListener('cart:updated', scheduleRefresh);
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-toggle-cart]')) {
      scheduleRefresh();
    }
  });
})();
