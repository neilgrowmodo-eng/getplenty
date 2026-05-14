class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') ||
      document.getElementById('CartDrawer-LineItemStatus');

    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]')).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0
    );

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    this.updateQuantity(
      event.target.dataset.index,
      event.target.value,
      document.activeElement.getAttribute('name')
    );
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section'
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents'
      }
    ];
  }

  updateQuantity(line, quantity, name) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname
    });

    fetch(`${routes.cart_change_url}`, {...fetchConfig(), ...{body}})
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);

        const cartChange = new CustomEvent('cartChange', {
          detail: {
            cartTotal: parsedState.total_price
          }
        });
        document.dispatchEvent(cartChange);

        // Track cart updates (including remove from cart when quantity is 0)
        if (window.plentyAnalytics && window.plentyAnalytics.trackEvent) {
          const previousQuantity = this.currentItemCount || 0;
          const currentQuantity = parsedState.item_count || 0;
          
          // If quantity decreased to 0, track remove from cart
          if (quantity === 0 && previousQuantity > 0) {
            // Get variant ID from the line item being removed
            const lineItem = this.querySelector(`[data-index="${line}"]`);
            const variantId = lineItem?.querySelector('[name="id"]')?.value || null;
            
            if (variantId && window.plentyAnalytics.trackRemoveFromCart) {
              window.plentyAnalytics.trackRemoveFromCart(variantId);
            }
          }
          
          // Track cart updated event
          window.plentyAnalytics.trackEvent('cart_updated', {
            cart_value: parsedState.total_price ? (parsedState.total_price / 100).toFixed(2) : '0.00',
            cart_quantity: parsedState.item_count || 0
          });
        }

        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartDrawerWrapper = document.querySelector('cart-drawer');
        const cartFooter = document.getElementById('main-cart-footer');

        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
        if (cartDrawerWrapper)
          cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) ||
            document.getElementById(section.id);
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector
          );
        });

        this.updateLiveRegions(line, parsedState.item_count);
        const lineItem =
          document.getElementById(`CartItem-${line}`) ||
          document.getElementById(`CartDrawer-Item-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
            : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(
            cartDrawerWrapper.querySelector('.drawer__inner-empty'),
            cartDrawerWrapper.querySelector('a')
          );
        } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
        }
        this.disableLoading();
      })
      .catch(() => {
        this.querySelectorAll('.loading-overlay').forEach((overlay) =>
          overlay.classList.add('hidden')
        );
        const errors =
          document.getElementById('cart-errors') ||
          document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
        this.disableLoading();
      });
  }

  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      const lineItemError =
        document.getElementById(`Line-item-error-${line}`) ||
        document.getElementById(`CartDrawer-LineItemError-${line}`);
      const quantityElement =
        document.getElementById(`Quantity-${line}`) ||
        document.getElementById(`Drawer-quantity-${line}`);
      lineItemError.querySelector('.cart-item__error-text').innerHTML =
        window.cartStrings.quantityError.replace('[quantity]', quantityElement.value);
    }

    this.currentItemCount = itemCount;
    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') ||
      document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems =
      document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading-overlay`);
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading-overlay`
    );

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) =>
      overlay.classList.remove('hidden')
    );

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading() {
    const mainCartItems =
      document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'change',
          debounce((event) => {
            const body = JSON.stringify({note: event.target.value});
            fetch(`${routes.cart_update_url}`, {...fetchConfig(), ...{body}});
          }, 300)
        );
      }
    }
  );
}

function getMainCartSectionsToRender() {
  const itemsEl = document.getElementById('main-cart-items');
  const footerEl = document.getElementById('main-cart-footer');
  if (!itemsEl || !footerEl) return [];

  return [
    {
      id: 'main-cart-items',
      section: itemsEl.dataset.id,
      selector: '.js-contents'
    },
    {
      id: 'cart-icon-bubble',
      section: 'cart-icon-bubble',
      selector: '.shopify-section'
    },
    {
      id: 'cart-live-region-text',
      section: 'cart-live-region-text',
      selector: '.shopify-section'
    },
    {
      id: 'main-cart-footer',
      section: footerEl.dataset.id,
      selector: '.js-contents'
    }
  ];
}

function getDrawerDiscountSectionsToRender() {
  const drawerRoot = document.getElementById('CartDrawer');
  if (!drawerRoot) return [];

  return [
    {
      id: 'CartDrawer',
      section: 'cart-drawer',
      selector: '.drawer__inner'
    },
    {
      id: 'cart-icon-bubble',
      section: 'cart-icon-bubble',
      selector: '.shopify-section'
    }
  ];
}

/** Sections to re-render after discount apply/remove (main cart and/or drawer). */
function getDiscountUpdateSections(discountEl) {
  const inDrawer = discountEl && discountEl.closest('cart-drawer');
  let list = [];

  if (inDrawer) {
    list = list.concat(getDrawerDiscountSectionsToRender());
    const main = getMainCartSectionsToRender();
    if (main.length && window.routes?.cart_url && window.location.pathname === window.routes.cart_url) {
      list = list.concat(main);
    }
  } else {
    list = getMainCartSectionsToRender();
  }

  const seen = new Set();
  return list.filter((entry) => {
    if (seen.has(entry.section)) return false;
    seen.add(entry.section);
    return true;
  });
}

if (!customElements.get('cart-discount')) {
  customElements.define(
    'cart-discount',
    class CartDiscount extends HTMLElement {
      constructor() {
        super();
        this._onSubmit = this._onSubmit.bind(this);
        this._onRemove = this._onRemove.bind(this);
      }

      connectedCallback() {
        this.form = this.querySelector('.cart-discount__form');
        this.input = this.querySelector('[name="discount"]');
        this.errorEl = this.querySelector('[data-cart-discount-error]');
        this.applyBtn = this.querySelector('[data-cart-discount-apply]');
        this.removeBtn = this.querySelector('[data-cart-discount-remove]');
        this.form?.addEventListener('submit', this._onSubmit);
        this.removeBtn?.addEventListener('click', this._onRemove);
      }

      disconnectedCallback() {
        this.form?.removeEventListener('submit', this._onSubmit);
        this.removeBtn?.removeEventListener('click', this._onRemove);
      }

      getSectionInnerHTML(html, selector) {
        return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
      }

      renderSections(parsedState, sectionsList) {
        if (!parsedState.sections) return;
        const list = sectionsList || getDiscountUpdateSections(this);
        list.forEach((section) => {
          const el = document.getElementById(section.id);
          if (!el) return;
          const sectionHtml = parsedState.sections[section.section];
          if (!sectionHtml) return;
          const elementToReplace = el.querySelector(section.selector) || el;
          elementToReplace.innerHTML = this.getSectionInnerHTML(sectionHtml, section.selector);
        });
      }

      updateRemoveVisibility(cart) {
        if (!this.removeBtn) return;
        const codes = cart && Array.isArray(cart.discount_codes) ? cart.discount_codes : [];
        this.removeBtn.hidden = codes.length === 0;
      }

      clearError() {
        if (this.errorEl) this.errorEl.textContent = '';
      }

      setError(message) {
        if (this.errorEl) this.errorEl.textContent = message || '';
      }

      _onSubmit(event) {
        event.preventDefault();
        const code = this.input.value.trim();
        if (!code) {
          this.setError(window.cartDiscountStrings?.empty);
          return;
        }
        this._updateDiscount(code);
      }

      _onRemove(event) {
        event.preventDefault();
        this._updateDiscount('');
      }

      _updateDiscount(discountValue) {
        const sections = getDiscountUpdateSections(this);
        if (!sections.length) return;

        const body = JSON.stringify({
          discount: discountValue,
          sections: sections.map((s) => s.section),
          sections_url: window.location.pathname
        });

        this.clearError();
        this.applyBtn?.setAttribute('disabled', 'disabled');
        this.removeBtn?.setAttribute('disabled', 'disabled');
        this.input.setAttribute('disabled', 'disabled');

        fetch(`${routes.cart_update_url}`, {...fetchConfig(), ...{body}})
          .then(async (response) => {
            const text = await response.text();
            let data;
            try {
              data = JSON.parse(text);
            } catch (e) {
              throw new Error('parse');
            }
            if (!response.ok) {
              const msg =
                data.description ||
                data.message ||
                window.cartDiscountStrings?.error ||
                window.cartStrings.error;
              this.setError(msg);
              return null;
            }
            return data;
          })
          .then((data) => {
            if (!data) return;
            document.dispatchEvent(
              new CustomEvent('cartChange', {
                detail: {
                  cartTotal: data.total_price
                }
              })
            );
            this.renderSections(data, sections);
            this.updateRemoveVisibility(data);
            if (discountValue) this.input.value = '';
          })
          .catch(() => {
            this.setError(window.cartStrings.error);
          })
          .finally(() => {
            this.applyBtn?.removeAttribute('disabled');
            this.removeBtn?.removeAttribute('disabled');
            this.input.removeAttribute('disabled');
          });
      }
    }
  );
}
