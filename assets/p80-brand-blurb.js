document.addEventListener('DOMContentLoaded', injectBlurb);

function injectBlurb() {
  if (typeof brandBlurb === typeof undefined) return;
  if (!document.querySelector('.collection-hero__text-wrapper')) return;
  const heroTextWrapper = document.querySelector('.collection-hero__text-wrapper');
  const blurbWrapper = document.createElement('div');
  blurbWrapper.classList.add('collection-hero__text');
  blurbWrapper.classList.add('rte');
  blurbWrapper.innerHTML = brandBlurb;
  heroTextWrapper.appendChild(blurbWrapper);
}
