if (!customElements.get('store-redirect')) {
  customElements.define(
    'store-redirect',
    class StoreRedirect extends HTMLElement {
      constructor() {
        super();
        this.data = this.querySelector("script[type='application/json']");
        if (!this.data) return;
        this.data = this.data.textContent;
        this.data = JSON.parse(this.data);
        // Our geo location endpoint which returns user locations
        this.geoLocationServiceUrl = this.data.geoLocationServiceUrl;

        // Blanket international redirect data
        this.redirectInternational = this.data.redirectInternational;
        this.redirectInternationalCode = this.data.redirectInternationalCode;
        this.redirectInternationalUrl = this.data.redirectInternationalUrl;
        this.redirectInternationalMessage = this.data.redirectInternationalMessage;
        this.redirectInternationalConfirmationText =
          this.data.redirectInternationalConfirmationText;
        this.redirectInternationalDeclineText = this.data.redirectInternationalDeclineText;

        // Specific location redirect data
        this.locations = this.data.locations;

        // Cookie we save data to
        this.cookieName = 'p80Redirect';

        // Bot information
        this.botPattern =
          '(googlebot/|Googlebot-Mobile|Googlebot-Image|Google favicon|Mediapartners-Google|bingbot|slurp|java|wget|curl|Commons-HttpClient|Python-urllib|libwww|httpunit|nutch|phpcrawl|msnbot|jyxobot|FAST-WebCrawler|FAST Enterprise Crawler|biglotron|teoma|convera|seekbot|gigablast|exabot|ngbot|ia_archiver|GingerCrawler|webmon |httrack|webcrawler|grub.org|UsineNouvelleCrawler|antibot|netresearchserver|speedy|fluffy|bibnum.bnf|findlink|msrbot|panscient|yacybot|AISearchBot|IOI|ips-agent|tagoobot|MJ12bot|dotbot|woriobot|yanga|buzzbot|mlbot|yandexbot|purebot|Linguee Bot|Voyager|CyberPatrol|voilabot|baiduspider|citeseerxbot|spbot|twengabot|postrank|turnitinbot|scribdbot|page2rss|sitebot|linkdex|Adidxbot|blekkobot|ezooms|dotbot|Mail.RU_Bot|discobot|heritrix|findthatfile|europarchive.org|NerdByNature.Bot|sistrix crawler|ahrefsbot|Aboundex|domaincrawler|wbsearchbot|summify|ccbot|edisterbot|seznambot|ec2linkfinder|gslfbot|aihitbot|intelium_bot|facebookexternalhit|yeti|RetrevoPageAnalyzer|lb-spider|sogou|lssbot|careerbot|wotbox|wocbot|ichiro|DuckDuckBot|lssrocketcrawler|drupact|webcompanycrawler|acoonbot|openindexspider|gnam gnam spider|web-archive-net.com.bot|backlinkcrawler|coccoc|integromedb|content crawler spider|toplistbot|seokicks-robot|it2media-domain-crawler|ip-web-crawler.com|siteexplorer.info|elisabot|proximic|changedetection|blexbot|arabot|WeSEE:Search|niki-bot|CrystalSemanticsBot|rogerbot|360Spider|psbot|InterfaxScanBot|Lipperhey SEO Service|CC Metadata Scaper|g00g1e.net|GrapeshotCrawler|urlappendbot|brainobot|fr-crawler|binlar|SimpleCrawler|Livelapbot|Twitterbot|cXensebot|smtbot|bnf.fr_bot|A6-Indexer|ADmantX|Facebot|Twitterbot|OrangeBot|memorybot|AdvBot|MegaIndex|SemanticScholarBot|ltx71|nerdybot|xovibot|BUbiNG|Qwantify|archive.org_bot|Applebot|TweetmemeBot|crawler4j|findxbot|SemrushBot|yoozBot|lipperhey|y!j-asr|Domain Re-Animator Bot|AddThis)';
        this.botPattern = new RegExp(this.botPattern, 'i');
        this.userAgent = navigator.userAgent;

        // Current page URL
        this.currentUrl = window.location.href;

        // The final URL we will redirect to
        this.destination = null;

        this.message = this.querySelector('[data-redirect-message]');
        this.acceptButton = this.querySelector('[data-redirect-accept]');
        this.declineButton = this.querySelector('[data-redirect-decline]');

        if (
          !this.message ||
          !this.acceptButton ||
          !this.declineButton ||
          !this.geoLocationServiceUrl
        )
          return;

        if (!this.redirectInternational && !this.locations.length) return;

        this.init();
      }

      init() {
        // We are on the account page
        // Or admin page
        // Or we believe the user is a bot
        // Disable the redirect prompt but do not set the cookie
        if (
          this.currentUrl.indexOf('account') !== -1 ||
          this.currentUrl.indexOf('admin') !== -1 ||
          this.botPattern.test(this.userAgent)
        ) {
          return;
        }
        // The user has been redirected to another domain by this plugin - disable on the new domain and exit
        else if (this.currentUrl.indexOf('noredirect') !== -1) {
          this.disable();
          return;
        }
        // Our cookie is disabled - don't proceed
        else if (this.getCookieData() === 'disable') {
          return;
        }

        this.bind();

        // All checks passed, lets find the user's location
        this.getLocation().then((locationData) => {
          if (!locationData || !locationData.country) return;
          this.locationData = locationData;
          this.determineRedirect();
        });
      }

      getLocation() {
        return fetch(this.geoLocationServiceUrl)
          .then((response) => response.json())
          .then((response) => {
            return response;
          })
          .catch((error) => {
            console.error(error);
            return null;
          });
      }

      determineRedirect() {
        // Redirect all international users who do not match the specified code to a specific store
        if (this.redirectInternational) {
          if (this.locationData.country !== this.redirectInternationalCode) {
            this.destination = this.redirectInternationalUrl;
            const data = {
              message: this.redirectInternationalMessage,
              confirmation: this.redirectInternationalConfirmationText,
              decline: this.redirectInternationalDeclineText
            };
            this.generateHTML(data);
            this.show();
          }
        }
        // Redirect specific country codes to specific stores
        else {
          const matchingLocation = this.locations.find((location) => {
            return location.code === this.locationData.country;
          });
          if (!matchingLocation) return;
          this.destination = matchingLocation.redirectUrl;
          const data = {
            message: matchingLocation.redirectMessage,
            confirmation: matchingLocation.redirectConfirmationText,
            decline: matchingLocation.redirectDeclineText
          };
          this.generateHTML(data);
          this.show();
        }
      }

      generateHTML(data) {
        if (!data) return;
        this.acceptButton.textContent = data.confirmation;
        this.declineButton.textContent = data.decline;
        this.message.innerHTML = data.message;
      }

      show() {
        this.classList.add('store-redirect--visible');
      }

      hide() {
        this.classList.remove('store-redirect--visible');
      }

      bind() {
        const redirect = this;
        // User has accepted the redirect prompt
        this.acceptButton.addEventListener('click', function () {
          // Disable our redirect cookie before we redirect - we don't want to show another prompt when the user reloads
          redirect.disable();
          redirect.redirect();
        });
        // User has denied the redirect prompt, set our cookie and close the prompt
        this.declineButton.addEventListener('click', function () {
          redirect.disable();
          redirect.hide();
        });
      }

      redirect() {
        if (!this.destination) {
          console.error('No redirect URL specified.');
          return;
        }
        window.location.replace(`${this.destination}?noredirect=true`);
      }

      getCookieData() {
        const cookies = document.cookie;
        let cookie = cookies.match(new RegExp('(^| )' + this.cookieName + '=([^;]+)'));

        if (!cookie || cookie.length < 2) {
          return null;
        }

        cookie = cookie[2];
        return cookie;
      }

      disable() {
        document.cookie = `${this.cookieName}=disable; expires=${new Date(
          new Date().getTime() + 1000 * 60 * 60 * 24 * 365
        ).toGMTString()}; path=/`;
      }
    }
  );
}
