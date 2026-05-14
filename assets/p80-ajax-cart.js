if (typeof p80 === typeof undefined) {
  var p80 = {};
}

p80.ajaxCart = function (config) {
  this.showCartButtons = document.querySelectorAll('[data-toggle-cart]');
  this.container = document.getElementById('ajax-cart');
  this.header = this.container.querySelector('.ajax-cart__header');
  this.shipping = this.container.querySelector('.ajax-cart__shipping');
  this.upsell = this.container.querySelector('.ajax-cart__upsell');
  this.controls = this.container.querySelector('.ajax-cart-controls');
  this.checkoutButton = this.container.querySelector('.ajax-cart__checkout');
  this.priceDisplay = this.container.querySelector('[data-ajax-cart-price]');
  this.hasProductsContainer = this.container.querySelector('.ajax-cart__has-products');
  this.noProductsContainer = this.container.querySelector('.ajax-cart__no-products');
  this.primaryProductDisplay = this.container.querySelector('[data-ajax-cart-products]');
  this.productTemplate = document.getElementById('ajax-cart-product-template');

  if (!this.productTemplate) {
    console.error('Product template not found in markup.');
    return;
  }

  this.productTemplate = this.productTemplate.cloneNode(true);
  this.productTemplate.classList.remove('hidden');
  this.productTemplate.removeAttribute('id');

  this.spinnerSVG = `
        <svg class='spinner' viewBox='0 0 50 50'>
            <circle class='path' cx='25' cy='25' r='20' fill='none' stroke-width='5'></circle>
        </svg>
    `;
  this.isVisible = false;
  this.isUpdating = false;
  this.products = [];
  this.bind();
};

p80.ajaxCart.prototype.toggleCart = function () {
  const cart = this;
  if (this.isUpdating) return;
  if (cart.isVisible) {
    cart.container.classList.remove('active');
    document.querySelector('body').classList.remove('cart-active');
    cart.isVisible = false;
  } else {
    cart.showLoaders();
    cart.fetchCart();
    cart.container.classList.add('active');
    document.querySelector('body').classList.add('cart-active');
    cart.isVisible = true;
  }
};

p80.ajaxCart.prototype.updateCart = function () {
  const cart = this;
  cart.showLoaders();
  cart.fetchCart();
  cart.container.classList.add('active');
  document.querySelector('body').classList.add('cart-active');
  cart.isVisible = true;
};

p80.ajaxCart.prototype.calculateOverflow = function () {
  const cart = this;
  const totalHeight = cart.container.offsetHeight;
  const headerHeight = cart.header.offsetHeight;
  const shippingHeight = cart.shipping.offsetHeight;
  const upsellHeight = cart.upsell.offsetHeight;
  const controlHeight = cart.controls.offsetHeight;
  const productsHeight = cart.primaryProductDisplay.scrollHeight;
  let threshold = totalHeight - headerHeight - controlHeight;

  // include the shipping element height if exist
  if (cart.shipping) threshold -= shippingHeight;

  // add min-height to products element if upsell exist
  if (cart.upsell) {
    threshold -= 24;
    cart.primaryProductDisplay.style.minHeight = threshold - upsellHeight + 'px';
  }

  if (threshold < productsHeight || cart.upsell) {
    cart.primaryProductDisplay.parentNode.style.maxHeight = threshold + 'px';
    cart.primaryProductDisplay.parentNode.style.overflowY = 'auto';
  }
};

p80.ajaxCart.prototype.showLoaders = function () {
  const cart = this;
  if (cart.priceDisplay) {
    cart.priceDisplay.innerHTML = this.spinnerSVG;
  }
  if (cart.primaryProductDisplay) {
    cart.primaryProductDisplay.innerHTML = this.spinnerSVG;
  }
  if (cart.secondaryProductDisplay) {
    cart.secondaryProductDisplay.innerHTML = this.spinnerSVG;
  }
};

p80.ajaxCart.prototype.showPriceLoader = function () {
  const cart = this;
  if (cart.priceDisplay) {
    cart.priceDisplay.innerHTML = this.spinnerSVG;
  }
};

p80.ajaxCart.prototype.fetchCart = function () {
  const cart = this;
  cart.products = [];
  fetch(window.Shopify.routes.root + 'cart.js', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.items) {
        cart.data = data;
        cart.generateCart();
        cart.updateTotal();
      } else {
        cart.data = null;
        cart.generateCart();
        cart.updateTotal();
      }
      if (p80.updateCartCount) {
        p80.updateCartCount(data.item_count);
      }
    })
    .catch((error) => {
      console.error('Error fetching cart:', error);
    });
};

p80.ajaxCart.prototype.generateCart = function () {
  const cart = this;
  cart.primaryProductDisplay.innerHTML = '';
  if (cart.data.items && cart.data.items.length) {
    for (var x = 0; x < cart.data.items.length; x++) {
      const cartItem = new p80.ajaxCartItem(cart, cart.data.items[x]);
      cart.products.push(cartItem);
      cart.primaryProductDisplay.appendChild(cartItem.html);
    }
    cart.hasProductsContainer.classList.remove('hidden');
    cart.noProductsContainer.classList.add('hidden');
  } else {
    cart.hasProductsContainer.classList.add('hidden');
    cart.noProductsContainer.classList.remove('hidden');
  }
  cart.calculateOverflow();
};

p80.ajaxCart.prototype.updateTotal = function () {
  const cart = this;
  if (!cart.data.total_price) {
    cart.priceDisplay.innerHTML = '';
    cart.priceDisplay.innerText = '$0.00';
  }
  cart.priceDisplay.innerHTML = '';
  let totalPrice = cart.data.total_price;
  totalPrice = totalPrice / 100;
  totalPrice = totalPrice.toLocaleString('en-US', {style: 'currency', currency: 'USD'});
  cart.priceDisplay.innerText = totalPrice;
  if (this.shipping) {
    this.shipping.querySelector('shipping-bar').cartTotal = cart.data.total_price;
    this.shipping.querySelector('shipping-bar').updateShipping();
  }
};

p80.ajaxCart.prototype.bind = function () {
  const cart = this;
  if (cart.showCartButtons.length) {
    for (var x = 0; x < cart.showCartButtons.length; x++) {
      this.showCartButtons[x].addEventListener('click', function (e) {
        e.preventDefault();
        cart.toggleCart();
      });
    }
  }
  document.addEventListener('click', function (e) {
    if (cart.isVisible) {
      if (e.target !== cart.container && !cart.container.contains(e.target)) {
        if (
          e.target.hasAttribute('data-toggle-cart') ||
          e.target.parentElement.hasAttribute('data-toggle-cart')
        )
          return;
        cart.toggleCart();
      }
    }
  });
  window.addEventListener('resize', function () {
    if (cart.isVisible) {
      cart.calculateOverflow();
    }
  });
};

p80.ajaxCart.prototype.enable = function () {
  const cart = this;
  cart.isUpdating = false;
  cart.checkoutButton.classList.remove('disabled');
};

p80.ajaxCart.prototype.disable = function () {
  const cart = this;
  cart.isUpdating = true;
  cart.checkoutButton.classList.add('disabled');
};

p80.ajaxCartItem = function (cart, data) {
  this.data = data;
  this.cart = cart;
  this.html = this.cart.productTemplate.cloneNode(true);
  this.image = this.html.querySelector('[data-ajax-cart-product-image]');
  this.title = this.html.querySelector('[data-ajax-cart-product-title]');
  this.vendor = this.html.querySelector('[data-ajax-cart-product-vendor]');
  this.subTitle = this.html.querySelector('[data-ajax-cart-product-subtitle]');
  this.badge = this.html.querySelector('[data-ajax-cart-product-badge]');
  this.price = this.html.querySelector('[data-ajax-cart-product-price]');
  this.quantityInput = this.html.querySelector('[data-ajax-cart-product-quantity]');
  this.quantityIncrease = this.html.querySelector('[data-ajax-cart-increase]');
  this.quantityDecrease = this.html.querySelector('[data-ajax-cart-decrease]');
  this.controls = this.html.querySelector('[data-ajax-cart-controls]');
  this.removeItemBtn = this.html.querySelector('[data-ajax-cart-remove]');
  this.discounts = this.html.querySelector('[data-ajax-cart-product-discounts]');

  this.isUpdating = false;
  this.generateHtml();
  this.bind();
};

p80.ajaxCartItem.prototype.generateHtml = function () {
  const cartItem = this;
  cartItem.vendor.innerText = cartItem.data.vendor;
  cartItem.image.src = cartItem.data.image;
  cartItem.title.href = cartItem.data.url;
  let title = cartItem.data.title.split(' - ');
  if (title.length) {
    title = title[0].split(' in ');
    cartItem.title.innerText = title[0];
  } else {
    cartItem.title.innerText = cartItem.data.title;
  }
  if (cartItem.data.options_with_values.length > 0) {
    cartItem.subTitle.innerHTML = '';
    for (var x = 0; x < cartItem.data.options_with_values.length; x++) {
      const variantLine = document.createElement('span');
      variantLine.innerText = `${cartItem.data.options_with_values[x].name}: ${cartItem.data.options_with_values[x].value}`;
      cartItem.subTitle.appendChild(variantLine);
    }
  }
  let variantPrice = cartItem.data.final_price;
  variantPrice = variantPrice / 100;
  variantPrice = variantPrice.toLocaleString('en-US', {style: 'currency', currency: 'USD'});

  cartItem.badge.innerHTML = '';
  if (cartItem.data.properties != null && cartItem.data.properties._is_final_sale) {
    const finalSaleBadge = document.createElement('span');
    finalSaleBadge.classList.add('badge', 'cart-item__badge', 'color-accent-2');
    finalSaleBadge.textContent = 'Final sale';
    cartItem.badge.appendChild(finalSaleBadge);
  }

  cartItem.price.innerHTML = '';
  const priceInnerEl = document.createElement('span');
  priceInnerEl.textContent = variantPrice;
  cartItem.price.appendChild(priceInnerEl);

  cartItem.quantityInput.value = cartItem.data.quantity;
  if (Array.isArray(cartItem.data.discounts) && cartItem.data.discounts.length > 0) {
    cartItem.discounts.innerHTML = '';
    for (var x = 0; x < cartItem.data.discounts.length; x++) {
      const discountLine = document.createElement('div');
      let discountPrice = cartItem.data.discounts[x].amount;
      discountPrice = discountPrice / 100;
      discountPrice = discountPrice.toLocaleString('en-US', {style: 'currency', currency: 'USD'});
      discountLine.innerText = `${cartItem.data.discounts[x].title} (-${discountPrice})`;
      cartItem.discounts.appendChild(discountLine);
    }
  }
};

p80.ajaxCartItem.prototype.bind = function () {
  const cartItem = this;
  cartItem.quantityIncrease.addEventListener('click', function (e) {
    e.preventDefault();
    cartItem.increaseQuantity();
  });
  cartItem.quantityDecrease.addEventListener('click', function (e) {
    e.preventDefault();
    cartItem.decreaseQuantity();
  });
  cartItem.removeItemBtn.addEventListener('click', function (e) {
    e.preventDefault();
    cartItem.removeLineItem(e);
  });
  cartItem.quantityInput.addEventListener('change', function (e) {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    if (value === '' || value < 0) value = 0;
    cartItem.data.quantity = parseInt(value, 10);
    cartItem.updateCartItem();
  });
  cartItem.quantityInput.addEventListener('input', function (e) {
    if (cartItem.isUpdating) {
      e.preventDefault();
      return;
    }
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    if (value === '' || value < 0) value = 0;
    cartItem.data.quantity = parseInt(value, 10);
  });
};

p80.ajaxCartItem.prototype.increaseQuantity = function () {
  const cartItem = this;
  if (cartItem.isUpdating) return;
  cartItem.data.quantity = cartItem.data.quantity + 1;
  cartItem.quantityInput.value = cartItem.data.quantity;
  cartItem.updateCartItem();
};

p80.ajaxCartItem.prototype.decreaseQuantity = function () {
  const cartItem = this;
  if (cartItem.isUpdating) return;
  if (cartItem.data.quantity <= 0) return;
  cartItem.data.quantity = cartItem.data.quantity - 1;
  cartItem.quantityInput.value = cartItem.data.quantity;
  cartItem.updateCartItem();
};

p80.ajaxCartItem.prototype.removeLineItem = function (e) {
  const cartItem = this;
  if (cartItem.isUpdating) return;
  cartItem.data.quantity = 0;
  cartItem.quantityInput.value = cartItem.data.quantity;
  cartItem.updateCartItem();
};

p80.ajaxCartItem.prototype.updateCartItem = function () {
  const cartItem = this;
  if (cartItem.isUpdating) return;
  cartItem.isUpdating = true;
  cartItem.disable();
  cartItem.cart.disable();
  cartItem.cart.showPriceLoader();
  const variantId = cartItem.data.variant_id;
  const quantity = cartItem.data.quantity;
  const postData = {
    updates: {
      [variantId]: quantity
    }
  };
  fetch(window.Shopify.routes.root + 'cart/update.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postData)
  })
    .then((response) => response.json())
    .then((data) => {
      cartItem.enable();
      cartItem.cart.enable();
      if (data.items && data.items.length) {
        cartItem.cart.hasProductsContainer.classList.remove('hidden');
        cartItem.cart.noProductsContainer.classList.add('hidden');
        cartItem.cart.data = data;
        cartItem.cart.updateTotal();
        const newData = data.items.filter(function (item) {
          return item.variant_id === variantId;
        });
        if (newData.length) {
          cartItem.data = newData[0];
          cartItem.generateHtml();
        } else {
          cartItem.removeItem();
        }
      } else {
        cartItem.cart.data = data;
        cartItem.cart.updateTotal();
        cartItem.cart.hasProductsContainer.classList.add('hidden');
        cartItem.cart.noProductsContainer.classList.remove('hidden');
      }
      cartItem.cart.calculateOverflow();
      if (p80.updateCartCount) {
        p80.updateCartCount(data.item_count);
      }

      // Broadcast cart change for the free shipping bar
      const cartChange = new CustomEvent('cartChange', {
        detail: {
          cartTotal: data.total_price
        }
      });
      document.dispatchEvent(cartChange);
    })
    .catch((error) => {
      cartItem.enable();
      cartItem.cart.enable();
      console.error('Error fetching cart:', error);
    });
};

p80.ajaxCartItem.prototype.enable = function () {
  const cartItem = this;
  cartItem.isUpdating = false;
  cartItem.controls.classList.remove('disabled');
};

p80.ajaxCartItem.prototype.disable = function () {
  const cartItem = this;
  cartItem.isUpdating = true;
  cartItem.controls.classList.add('disabled');
};

p80.ajaxCartItem.prototype.removeItem = function () {
  const cartItem = this;
  const itemKey = cartItem.cart.products.findIndex((product) => {
    return product.data.variant_id === cartItem.data.variant_id;
  });
  if (itemKey >= 0) {
    cartItem.cart.products.splice(itemKey, 1);
    cartItem.html.remove();
  }
};
