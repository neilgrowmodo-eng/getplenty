function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute(
      'aria-expanded',
      !event.currentTarget.closest('details').hasAttribute('open')
    );
  });

  if (summary.closest('header-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN'
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage(
      '{"event":"command","func":"' + 'pauseVideo' + '","args":""}',
      '*'
    );
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', {bubbles: true});

    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: `application/${type}`}
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  }
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onCloseButtonClick.bind(this))
    );
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);
      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);
  }

  onFocusOut(event) {
    setTimeout(() => {
      if (
        this.mainDetailsToggle.hasAttribute('open') &&
        !this.mainDetailsToggle.contains(document.activeElement)
      )
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(
            detailsElement.closest('details[open]'),
            detailsElement.querySelector('summary')
          );
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.getElementById('shopify-section-header');
    this.borderOffset =
      this.borderOffset ||
      this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom')
        ? 1
        : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
    );
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
  }
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      'click',
      this.hide.bind(this, false)
    );
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model'))
          this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(
        content.querySelector('video, model-viewer, iframe')
      );
      if (focus) deferredElement.focus();
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');
    this.slideCounterDots = this.querySelector('.slider-counter--dots');
    this.slideToScroll = null;
    this.isThumbSlider = this.slider.classList.contains('slider--tablet-up') ? true : false;

    if (this.hasAttribute('data-slide-to-scroll') && window.innerWidth > 990)
      this.slideToScroll = this.dataset.slideToScroll;

    if (this.slideCounterDots) {
      this.sliderFirstItemNode = this.slider.querySelector('.slider__slide');
      this.sliderControlLinksArray = Array.from(
        this.sliderControlWrapper.querySelectorAll('.slider-counter__link')
      );
      this.sliderControlLinksArray.forEach((link) =>
        link.addEventListener('click', this.linkToSlide.bind(this))
      );
    }

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));

    if (this.isThumbSlider) {
      this.prevButton.addEventListener('click', this.onButtonThumbClick.bind(this));
      this.nextButton.addEventListener('click', this.onButtonThumbClick.bind(this));
    } else {
      this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
      this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
    }
  }

  initPages() {
    // re define slider items after injecting products
    if (this.sliderItems.length < 1) this.sliderItems = this.querySelectorAll('[id^="Slide-"]');

    this.sliderItemsToShow = Array.from(this.sliderItems).filter(
      (element) => element.clientWidth > 0
    );
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset =
      this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    this.sliderItemOffsetY =
      this.sliderItemsToShow[1].offsetTop - this.sliderItemsToShow[0].offsetTop;
    if (this.slideToScroll) this.sliderItemOffset = this.sliderItemOffset * this.slideToScroll;
    // Avoid division by zero and ensure at least 1 slide per page
    if (!this.sliderItemOffset || this.sliderItemOffset === 0) {
      this.slidesPerPage = 1;
    } else {
      this.slidesPerPage = Math.max(
        1,
        Math.floor(
          (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset
        )
      );
    }
    this.totalPages = Math.max(1, this.sliderItemsToShow.length - this.slidesPerPage + 1);
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    const previousPage = this.currentPage;
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1]
          }
        })
      );
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }

    if (this.isThumbSlider) {
      if (this.slider.scrollTop > 0) {
        this.prevButton.removeAttribute('disabled');
      } else {
        this.prevButton.setAttribute('disabled', 'disabled');
      }

      if (this.slider.scrollTop == this.slider.scrollHeight - this.slider.offsetHeight) {
        this.nextButton.setAttribute('disabled', 'disabled');
      } else {
        this.nextButton.removeAttribute('disabled');
      }
    }

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return (
      element.offsetLeft + element.clientWidth <= lastVisibleSlide &&
      element.offsetLeft >= this.slider.scrollLeft
    );
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.slider.scrollLeft + step * this.sliderItemOffset
        : this.slider.scrollLeft - step * this.sliderItemOffset;
    this.slider.scrollTo({
      left: this.slideScrollPosition
    });
  }

  onButtonThumbClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    const slideScrollYPosition =
      event.currentTarget.name === 'next'
        ? this.slider.scrollTop + step * this.sliderItemOffsetY
        : this.slider.scrollTop - step * this.sliderItemOffsetY;
    this.slider.scrollTo({
      top: slideScrollYPosition
    });
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.sliderControlLinksArray = Array.from(
      this.sliderControlWrapper.querySelectorAll('.slider-counter__link')
    );
    this.sliderControlLinksArray.forEach((link) =>
      link.addEventListener('click', this.linkToSlide.bind(this))
    );
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
    this.autoplaySpeed = this.slider.dataset.speed * 1000;

    this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    this.play();
    this.autoplayButtonIsSetToPlay = true;
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) return;

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition =
        this.slider.scrollLeft +
        this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }
    this.slider.scrollTo({
      left: this.slideScrollPosition
    });
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    const focusedOnAutoplayButton =
      event.target === this.sliderAutoplayButton ||
      this.sliderAutoplayButton.contains(event.target);
    if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
    this.play();
  }

  focusInHandling(event) {
    const focusedOnAutoplayButton =
      event.target === this.sliderAutoplayButton ||
      this.sliderAutoplayButton.contains(event.target);
    if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
      this.play();
    } else if (this.autoplayButtonIsSetToPlay) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute(
        'aria-label',
        window.accessibilityStrings.playSlideshow
      );
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute(
        'aria-label',
        window.accessibilityStrings.pauseSlideshow
      );
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length
        ? 0
        : this.slider.scrollLeft + this.slider.querySelector('.slideshow__slide').clientWidth;
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }

  setSlideVisibility() {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
    this.complementaryId = this.hasAttribute('data-complementary')
      ? this.dataset.complementary
      : '';
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.updateOptionAvailability();
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.updateInventoryList();
    this.removeErrorMessage();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateOptionAvailability() {
    const variants = this.getVariantData();
    const selects = this.querySelectorAll('select');
    
    selects.forEach((select, optionIndex) => {
      const currentOptions = [...this.options];
      
      Array.from(select.options).forEach((option) => {
        currentOptions[optionIndex] = option.value;
        
        const isAvailable = variants.some((variant) => {
          return variant.available && 
                 variant.options.every((variantOption, index) => 
                   index === optionIndex || currentOptions[index] === variantOption
                 ) &&
                 variant.options[optionIndex] === option.value;
        });
        
        option.disabled = !isAvailable;
      });
    });
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(
      `[id^="MediaGallery-${this.dataset.section}"]`
    );
    mediaGalleries.forEach((mediaGallery) =>
      mediaGallery.setActiveMedia(
        `${this.dataset.section}-${this.currentVariant.featured_media.id}`,
        true
      )
    );

    const modalContent = document.querySelector(
      `#ProductModal-${this.dataset.section} .product-media-modal__content`
    );
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(
      `[data-media-id="${this.currentVariant.featured_media.id}"]`
    );
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    let productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    );

    if (this.complementaryId != '')
      productForms = document.querySelectorAll(`#product-form-${this.dataset.section}`);

    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    let productForm = section.querySelector('product-form');

    if (this.complementaryId != '')
      productForm = document
        .getElementById(`product-form-${this.dataset.section}-${this.complementaryId}`)
        .closest('.product-form');

    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    fetch(
      `${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${
        this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section
      }`
    )
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        let destination = document.getElementById(`price-${this.dataset.section}`);
        let source = html.getElementById(
          `price-${
            this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section
          }`
        );

        if (this.complementaryId != '') {
          destination = document.getElementById(
            `price-${this.dataset.section}-${this.complementaryId}`
          );
        }

        if (source && destination) destination.innerHTML = source.innerHTML;

        let price = document.getElementById(`price-${this.dataset.section}`);

        if (this.complementaryId != '')
          price = document.getElementById(`price-${this.dataset.section}-${this.complementaryId}`);

        if (price) price.classList.remove('visibility-hidden');
        this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    let productForm = document.getElementById(`product-form-${this.dataset.section}`);

    if (this.complementaryId != '')
      productForm = document.getElementById(
        `product-form-${this.dataset.section}-${this.complementaryId}`
      );

    if (!productForm) return;
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
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData =
      this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }

  updateInventoryList() {
    const inventoryList = document.querySelector('inventory-list');
    if (!inventoryList) return;
    inventoryList.fetchInventory(this.currentVariant.id);
  }
}

customElements.define('variant-selects', VariantSelects);

class UpsellVariantSelects extends VariantSelects {
  constructor() {
    super();
  }

  renderProductInfo() {
    fetch(`${this.dataset.url}?variant=${this.currentVariant.id}?view=upsell`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(
          `price-${
            this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section
          }`
        );
        if (source && destination) destination.innerHTML = source.innerHTML;

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('visibility-hidden');
        this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);
      });
  }
}
customElements.define('variant-selects-upsell', UpsellVariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }

  updateOptionAvailability() {
    const variants = this.getVariantData();
    const fieldsets = this.querySelectorAll('fieldset');
    
    fieldsets.forEach((fieldset, optionIndex) => {
      const currentOptions = [...this.options];
      const inputs = fieldset.querySelectorAll('input[type="radio"]');
      
      inputs.forEach((input) => {
        currentOptions[optionIndex] = input.value;
        
        const isAvailable = variants.some((variant) => {
          return variant.available && 
                 variant.options.every((variantOption, index) => 
                   index === optionIndex || currentOptions[index] === variantOption
                 ) &&
                 variant.options[optionIndex] === input.value;
        });
        
        input.disabled = !isAvailable;
        
        // Update label styling to reflect disabled state
        const label = fieldset.querySelector(`label[for="${input.id}"]`);
        if (label) {
          label.classList.toggle('disabled', !isAvailable);
        }
      });
    });
  }
}

customElements.define('variant-radios', VariantRadios);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }

          if (
            !this.querySelector('complementary-component') &&
            this.classList.contains('complementary-products')
          ) {
            this.remove();
          }

          if (html.querySelector('.grid__item')) {
            this.classList.add('product-recommendations--loaded');
          }
        })
        .catch((e) => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: '0px 0px 400px 0px'
    }).observe(this);
  }
}

customElements.define('product-recommendations', ProductRecommendations);

if (typeof p80 === typeof undefined) {
  var p80 = {};
}

p80.updateCartCount = (count) => {
  const icons = document.querySelectorAll('[data-cart-quantity]');
  if (!icons) return;
  for (var x = 0; x < icons.length; x++) {
    const countIcon = icons[x].querySelector('.cart-count-bubble');
    if ((count <= 0 && countIcon) || (!count && countIcon)) {
      countIcon.remove();
    } else if (count && countIcon) {
      const labels = countIcon.querySelectorAll('span');
      for (var y = 0; y < labels.length; y++) {
        labels[y].textContent = count;
      }
    } else if (count && !countIcon) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('cart-count-bubble');
      const aria = document.createElement('span');
      aria.setAttribute('aria-hidden', true);
      aria.innerText = count;
      const text = document.createElement('span');
      text.classList.add('visually-hidden');
      text.innerText = count;
      wrapper.appendChild(aria);
      wrapper.appendChild(text);
      icons[x].appendChild(wrapper);
    }
  }
};

class ShippingBar extends HTMLElement {
  constructor() {
    super();
    // The current shop currency
    this.currency = this.getAttribute('data-currency');
    // Free shipping threshold has not been met messaging
    this.freeShippingPending = this.querySelector('[data-free-shipping-pending]');
    // The current cart total within the pending messaging
    this.freeShippingPendingTotal = this.freeShippingPending
      ? this.freeShippingPending.querySelector('[data-amount]')
      : null;
    // Free shipping threshold has been met messaging
    this.freeShippingMet = this.querySelector('[data-free-shipping-met]');
    // The progress bar
    this.progress = this.querySelector('progress');
    // The free shipping threshold
    this.threshold = this.getAttribute('data-threshold');
    if (this.threshold) this.threshold = parseInt(this.threshold, 10);
    // The total price of the cart
    this.cartTotal = this.getAttribute('data-total');
    if (this.cartTotal) this.cartTotal = parseInt(this.cartTotal, 10);

    // Immediately generate markup if we have the available data via liquid
    this.updateShipping();

    // Listen to broadcasted cart change event for use in multiple scenarios
    document.addEventListener(
      'cartChange',
      (e) => {
        if (!e || !e.detail) return;
        this.cartTotal = typeof e.detail.cartTotal === typeof undefined ? 0 : e.detail.cartTotal;
        this.updateShipping();
      },
      false
    );
  }

  updateShipping() {
    if (!this.threshold) return;
    if (!this.cartTotal) {
      let defaultPrice = this.threshold;
      defaultPrice = defaultPrice / 100;
      defaultPrice = defaultPrice.toLocaleString('en-US', {
        style: 'currency',
        currency: this.currency
      });
      if (this.freeShippingPendingTotal) this.freeShippingPendingTotal.textContent = defaultPrice;
      if (this.progress) this.progress.setAttribute('value', 0);
      return;
    }
    // Display appropriate messaging
    if (this.cartTotal >= this.threshold) {
      if (this.freeShippingPending) this.freeShippingPending.classList.add('hidden');
      if (this.freeShippingMet) this.freeShippingMet.classList.remove('hidden');
    } else {
      if (this.freeShippingPending) this.freeShippingPending.classList.remove('hidden');
      if (this.freeShippingMet) this.freeShippingMet.classList.add('hidden');
    }
    // Update the progress bar
    if (this.progress) this.progress.setAttribute('value', this.cartTotal);
    // Update the threshold offset messaging
    if (this.freeShippingPendingTotal)
      this.freeShippingPendingTotal.textContent = this.formatThreshold();
  }

  formatThreshold() {
    if (!this.cartTotal || !this.currency) return;
    let price = this.threshold - this.cartTotal;
    if (price < 0) price = 0;
    price = price / 100;
    price = price.toLocaleString('en-US', {style: 'currency', currency: this.currency});
    return price;
  }
}

customElements.define('shipping-bar', ShippingBar);

/***
 *
 * Accordion Component
 *
 * Creates on-page animated accordions
 *
 * @param {boolean} (optional) data-disable-desktop
 *
 * This flag will disable the accordion functionality on desktop - allowing items to behave as if they were not in an accordion at desktop resolutions
 * When true the accordions will be expanded by default on desktop - and only become toggleable on mobile
 * Think menus in the footer of the website: we display them on desktop - however on mobile they collapse into an accordion
 *
 * @param {number} (optional) data-duration - holds our animation duration for the toggle. Defaults to 100.
 *
 */

class AccordionComponent extends HTMLElement {
  constructor() {
    super();

    // The toggle button
    this.toggle = this.querySelector('[data-toggle]');
    // The content body
    this.content = this.querySelector('[data-content]');
    // Other accordions within the same container
    this.siblings = this.parentElement.querySelectorAll('accordion-component');
    // For scenarios where we only want to display the accordion options on mobile
    // This will show the content by default on desktop and hide it on mobile, as well as make it non-interactable on desktop
    this.disableDesktop = this.hasAttribute('data-disable-desktop')
      ? this.getAttribute('data-disable-desktop')
      : false;
    // Holds our animation duration for timers
    this.duration = this.hasAttribute('data-duration')
      ? parseInt(this.getAttribute('data-duration'), 10)
      : 100;
    this.timer = null;
    // Holds our open/closed state
    this.expanded = false;

    if (!this.toggle || !this.content) return;

    this.initialize();
  }

  initialize() {
    this.toggle.addEventListener('click', this.toggleAccordion.bind(this));
    if (this.disableDesktop == 'true') {
      window.addEventListener(
        'resize',
        debounce((event) => {
          this.onResize();
        }, 300).bind(this)
      );
      // Open by default on desktop when desktop controls are disabled
      if (window.innerWidth > 749) {
        this.openAccordion();
      }
    }
    this.toggleFocusable();
  }

  onResize() {
    if (this.disableDesktop == 'true' && window.innerWidth < 750) {
      this.closeAccordion();
    }
    if (this.disableDesktop == 'true' && window.innerWidth > 749) {
      this.openAccordion();
    }
  }

  toggleAccordion() {
    clearTimeout(this.timer);
    if (this.disableDesktop == 'true' && window.innerWidth > 749) return;
    if (this.expanded) {
      this.closeAccordion();
    } else {
      this.closeSiblings();
      this.openAccordion();
    }
  }

  openAccordion() {
    const accordion = this;
    this.expanded = true;
    this.classList.add('accordion__item--open');
    this.toggle.setAttribute('aria-expanded', true);
    this.content.setAttribute('aria-hidden', false);
    // Add additional height to account for the padding applied to our content
    this.content.style.maxHeight = this.content.scrollHeight + 24 + 'px';
    // Reset the max-height parameter to initial to allow responsive scaling
    this.timer = setTimeout(() => {
      accordion.content.style.maxHeight = 'initial';
    }, accordion.duration);
    this.toggleFocusable();
  }

  closeAccordion() {
    this.expanded = false;
    // Reset the max-height parameter to our set max-height to begin the animation
    // If max-height is not set to an exact value the animation will not trigger
    this.content.style.maxHeight = this.content.scrollHeight + 24 + 'px';
    // Add timeout without a parameter to start a new thread
    // Alows the max-height reset above to process and avoids animation jank
    setTimeout(() => {
      this.classList.remove('accordion__item--open');
      this.toggle.setAttribute('aria-expanded', false);
      this.content.setAttribute('aria-hidden', true);
      this.content.style.maxHeight = null;
      this.toggleFocusable();
    });
  }

  toggleFocusable() {
    const focusable = getFocusableElements(this.content);
    if (this.expanded) {
      focusable.forEach((element) => {
        element.removeAttribute('tabindex');
      });
    } else {
      focusable.forEach((element) => {
        element.setAttribute('tabindex', '-1');
      });
    }
  }

  closeSiblings() {
    if (!this.siblings || !this.siblings.length) return;

    for (var x = 0; x < this.siblings.length; x++) {
      if (this.siblings[x] === this || this.siblings[x].expanded === false) continue;
      this.siblings[x].closeAccordion();
    }
  }
}

customElements.define('accordion-component', AccordionComponent);

// Tabs
class TabComponent extends HTMLElement {
  constructor() {
    super();
    this.tabFocus = 0;
    const tabs = this.querySelectorAll('[role="tab"]');
    const tabList = this.querySelector('[role="tablist"]');

    tabs.forEach((tab) => {
      tab.addEventListener('click', this.handleEvent.bind(this));
    });

    tabList.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  handleEvent(event) {
    event.preventDefault();
    const tab = event.target;
    const tabList = event.target.closest('ul');
    const container = tabList.parentNode;
    const tabPanel = container.querySelector(`#${tab.getAttribute('aria-controls')}`);

    tabList.querySelectorAll('[aria-selected="true"]').forEach((menu) => {
      menu.setAttribute('aria-selected', false);
    });
    container.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
      panel.style.display = 'none';
    });

    tab.setAttribute('aria-selected', true);
    tabPanel.style.display = 'block';
  }

  onKeyDown(event) {
    if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
      const tabs = event.target.closest('ul').children;

      tabs[this.tabFocus].querySelector('a').setAttribute('tabindex', -1);
      tabs[this.tabFocus].querySelector('a').setAttribute('aria-selected', false);

      if (event.code === 'ArrowRight') {
        this.tabFocus++;
        if (this.tabFocus >= tabs.length) {
          this.tabFocus = 0;
        }
      }

      if (event.code === 'ArrowLeft') {
        this.tabFocus--;
        if (this.tabFocus < 0) {
          this.tabFocus = tabs.length - 1;
        }
      }

      tabs[this.tabFocus].querySelector('a').setAttribute('tabindex', 0);
      tabs[this.tabFocus].querySelector('a').setAttribute('aria-selected', true);
      tabs[this.tabFocus].querySelector('a').focus();
      tabs[this.tabFocus].querySelector('a').click();
    }
  }
}

customElements.define('tab-component', TabComponent);

// Glide Carousel
class GlideCarousel extends HTMLElement {
  connectedCallback() {
    this.initialize();
  }

  initialize() {
    if (this.initialized || typeof Glide === 'undefined' || !this.firstElementChild) {
      return;
    }

    this.carouselEl = this.firstElementChild;
    this.prevArrow = this.carouselEl.querySelector('.slider-button--prev');
    this.nextArrow = this.carouselEl.querySelector('.slider-button--next');

    if (!this.prevArrow || !this.nextArrow) {
      return;
    }

    this.imageHeight = 0;
    this.glide = new Glide(this.carouselEl, {
      type: 'carousel',
      perView: 1,
      gap: 24,
      peek: {before: 160, after: 160},
      breakpoints: {
        1250: {
          peek: {before: 80, after: 80}
        },
        768: {
          peek: {before: 160, after: 160}
        },
        750: {
          gap: 15,
          peek: {before: 100, after: 100}
        }
      }
    });

    this.glide.on(['mount.after', 'resize'], this.adjustArrowHeight.bind(this));

    this.glide.mount();
    this.initialized = true;
  }

  adjustArrowHeight() {
    const media = this.carouselEl.querySelector('.card__media');

    if (!media) {
      return;
    }

    this.imageHeight = media.offsetHeight;
    this.prevArrow.style.cssText = `left: ${this.glide.settings.peek.before - 16}px; height: ${
      this.imageHeight
    }px;`;
    this.nextArrow.style.cssText = `right: ${this.glide.settings.peek.before - 16}px; height: ${
      this.imageHeight
    }px;`;
  }
}

customElements.define('glide-carousel', GlideCarousel);
