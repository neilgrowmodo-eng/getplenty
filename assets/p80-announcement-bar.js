class AnnouncementBar extends HTMLElement {
  constructor() {
    super();
    // Holds how long we remain on each slide for
    this.slideDuration = this.getAttribute('data-slide-duration')
      ? this.getAttribute('data-slide-duration')
      : 10000;
    // Holds our transition duration which will dynamically append CSS
    this.transitionDuration = this.getAttribute('data-transition-duration')
      ? this.getAttribute('data-transition-duration')
      : 500;
    // Holds our current slide index
    this.currentSlide = 0;
    // Holds our previous slide index
    this.previousSlide = null;
    // Holds all our slides
    this.slides = this.querySelectorAll('.announcement-bar');
    // Holds how many announcement slides we have in total
    this.totalSlides = this.slides.length ? this.slides.length : 0;
    // Holds our interval for the slides
    this.interval = null;
    // Arrows
    this.arrows = document.querySelectorAll('.announcement-bar__arrow');

    // No point intializing our rotation if we have one or less slides
    if (this.totalSlides <= 1) return;

    // initialize announcement bar on ready
    addEventListener('DOMContentLoaded', () => {
      this.initSlider();
    });

    // re-initialize on window resize
    addEventListener('resize', () => {
      this.initSlider();
    });

    // next/previous buttons
    if (this.arrows.length == 0) return;
    this.arrows.forEach((button) => {
      button.addEventListener('click', this.onArrowClick.bind(this));
    });
  }

  initSlider() {
    // if viewport width is below 990, run the slider
    if (window.innerWidth < 990)
      this.createInterval();
    // else don't
    else
      this.clearInterval();
  }

  clearInterval() {
    if (this.interval == null) return;
    clearInterval(this.interval);
  }

  createInterval() {
    if (this.interval != null)
      clearInterval(this.interval);
    this.interval = setInterval(this.autoPlay.bind(this), this.slideDuration);
  }

  autoPlay() {
    this.previousSlide = this.currentSlide;
    // Reset our slide index when we reach the end
    if (this.currentSlide === this.totalSlides - 1) {
      this.currentSlide = 0;
    }
    // Otherwise increment
    else {
      this.currentSlide += 1;
    }

    // Animate out our current slide
    this.slides[this.previousSlide].classList.add('announcement-bar--animate-out');

    const announcementBar = this;

    setTimeout(function () {
      // Hide our current slide and reset classes
      announcementBar.slides[announcementBar.previousSlide].classList.add(
        'announcement-bar--hidden'
      );
      announcementBar.slides[announcementBar.previousSlide].classList.remove(
        'announcement-bar--animate-out'
      );
      // Show our next slide
      announcementBar.slides[announcementBar.currentSlide].classList.remove(
        'announcement-bar--hidden'
      );
      announcementBar.slides[announcementBar.currentSlide].classList.add(
        'announcement-bar--animate-in'
      );

      // Reset the classes on our slides after the animation duration
      setTimeout(function () {
        announcementBar.slides[announcementBar.previousSlide].classList.remove(
          'announcement-bar--visible'
        );
        announcementBar.slides[announcementBar.currentSlide].classList.add(
          'announcement-bar--visible'
        );
        announcementBar.slides[announcementBar.currentSlide].classList.remove(
          'announcement-bar--animate-in'
        );
      }, announcementBar.transitionDuration);
    }, announcementBar.transitionDuration);
  }

  onArrowClick(e) {
    if (!e) return;
    const action = e.currentTarget.getAttribute('name');
    const announcementBar = this;
    let currentSlide = this.currentSlide;
    let scrollToSlide = 0;
    // check if prev or next button is clicke
    if (action == 'prev')
      scrollToSlide = (currentSlide > 0) ? (currentSlide - 1) : (this.totalSlides - 1);
    else
      scrollToSlide = (currentSlide == (this.totalSlides - 1)) ? 0 : (currentSlide + 1);
    // update the values of previousSlide and currentSlide values
    this.previousSlide = currentSlide;
    this.currentSlide = scrollToSlide;
    // Hide our current slide and reset classes
    announcementBar.slides[currentSlide].classList.add(
      'announcement-bar--hidden'
    );
    announcementBar.slides[currentSlide].classList.remove(
      'announcement-bar--animate-out'
    );
    // Show the target slide
    announcementBar.slides[scrollToSlide].classList.remove(
      'announcement-bar--hidden'
    );
    announcementBar.slides[scrollToSlide].classList.add(
      'announcement-bar--visible'
    );
  }
}

customElements.define('announcement-bar', AnnouncementBar);
