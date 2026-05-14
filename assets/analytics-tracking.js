/**
 * Server-Side Analytics Tracking System
 * Uses Shopify.analytics.publish for custom events and forwards to GTM Server-Side
 */

(function() {
  'use strict';

  // Check if Shopify analytics API is available
  if (typeof Shopify === 'undefined' || typeof Shopify.analytics === 'undefined' || typeof Shopify.analytics.publish !== 'function') {
    console.warn('Shopify analytics API not available');
    return;
  }

  // Configuration - can be overridden via window.analyticsConfig
  const config = {
    gtmServerSideUrl: window.analyticsConfig?.gtmServerSideUrl || '',
    gtmContainerId: window.analyticsConfig?.gtmContainerId || '',
    enableDebugMode: window.analyticsConfig?.enableDebugMode || false,
    enableShopifyEvents: window.analyticsConfig?.enableShopifyEvents !== false, // Default true
    enableServerSideForwarding: window.analyticsConfig?.enableServerSideForwarding !== false // Default true
  };

  /**
   * Debug logging utility
   */
  function debugLog(...args) {
    if (config.enableDebugMode) {
      console.log('[Analytics Tracking]', ...args);
    }
  }

  /**
   * Get current page context
   */
  function getPageContext() {
    return {
      url: window.location.href,
      path: window.location.pathname,
      search: window.location.search,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language || navigator.userLanguage
    };
  }

  /**
   * Get cart data
   */
  function getCartData() {
    return fetch('/cart.js')
      .then(response => response.json())
      .catch(error => {
        debugLog('Error fetching cart:', error);
        return null;
      });
  }

  /**
   * Format product data for analytics
   */
  function formatProductData(product) {
    if (!product) return null;

    return {
      product_id: product.id?.toString() || '',
      product_handle: product.handle || '',
      product_title: product.title || '',
      product_type: product.type || '',
      product_vendor: product.vendor || '',
      product_price: product.price ? (product.price / 100).toFixed(2) : '0.00',
      product_compare_at_price: product.compare_at_price ? (product.compare_at_price / 100).toFixed(2) : null,
      product_available: product.available || false,
      variant_id: product.variants?.[0]?.id?.toString() || '',
      variant_title: product.variants?.[0]?.title || '',
      variant_price: product.variants?.[0]?.price ? (product.variants?.[0]?.price / 100).toFixed(2) : '0.00',
      currency: window.Shopify?.currency?.active || 'USD',
      tags: product.tags || []
    };
  }

  /**
   * Format cart item data for analytics
   */
  function formatCartItemData(item) {
    if (!item) return null;

    return {
      item_id: item.product_id?.toString() || '',
      item_variant_id: item.variant_id?.toString() || '',
      item_name: item.product_title || item.title || '',
      item_variant: item.variant_title || '',
      item_price: item.price ? (item.price / 100).toFixed(2) : '0.00',
      item_quantity: item.quantity || 0,
      item_total: item.final_line_price ? (item.final_line_price / 100).toFixed(2) : '0.00'
    };
  }

  /**
   * Send event to GTM Server-Side
   */
  function sendToGTMServerSide(eventName, eventData) {
    if (!config.enableServerSideForwarding || !config.gtmServerSideUrl) {
      debugLog('GTM Server-Side forwarding disabled or URL not configured');
      return;
    }

    const payload = {
      event_name: eventName,
      event_data: eventData,
      page_context: getPageContext(),
      timestamp: new Date().toISOString()
    };

    // Use sendBeacon for better reliability (doesn't block page navigation)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(config.gtmServerSideUrl, blob);
      debugLog('Event sent via sendBeacon:', eventName, payload);
    } else {
      // Fallback to fetch
      fetch(config.gtmServerSideUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(error => {
        debugLog('Error sending event to GTM Server-Side:', error);
      });
      debugLog('Event sent via fetch:', eventName, payload);
    }
  }

  /**
   * Publish event to Shopify Analytics and forward to GTM Server-Side
   */
  function trackEvent(eventName, eventData) {
    const fullEventData = {
      ...eventData,
      page_context: getPageContext()
    };

    // Publish to Shopify Analytics (custom event)
    if (config.enableShopifyEvents) {
      try {
        Shopify.analytics.publish('plenty:' + eventName, fullEventData);
        debugLog('Published to Shopify Analytics:', eventName, fullEventData);
      } catch (error) {
        debugLog('Error publishing to Shopify Analytics:', error);
      }
    }

    // Forward to GTM Server-Side
    sendToGTMServerSide(eventName, fullEventData);
  }

  /**
   * Track page view
   */
  function trackPageView() {
    const pageData = {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_type: window.Shopify?.theme?.template || '',
      shop_domain: window.Shopify?.shop || ''
    };

    trackEvent('page_view', pageData);
  }

  /**
   * Track product view
   */
  function trackProductView(product) {
    if (!product) return;

    const productData = formatProductData(product);
    trackEvent('product_view', {
      ...productData,
      ecommerce: {
        currency: productData.currency,
        value: productData.product_price,
        items: [{
          item_id: productData.product_id,
          item_name: productData.product_title,
          item_variant_id: productData.variant_id,
          price: productData.product_price,
          quantity: 1
        }]
      }
    });
  }

  /**
   * Track add to cart
   */
  function trackAddToCart(variantId, quantity, product) {
    getCartData().then(cart => {
      const itemData = {
        variant_id: variantId?.toString() || '',
        quantity: quantity || 1
      };

      if (product) {
        const productData = formatProductData(product);
        itemData.product_id = productData.product_id;
        itemData.product_title = productData.product_title;
        itemData.variant_title = productData.variant_title;
        itemData.price = productData.variant_price;
      }

      const eventData = {
        ...itemData,
        cart_value: cart?.total_price ? (cart.total_price / 100).toFixed(2) : '0.00',
        cart_quantity: cart?.item_count || 0,
        currency: cart?.currency || window.Shopify?.currency?.active || 'USD',
        ecommerce: {
          currency: cart?.currency || window.Shopify?.currency?.active || 'USD',
          value: cart?.total_price ? (cart.total_price / 100).toFixed(2) : '0.00',
          items: cart?.items?.map(formatCartItemData).filter(Boolean) || []
        }
      };

      trackEvent('add_to_cart', eventData);
    });
  }

  /**
   * Track remove from cart
   */
  function trackRemoveFromCart(variantId) {
    getCartData().then(cart => {
      const removedItem = cart?.items?.find(item => item.variant_id === variantId);
      
      const eventData = {
        variant_id: variantId?.toString() || '',
        cart_value: cart?.total_price ? (cart.total_price / 100).toFixed(2) : '0.00',
        cart_quantity: cart?.item_count || 0,
        currency: cart?.currency || window.Shopify?.currency?.active || 'USD',
        ecommerce: {
          currency: cart?.currency || window.Shopify?.currency?.active || 'USD',
          value: cart?.total_price ? (cart.total_price / 100).toFixed(2) : '0.00',
          items: cart?.items?.map(formatCartItemData).filter(Boolean) || []
        }
      };

      if (removedItem) {
        eventData.product_id = removedItem.product_id?.toString() || '';
        eventData.product_title = removedItem.product_title || removedItem.title || '';
        eventData.variant_title = removedItem.variant_title || '';
      }

      trackEvent('remove_from_cart', eventData);
    });
  }

  /**
   * Track cart view
   */
  function trackCartView() {
    getCartData().then(cart => {
      const eventData = {
        cart_value: cart?.total_price ? (cart.total_price / 100).toFixed(2) : '0.00',
        cart_quantity: cart?.item_count || 0,
        currency: cart?.currency || window.Shopify?.currency?.active || 'USD',
        ecommerce: {
          currency: cart?.currency || window.Shopify?.currency?.active || 'USD',
          value: cart?.total_price ? (cart.total_price / 100).toFixed(2) : '0.00',
          items: cart?.items?.map(formatCartItemData).filter(Boolean) || []
        }
      };

      trackEvent('cart_view', eventData);
    });
  }

  /**
   * Track begin checkout
   */
  function trackBeginCheckout() {
    getCartData().then(cart => {
      const eventData = {
        cart_value: cart?.total_price ? (cart.total_price / 100).toFixed(2) : '0.00',
        cart_quantity: cart?.item_count || 0,
        currency: cart?.currency || window.Shopify?.currency?.active || 'USD',
        ecommerce: {
          currency: cart?.currency || window.Shopify?.currency?.active || 'USD',
          value: cart?.total_price ? (cart.total_price / 100).toFixed(2) : '0.00',
          items: cart?.items?.map(formatCartItemData).filter(Boolean) || []
        }
      };

      trackEvent('begin_checkout', eventData);
    });
  }

  /**
   * Initialize tracking
   */
  function initTracking() {
    debugLog('Initializing analytics tracking...');

    // Track initial page view
    trackPageView();

    // Listen for cart updates
    document.addEventListener('cart:updated', function() {
      trackCartView();
    });

    // Listen for checkout start
    const checkoutButtons = document.querySelectorAll('[href*="/checkout"], form[action*="/checkout"]');
    checkoutButtons.forEach(button => {
      button.addEventListener('click', function() {
        trackBeginCheckout();
      });
    });

    // Expose tracking functions globally
    window.plentyAnalytics = {
      trackEvent: trackEvent,
      trackPageView: trackPageView,
      trackProductView: trackProductView,
      trackAddToCart: trackAddToCart,
      trackRemoveFromCart: trackRemoveFromCart,
      trackCartView: trackCartView,
      trackBeginCheckout: trackBeginCheckout,
      config: config
    };

    debugLog('Analytics tracking initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracking);
  } else {
    initTracking();
  }

})();
