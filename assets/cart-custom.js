(function () {
  const CART_SELECTOR = '[data-rebuy-component="cart-items"]';
  const ITEM_SELECTOR = '.rebuy-cart__flyout-item';
  const PRICE_SELECTOR = '.rebuy-cart__flyout-item-price';
  const SALE_PRICE_SELECTOR = '.rebuy-money.sale';
  const COMPARE_PRICE_SELECTOR = '.rebuy-money.compare-at';

  const TITLE_SELECTOR = '.rebuy-cart__flyout-item-product-title';
  const VARIANT_TITLE_SELECTOR = '.rebuy-cart__flyout-item-variant-title';
  const ITEM_INFO_SELECTOR = '.rebuy-cart__flyout-item-info';

  const DISCOUNT_MESSAGE_SELECTOR = '.rebuy-cart__flyout-item-discount-message';
  const DISCOUNT_LINE_SELECTOR = '.rebuy-cart__flyout-item-discount-line';

  const BADGE_CLASS = 'custom-return-policy-badge';
  const BADGE_ATTR = 'data-custom-return-policy-badge';
  const CONTAINER_ATTR = 'data-custom-return-policy-container';
  const STATE_ATTR = 'data-custom-return-policy-state';
  const PRODUCT_TAGS_ATTR = 'data-product-tags';


  const FOOTER_SELECTOR = '[data-rebuy-cart-anchor="footer"]';
  const SUBTOTAL_FINAL_SELECTOR = '.rebuy-cart__flyout-subtotal-final-amount';
  const SUBTOTAL_COMPARE_SELECTOR = '.rebuy-cart__flyout-subtotal-compare-amount';

  const DISCOUNT_FORM_SELECTOR = '.rebuy-cart__discount-form, .cart-discount__form';
  const DISCOUNT_TAGS_SELECTOR = '.rebuy-cart__discount-tags';
  const DISCOUNT_TAG_TEXT_SELECTOR = '.rebuy-cart__discount-tag-text';

  const WELCOME_CODE_KEYWORD = 'WELCOME';

  let observer = null;
  let footerObserver = null;
  let processTimer = null;

  function logWarn(message, details) {
    if (window.console && typeof console.warn === 'function') {
      console.warn(message, details || {});
    }
  }

  function logError(message, details) {
    if (window.console && typeof console.error === 'function') {
      console.error(message, details || {});
    }
  }

  function extractDataMessage(element, attrName) {
    if (!element) return null;

    const attrValue = element.getAttribute(attrName);
    if (!attrValue) return null;

    try {
      // Unescape HTML entities
      const decoded = decodeHtmlEntities(attrValue);

      // Try to parse as JSON array
      const parsed = JSON.parse(decoded);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return String(parsed[0]).trim();
      }
    } catch (e) {
      // If parsing fails, return the raw value
      return String(attrValue).trim();
    }

    return null;
  }

  function decodeHtmlEntities(value) {
    if (!value) return '';

    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;

    return textarea.value;
  }

  function getProductTagsFromCartItem(cartItem) {
    if (!cartItem) return [];

    const rawTags = cartItem.getAttribute(PRODUCT_TAGS_ATTR) || '';

    if (!rawTags) return [];

    const decodedTags = decodeHtmlEntities(rawTags).trim();

    if (!decodedTags) return [];

    try {
      const parsed = JSON.parse(decodedTags);

      if (Array.isArray(parsed)) {
        return parsed
          .map(function (tag) {
            return String(tag).trim();
          })
          .filter(Boolean);
      }
    } catch (error) {
      // Not JSON. Continue with delimiter parsing.
    }

    return decodedTags
      .split(/[|,]/)
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);
  }

  function getFinalSaleFlagMessage(cartItem) {
    const tags = getProductTagsFromCartItem(cartItem);

    const finalSaleFlag = tags.find(function (tag) {
      const normalizedTag = tag.toLowerCase();

      return (
        normalizedTag.indexOf('flag:') === 0 &&
        normalizedTag.indexOf('final sale') !== -1
      );
    });

    if (!finalSaleFlag) return null;

    const flagParts = finalSaleFlag.split(':');

    if (!flagParts[1]) return null;

    return flagParts[1].trim();
  }

  function getStaticFinalSaleData(cartItem) {
    const metafieldMessage = extractDataMessage(cartItem, 'data-final-message');

    if (metafieldMessage) {
      return {
        message: metafieldMessage,
        percent: 100,
        source: 'metafield-final-sale'
      };
    }

    const flagMessage = getFinalSaleFlagMessage(cartItem);

    if (flagMessage) {
      return {
        message: flagMessage,
        percent: 100,
        source: 'flag-final-sale'
      };
    }

    return null;
  }

  function parseMoney(value) {
    if (!value) return null;

    const cleanedValue = value
      .replace(/[^0-9.,-]/g, '')
      .replace(/,/g, '');

    const numberValue = parseFloat(cleanedValue);

    return Number.isFinite(numberValue) ? numberValue : null;
  }

  function getMoneyValue(element) {
    if (!element) return null;
    return parseMoney(element.textContent || '');
  }

  function getDiscountData(salePrice, compareAtPrice, cartItem) {
    const discountPercent = getDiscountPercent(salePrice, compareAtPrice);
    if (discountPercent == null) return null;

    const message = getMessageForDiscountPercent(discountPercent, cartItem);
    if (!message) return null;

    return {
      message: message,
      percent: discountPercent
    };
  }

  function normalizeDiscountCode(value) {
    if (!value) return '';

    return value
      .toString()
      .trim()
      .toUpperCase();
  }

  function getNormalizedText(value) {
    return normalizeDiscountCode(value || '');
  }

  function getAppliedDiscountCodes() {
    const container = document.querySelector(DISCOUNT_TAGS_SELECTOR);
    if (!container) return [];

    return Array.from(container.querySelectorAll(DISCOUNT_TAG_TEXT_SELECTOR))
      .map(function (tag) {
        return normalizeDiscountCode(tag.textContent || '');
      })
      .filter(Boolean);
  }

  function hasAppliedDiscountCode() {
    return getAppliedDiscountCodes().length > 0;
  }

  function hasWelcomeDiscountCode() {
    return getAppliedDiscountCodes().some(function (code) {
      return code.includes(WELCOME_CODE_KEYWORD);
    });
  }

  function getDiscountPercent(salePrice, compareAtPrice) {
    if (salePrice == null || compareAtPrice == null) return null;
    if (compareAtPrice <= 0) return null;
    if (compareAtPrice <= salePrice) return null;

    return ((compareAtPrice - salePrice) / compareAtPrice) * 100;
  }

  function getMessageForDiscountPercent(discountPercent) {
    if (discountPercent >= 50) {
      return 'Final Sale';
    }

    if (discountPercent >= 10 && discountPercent < 50) {
      return 'Store credit only';
    }

    return null;
  }

  function getNativeLineDiscountTexts(cartItem) {
    if (!cartItem) return [];

    return Array.from(cartItem.querySelectorAll(DISCOUNT_LINE_SELECTOR))
      .map(function (element) {
        return normalizeDiscountCode(element.textContent || '');
      })
      .filter(function (text) {
        if (!text) return false;

        /*
          Do not let welcome codes trigger return-policy messaging.
          Welcome discounts should not convert regular items into Store credit only.
        */
        if (text.includes(WELCOME_CODE_KEYWORD)) return false;

        return true;
      });
  }

  function getNativeLineDiscountFallbackData(cartItem) {
    const lineDiscountTexts = getNativeLineDiscountTexts(cartItem);

    if (!lineDiscountTexts.length) return null;

    return {
      message: 'Store credit only',
      percent: 10,
      source: 'native-rebuy-line-discount',
      discountLines: lineDiscountTexts
    };
  }

  function getExistingBadge(cartItem) {
    return cartItem.querySelector(`[${BADGE_ATTR}="true"]`);
  }

  function createBadge(message) {
    const badge = document.createElement('div');

    badge.className = BADGE_CLASS;
    badge.setAttribute(BADGE_ATTR, 'true');
    badge.textContent = message;

    return badge;
  }

  function getOrCreateDiscountMessageContainer(cartItem) {
    let discountMessage = cartItem.querySelector(DISCOUNT_MESSAGE_SELECTOR);

    if (discountMessage) {
      return discountMessage;
    }

    const itemInfo = cartItem.querySelector(ITEM_INFO_SELECTOR);

    if (!itemInfo) return null;

    discountMessage = document.createElement('div');
    discountMessage.className = 'rebuy-cart__flyout-item-discount-message';
    discountMessage.setAttribute(CONTAINER_ATTR, 'true');

    const variantTitle = cartItem.querySelector(VARIANT_TITLE_SELECTOR);
    const productTitle = cartItem.querySelector(TITLE_SELECTOR);
    const removeButton = cartItem.querySelector('.rebuy-cart__flyout-item-remove');

    if (variantTitle) {
      variantTitle.insertAdjacentElement('afterend', discountMessage);
      return discountMessage;
    }

    if (productTitle) {
      productTitle.insertAdjacentElement('afterend', discountMessage);
      return discountMessage;
    }

    if (removeButton) {
      removeButton.insertAdjacentElement('beforebegin', discountMessage);
      return discountMessage;
    }

    itemInfo.insertBefore(discountMessage, itemInfo.firstChild);

    return discountMessage;
  }

  function placeBadge(cartItem, badge) {
    const discountMessage = getOrCreateDiscountMessageContainer(cartItem);

    if (!discountMessage) return;

    const discountLine = discountMessage.querySelector(DISCOUNT_LINE_SELECTOR);

    if (discountLine) {
      if (discountLine.nextElementSibling !== badge) {
        discountLine.insertAdjacentElement('afterend', badge);
      }

      return;
    }

    if (badge.parentElement !== discountMessage) {
      discountMessage.appendChild(badge);
    }
  }

  function removeCustomContainerIfEmpty(cartItem) {
    const customContainer = cartItem.querySelector(`[${CONTAINER_ATTR}="true"]`);

    if (!customContainer) return;

    const hasBadge = customContainer.querySelector(`[${BADGE_ATTR}="true"]`);
    const hasDiscountLine = customContainer.querySelector(DISCOUNT_LINE_SELECTOR);
    const hasText = customContainer.textContent.trim().length > 0;

    if (!hasBadge && !hasDiscountLine && !hasText) {
      customContainer.remove();
    }
  }

  function setBadge(cartItem, discountData) {
    const existingBadge = getExistingBadge(cartItem);

    if (!discountData) {
      if (existingBadge) {
        existingBadge.remove();
      }

      cartItem.removeAttribute(STATE_ATTR);
      removeCustomContainerIfEmpty(cartItem);
      return;
    }

    const roundedPercent = Math.round(discountData.percent * 100) / 100;
    const nextState = `${discountData.message}|${roundedPercent}`;
    const currentState = cartItem.getAttribute(STATE_ATTR);

    if (existingBadge) {
      const currentText = existingBadge.textContent.trim();
      const discountMessage = cartItem.querySelector(DISCOUNT_MESSAGE_SELECTOR);
      const isPlacedCorrectly = discountMessage && discountMessage.contains(existingBadge);

      if (
        currentState === nextState &&
        currentText === discountData.message &&
        isPlacedCorrectly
      ) {
        return;
      }

      cartItem.setAttribute(STATE_ATTR, nextState);
      existingBadge.textContent = discountData.message;
      existingBadge.setAttribute('data-discount-percent', String(roundedPercent));
      placeBadge(cartItem, existingBadge);
      return;
    }

    cartItem.setAttribute(STATE_ATTR, nextState);

    const badge = createBadge(discountData.message);
    badge.setAttribute('data-discount-percent', String(roundedPercent));

    placeBadge(cartItem, badge);
  }

  function processCartItem(cartItem) {
    try {
      const staticFinalSaleData = getStaticFinalSaleData(cartItem);

      if (staticFinalSaleData) {
        logWarn('Static final sale message applied before discount logic', {
          source: staticFinalSaleData.source,
          message: staticFinalSaleData.message,
          cartItem
        });

        setBadge(cartItem, staticFinalSaleData);
        return;
      }

      const saleElement = cartItem.querySelector(SALE_PRICE_SELECTOR);
      const compareAtElement = cartItem.querySelector(COMPARE_PRICE_SELECTOR);

      const salePrice = getMoneyValue(saleElement);
      const compareAtPrice = getMoneyValue(compareAtElement);

      const lineItemDiscountData = getDiscountData(salePrice, compareAtPrice, cartItem);
      const nativeLineDiscountFallbackData = getNativeLineDiscountFallbackData(cartItem);

      const discountData = lineItemDiscountData || nativeLineDiscountFallbackData;

      if (nativeLineDiscountFallbackData && !lineItemDiscountData) {
        logWarn('Native Rebuy line-level discount fallback applied', {
          discountLines: nativeLineDiscountFallbackData.discountLines,
          message: nativeLineDiscountFallbackData.message,
          cartItem
        });
      }

      setBadge(cartItem, discountData);
    } catch (error) {
      logError('Failed while processing cart item', {
        error,
        cartItem
      });
    }
  }

  function processCartItems() {
    const cart = document.querySelector(CART_SELECTOR);

    if (!cart) return;

    const cartItems = cart.querySelectorAll(ITEM_SELECTOR);

    cartItems.forEach(function (cartItem) {
      processCartItem(cartItem);
    });
  }

  function isOurCustomNode(node) {
    if (!node) return false;

    if (node.nodeType === Node.TEXT_NODE) {
      return Boolean(
        node.parentElement &&
        node.parentElement.closest(
          `[${BADGE_ATTR}="true"], [${CONTAINER_ATTR}="true"]`
        )
      );
    }

    if (!(node instanceof Element)) return false;

    /*
      Important:
      Do NOT use node.querySelector(...) here.

      If we use querySelector, a normal Rebuy cart item or cart wrapper
      that merely contains our badge will be treated as a custom node.
      That causes real Rebuy mutations to be ignored after the first badge exists.
    */
    return Boolean(
      node.matches(`[${BADGE_ATTR}="true"], [${CONTAINER_ATTR}="true"]`) ||
      node.closest(`[${BADGE_ATTR}="true"], [${CONTAINER_ATTR}="true"]`)
    );
  }

  function isCustomMutation(mutation) {
    const addedNodes = Array.from(mutation.addedNodes || []);
    const removedNodes = Array.from(mutation.removedNodes || []);
    const changedNodes = addedNodes.concat(removedNodes);

    /*
      Only ignore mutations that happen directly inside our own badge/container
      and do not include real Rebuy nodes.
    */
    if (isOurCustomNode(mutation.target) && !changedNodes.length) {
      return true;
    }

    if (!changedNodes.length) return false;

    return changedNodes.every(function (node) {
      return isOurCustomNode(node);
    });
  }

  function scheduleProcessCartItems() {
    clearTimeout(processTimer);

    /*
      First pass catches immediate Rebuy DOM updates.
      Later passes catch price/compare-at updates that Rebuy may render slightly after
      the cart item itself is inserted.
    */
    processTimer = setTimeout(function () {
      processCartItems();

      setTimeout(processCartItems, 250);
      setTimeout(processCartItems, 600);
      setTimeout(processCartItems, 1200);
    }, 100);
  }


  function initDiscountCodeListener() {
    document.addEventListener('submit', function (event) {
      const form = event.target.closest(DISCOUNT_FORM_SELECTOR);

      if (!form) return;

      setTimeout(scheduleProcessCartItems, 300);
      setTimeout(scheduleProcessCartItems, 900);
      setTimeout(scheduleProcessCartItems, 1500);
    }, true);
  }

  function handleCartMutation(mutations) {
    const onlyCustomMutations = mutations.every(isCustomMutation);

    if (onlyCustomMutations) {
      return;
    }

    scheduleProcessCartItems();
  }

  function initObserver() {
    const cart = document.querySelector(CART_SELECTOR);

    if (!cart) {
      setTimeout(initObserver, 300);
      return;
    }

    if (observer) {
      observer.disconnect();
    }

    if (footerObserver) {
      footerObserver.disconnect();
    }

    observer = new MutationObserver(handleCartMutation);

    observer.observe(cart, {
      childList: true,
      subtree: true,
      characterData: true
    });

    const discountTags = document.querySelector(DISCOUNT_TAGS_SELECTOR);
    if (discountTags) {
      observer.observe(discountTags, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    const footer = document.querySelector(FOOTER_SELECTOR);

    if (footer) {
      footerObserver = new MutationObserver(handleCartMutation);

      footerObserver.observe(footer, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    processCartItems();

    setTimeout(processCartItems, 300);
    setTimeout(processCartItems, 800);
  }

  function init() {
    initDiscountCodeListener();
    initObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();