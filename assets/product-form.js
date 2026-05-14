if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.form.querySelector('[name=id]').disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart =
          document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        if (document.querySelector('cart-drawer'))
          this.submitButton.setAttribute('aria-haspopup', 'dialog');
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            this.error = false;
            
            // Track add to cart event
            if (window.plentyAnalytics && window.plentyAnalytics.trackAddToCart) {
              const formData = new FormData(this.form);
              const variantId = formData.get('id');
              const quantity = parseInt(formData.get('quantity') || '1', 10);
              const productData = window.productData || null;
              window.plentyAnalytics.trackAddToCart(variantId, quantity, productData);
            }
            
            const quickAddModal = this.closest('quick-add-modal');
            const upsellCarousel = this.closest('.ajax-cart__upsell');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                {once: true}
              );
              quickAddModal.hide(true);
            } else {
              // this.cart.renderContents(response);
            }

            if (typeof p80 !== typeof undefined && p80.cart) {
              if (upsellCarousel) p80.cart.updateCart();
              else p80.cart.toggleCart();
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty'))
              this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading-overlay__spinner').classList.add('hidden');
          });
      }

      handleErrorMessage(errorMessage = false) {
        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
    }
  );
}

class CardVariantSelects extends VariantSelects {
  constructor() {
    super();
    this.productForm = this.closest('.card__actions').querySelector('product-form');
    if (!this.productForm) return;
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.removeErrorMessage();

    if (!this.currentVariant.available) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.toggleAddButton(false, '', false);
      this.updateVariantInput();
    }
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    let productForm = this.productForm;

    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    let productForm = this.productForm;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
  }

  updateVariantInput() {
    let productForm = this.productForm;

    const input = productForm.querySelector('input[name="id"]');
    input.value = this.currentVariant.id;
    input.dispatchEvent(new Event('change', {bubbles: true}));
  }

  removeErrorMessage() {
    let productForm = this.productForm;
    productForm.handleErrorMessage();
  }
}

customElements.define('card-variant-selects', CardVariantSelects);
