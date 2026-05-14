if (typeof p80 === typeof undefined) {
  var p80 = {};
}
//
p80.productRecommendations = function (config) {
  /****
   *
   * USAGE:
   *
   * Update line 51 with your unique store front access token (if it is not initialized as part of our theme)
   *
   * const p80ProductRecommendations = new p80.productRecommendations(
   *  {
   *      resultsDisplayed: 4,
   *      targetElement: "your-target-identifier"
   *      title: "You may also like"
   *      productIds: 15442113|12521231|1231232131|552512512 OR [15442113,12521231,1231232131,552512512]
   *  }
   * );
   *
   * REFRESH LIVE:
   *
   * p80Productrecommendations.getRecommendations();
   *
   */

  /****
   *
   * CONFIGURATION
   *
   * {
   *      resultsDisplayed: int || 4,
   *      targetElement: string || "product-recommendations",
   *      title: string || "You may also like",
   *      productIds: array || string || '',
   * }
   *
   */

  this.config = {};
  // Maxmium number of recently viewed products displayed
  this.config.resultsDisplayed = config && config.resultsDisplayed ? config.resultsDisplayed : 4;
  // String that holds the title for our recently viewed product area
  (this.config.title = config && config.title ? config.title : ''),
    // The string identifier for the element we will look to append our markup to
    (this.config.targetElement =
      config && config.targetElement ? config.targetElement : 'product-recommendations-wrapper');
  // The product IDs in our recommendation metafield
  this.config.productIds = config && config.productIds ? config.productIds : '';
  // Our unique store front access token
  this.config.storefrontToken = p80.storefrontToken || '';

  this.loader = document.getElementById('product-recommendations__loader');

  /****
   *
   * Data
   *
   */

  // Holds our product recommendations
  this.productRecommendations = null;
  // Holds our markup
  this.html = null;
  // Fetch our product recommendations and generate Results
  if (!this.config.productIds) {
    console.error('No product IDs passed');
    return;
  }
  this.getRecommendations();
};
// Get our product recommendations
p80.productRecommendations.prototype.getRecommendations = function () {
  let recommendations = this;
  // Display our loader
  if (recommendations.loader) {
    recommendations.loader.classList.add('visible');
  }
  let products = recommendations.config.productIds;
  // Check if we're using the shopify metafield or a custom metafield - split the products into an array if applicable when using a piped string
  if (typeof products !== 'object') {
    products = products.split('|');
  }

  // Generate our graphql query to get each products's information
  let productIds = '';
  for (let i = 0; i < products.length; i++) {
    productIds += `"gid://shopify/Product/${products[i]}",`;
  }
  const graphQuery = `
    {nodes(ids: [${productIds}]){
        ... on Product {
            id
            title
            onlineStoreUrl
            handle
            media(first: 1) {
                edges {
                    node {
                        mediaContentType
                        alt
                        ...on MediaImage {
                            image {
                                originalSrc
                                large: transformedSrc(maxWidth: 720)
                                small: transformedSrc(maxWidth: 360)
                            }
                        }
                    }
                }
            }
            priceRange {
              maxVariantPrice {
                amount
              }
              minVariantPrice {
                amount
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
              }
              maxVariantPrice {
                amount
              }
            }
          }
        }
    }`;

  // Make sure we have products - if not, don't bother making our call
  if (!productIds) {
    return;
  }

  fetch('/api/2021-10/graphql.json', {
    method: 'POST',
    headers: {
      'X-Shopify-Storefront-Access-Token': recommendations.config.storefrontToken,
      'Content-Type': 'application/graphql'
    },
    body: graphQuery
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.data) {
        recommendations.productRecommendations = data.data.nodes;
        // Filter out null returns
        recommendations.productRecommendations = recommendations.productRecommendations.filter(
          function (el) {
            return el != null;
          }
        );
        recommendations.generate();
      }
    })
    .catch((error) => {
      console.error(error);
    });
};
// Generate our markup
p80.productRecommendations.prototype.generate = function () {
  const recommendations = this;
  let ulItems = document.createDocumentFragment();

  // Loop through our recommendations products
  for (var i = 0; i < recommendations.productRecommendations.length; i++) {

    // create item wrapper elements
    const liElem = document.createElement('li');
    liElem.classList.add('grid__item','slider__slide');
    liElem.setAttribute('id','Slide-template__product-recommendations-'+i);

    const cardWrapperElem = document.createElement('div');
    cardWrapperElem.classList.add('card-wrapper','product-card-wrapper','underline-links-hover');

    const cardElem = document.createElement('div');
    cardElem.classList.add('card','card--standard','card--media');

    // Create our image wrappers
    const cardInnerElem = document.createElement('div');
    cardInnerElem.classList.add('card__inner','color-background-2','gradient','ratio');

    const cardMediaElem = document.createElement('div');
    cardMediaElem.classList.add('card__media');

    const mediaElem = document.createElement('div');
    mediaElem.classList.add('media','media--transparent','media--hover-effect');

    // Create our product image if it exists
    let productImage;
    if (recommendations.productRecommendations[i].media.edges.length > 0) {
      productImage = document.createElement('img');
      const imageUrls = recommendations.productRecommendations[i].media.edges[0].node.image;
      let srcSet = '';
      let imageSizes = '';
      let originalSrc = '';
      for (const url in imageUrls) {
        if (url === 'small') {
          srcSet += `${imageUrls[url]} 360w,`;
          imageSizes += '(max-width: 767px) 360px, ';
        } else if (url === 'large') {
          srcSet += `${imageUrls[url]} 720w,`;
          imageSizes += '(min-width: 768px) 720px, ';
        } else if (url === 'originalSrc') {
          originalSrc = imageUrls[url];
        }
      }
      productImage.setAttribute('loading', 'lazy');
      productImage.setAttribute('srcset', srcSet);
      productImage.setAttribute('sizes', imageSizes);
      productImage.src = originalSrc;
      productImage.alt = recommendations.productRecommendations[i].title;
      productImage.classList.add('motion-reduce');
    } else {
      productImage = document.createElement('div');
      productImage.classList.add('motion-reduce--placeholder');
    }

    // Append the image to our wrappers
    mediaElem.appendChild(productImage);
    cardMediaElem.appendChild(mediaElem);
    cardInnerElem.appendChild(cardMediaElem);

    // Create our content wrappers
    const cardContentElem = document.createElement('div');
    cardContentElem.classList.add('card__content');

    // Card product name
    const cardInfoElem = document.createElement('div');
    cardInfoElem.classList.add('card__information');

    const cardHeadingElem = document.createElement('h3');
    cardHeadingElem.classList.add('card__heading');

    const productLink = document.createElement('a');
    productLink.setAttribute('title', recommendations.productRecommendations[i].title);
    productLink.href = `/products/${recommendations.productRecommendations[i].handle}`;
    productLink.classList.add('full-unstyled-link');
    productLink.textContent = recommendations.productRecommendations[i].title;

    // Card price and swatches
    const cardInfoInnerElem = document.createElement('div');
    cardInfoInnerElem.classList.add('card-information');

    const priceSwatchesElem = document.createElement('div');
    priceSwatchesElem.classList.add('price-swatches-wrapper');

    const priceElem = document.createElement('div');
    priceElem.classList.add('price');

    const priceContainerElem = document.createElement('div');
    priceContainerElem.classList.add('price__container');

    const priceRegSaleElem = document.createElement('div');
    const priceItemElem = document.createElement('span');
    priceItemElem.classList.add('price-item');

    let price = recommendations.productRecommendations[i].priceRange.maxVariantPrice.amount;
    let compareAtPrice = recommendations.productRecommendations[i].compareAtPriceRange.maxVariantPrice.amount;
    if (price) {
      price = parseFloat(price).toFixed(2);
    }
    if (compareAtPrice) {
      compareAtPrice = parseFloat(compareAtPrice).toFixed(2);
    }

    // Display single price display
    if (compareAtPrice < 1) {
      priceRegSaleElem.classList.add('price__regular');
      priceItemElem.classList.add('price-item--regular');
      priceItemElem.textContent = `$ ${price}`;
      priceRegSaleElem.appendChild(priceItemElem);
      priceContainerElem.appendChild(priceRegSaleElem);
    }
    // Product has two different prices - show price range
    else {
      priceElem.classList.add('price--on-sale');
      priceRegSaleElem.classList.add('price__sale');
      priceItemElem.classList.add('price-item--sale','price-item--last');
      priceItemElem.textContent = `$ ${price}`;

      const salePriceItemElem = document.createElement('span');
      const strikeThruElem = document.createElement('s');
      strikeThruElem.classList.add('price-item','price-item--regular');
      strikeThruElem.textContent = `$ ${compareAtPrice}`;

      salePriceItemElem.appendChild(strikeThruElem);
      priceRegSaleElem.appendChild(priceItemElem);
      priceRegSaleElem.appendChild(salePriceItemElem);
      priceContainerElem.appendChild(priceRegSaleElem);
    }

    priceElem.appendChild(priceContainerElem);
    priceSwatchesElem.appendChild(priceElem);
    cardInfoInnerElem.appendChild(priceSwatchesElem);


    // Append the contents to our wrappers
    cardHeadingElem.appendChild(productLink);
    cardInfoElem.appendChild(cardHeadingElem);
    cardInfoElem.appendChild(cardInfoInnerElem);
    cardContentElem.appendChild(cardInfoElem);


    // Append the contents and media to main wrappers
    cardElem.appendChild(cardInnerElem);
    cardElem.appendChild(cardContentElem);
    cardWrapperElem.appendChild(cardElem);
    liElem.appendChild(cardWrapperElem);

    // Append item to ulItems array
    ulItems.appendChild(liElem);
  }

  // Assign our markup to our object
  recommendations.html = ulItems;

  recommendations.appendMarkup();
};
// Add our markup to the page
p80.productRecommendations.prototype.appendMarkup = function () {
  const recommendations = this;
  const target = this.findTargetElement();
  if (target) {
    // hide our loader
    if (recommendations.loader) {
      recommendations.loader.classList.remove('visible');
    }
    target.innerHTML = '';
    target.appendChild(this.html);
    // re-init slider-component
    target.parentNode.initPages();
  } else {
    console.error(`Unable to find the element identified by ${this.targetElement}`);
  }
};
// Helper function to find our target element for appending markup
p80.productRecommendations.prototype.findTargetElement = function () {
  /****
   *
   * Target Finding priority:
   *
   * ID
   * Class - Taking first result
   * Data Attributes - Taking first result
   *
   */

  // Find by ID
  let target = document.getElementById(this.config.targetElement);
  // Find by Class
  if (!target) {
    target = document.getElementsByClassName(this.config.targetElement);
    if (target) {
      target = target[0];
    }
  }
  // Find by Attribute
  if (!target) {
    target = document.querySelector(`[${this.config.targetElement}]`);
  }

  // Return our target if found
  return target ? target : null;
};
