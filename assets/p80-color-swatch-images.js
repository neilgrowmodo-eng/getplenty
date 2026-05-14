class ColorSwatchImages {
  constructor() {
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.attachSwatchListeners();
      this.observeProductGrid();
    });
    
    document.addEventListener('shopify:section:load', () => {
      this.attachSwatchListeners();
    });

    document.addEventListener('cloud-search:products-updated', () => {
      setTimeout(() => this.attachSwatchListeners(), 100);
    });

    setTimeout(() => this.attachSwatchListeners(), 500);
    setTimeout(() => this.attachSwatchListeners(), 1000);
    setTimeout(() => this.attachSwatchListeners(), 2000);
    setTimeout(() => this.attachSwatchListeners(), 3000);
  }

  observeProductGrid() {
    const observer = new MutationObserver((mutations) => {
      const hasNewProducts = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          return node.nodeType === 1 && (
            node.classList?.contains('card-swatches') ||
            node.querySelector?.('.card-swatches') ||
            node.classList?.contains('product-card-wrapper') ||
            node.querySelector?.('.product-card-wrapper')
          );
        });
      });

      if (hasNewProducts) {
        setTimeout(() => this.attachSwatchListeners(), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
      const gridObserver = new MutationObserver(() => {
        setTimeout(() => this.attachSwatchListeners(), 100);
      });

      gridObserver.observe(productGrid, {
        childList: true,
        subtree: true
      });
    }
  }

  attachSwatchListeners() {
    const swatches = document.querySelectorAll('.swatch-clickable, button.swatch-item, .card-swatches button');
    
    if (swatches.length === 0) {
      return;
    }
    
    swatches.forEach(swatch => {
      if (!swatch.dataset.listenerAttached) {
        swatch.addEventListener('click', this.handleSwatchClick.bind(this));
        swatch.dataset.listenerAttached = 'true';
      }
    });
  }

  handleSwatchClick(event) {
    event.preventDefault();
    
    const swatch = event.currentTarget;
    const productId = swatch.closest('.card-swatches').dataset.productId;
    const variantImageUrl = swatch.dataset.variantImage;
    
    if (!productId || !variantImageUrl) {
      return;
    }

    this.updateProductImage(productId, variantImageUrl, swatch);
    this.updateActiveState(swatch);
  }

  updateProductImage(productId, newImageUrl, clickedSwatch) {
    const productCard = document.querySelector(`[data-product-id="${productId}"].product-card-image`);
    
    if (!productCard) {
      return;
    }

    productCard.classList.add('image-changing');
    
    // Create new srcset with different sizes for the new image
    const newSrcset = this.generateSrcset(newImageUrl);
    const displaySrc = this.getImageUrl(newImageUrl, 533);
    
    // Update image attributes
    productCard.src = displaySrc;
    productCard.srcset = newSrcset;
    
    // Remove transition class after animation completes
    setTimeout(() => {
      productCard.classList.remove('image-changing');
    }, 300);

    // Update alt text to reflect the color
    const colorName = clickedSwatch.dataset.color;
    const originalAlt = productCard.alt;
    const baseAlt = originalAlt.replace(/ - \w+( \w+)*$/, ''); // Remove existing color suffix
    productCard.alt = `${baseAlt} - ${colorName}`;
  }

  generateSrcset(baseImageUrl) {
    const widths = [165, 360, 533, 720, 940, 1066];
    const srcsetArray = [];
    
    widths.forEach(width => {
      const imageUrl = this.getImageUrl(baseImageUrl, width);
      srcsetArray.push(`${imageUrl} ${width}w`);
    });
    
    // Add the original size
    srcsetArray.push(`${baseImageUrl} ${this.getImageWidth(baseImageUrl)}w`);
    
    return srcsetArray.join(', ');
  }

  getImageUrl(baseUrl, width) {
    // Shopify image transformation URL pattern
    if (baseUrl.includes('?')) {
      return baseUrl.replace(/width=\d+/, `width=${width}`);
    } else {
      return baseUrl.includes('_') 
        ? baseUrl.replace(/(\.[^.]+)$/, `_${width}x$1`)
        : `${baseUrl}?width=${width}`;
    }
  }

  getImageWidth(imageUrl) {
    const widthMatch = imageUrl.match(/width=(\d+)/);
    return widthMatch ? widthMatch[1] : '533';
  }

  updateActiveState(clickedSwatch) {
    const swatchContainer = clickedSwatch.closest('.card-swatches');
    
    // Remove active class from all swatches in this product
    swatchContainer.querySelectorAll('.swatch-clickable').forEach(swatch => {
      swatch.classList.remove('swatch-active');
      swatch.style.transform = '';
    });
    
    // Add active class to clicked swatch
    clickedSwatch.classList.add('swatch-active');
    clickedSwatch.style.transform = 'scale(1.1)';
  }

  // Reset to original image when needed
  resetToOriginalImage(productId) {
    const productCard = document.querySelector(`[data-product-id="${productId}"].product-card-image`);
    const originalSrc = productCard?.dataset.originalSrc;
    
    if (productCard && originalSrc) {
      this.updateProductImageFromOriginal(productCard, originalSrc);
    }
  }

  updateProductImageFromOriginal(productCard, originalSrc) {
    productCard.classList.add('image-changing');
    
    const newSrcset = this.generateSrcset(originalSrc);
    productCard.src = this.getImageUrl(originalSrc, 533);
    productCard.srcset = newSrcset;
    
    setTimeout(() => {
      productCard.classList.remove('image-changing');
    }, 300);
  }
}

// Initialize the color swatch functionality
new ColorSwatchImages();
