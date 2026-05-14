if (typeof p80 === typeof undefined) {
  var p80 = {};
}

p80.getGeoLocation = function (config) {
  /****
   *
   * CONFIG
   *
   * {
   *      url: "string"  // optional parameter to override the Google Cloud URL which we fetch our location data from
   * }
   *
   */

  this.config = {};
  // Holds our URL for google cloud
  this.config.url =
    config && config.url
      ? config.url
      : 'https://us-central1-p80-utils.cloudfunctions.net/geolocation';

  /****
   *
   * DATA RETURN
   *
   * {
   *    city: "toronto",
   *    cityLatLong: "12.123456,-12.123456",
   *    country: "CA",
   *    region: "on",
   *    userIP: "x.x.x.x",
   * }
   *
   */

  return fetch(this.config.url)
    .then((response) => response.json())
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error(error);
      return null;
    });
};
