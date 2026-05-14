// Store locator with customisations
// - custom marker
// - custom info window (using Info Bubble)
// - custom info window content (+ store hours)
// https://cdn.shopify.com/s/files/1/0250/6781/4964/files/Untitled-3-Recovered.png?11088
// var ICON = new google.maps.MarkerImage('https://cdn.shopify.com/s/files/1/0250/6781/4964/files/Untitled-3-Recovered.png?11088', null, null,
//     new google.maps.Point(14, 13));

function pinSymbol(color) {
    return {
        url: mapPin
    };
}

google.maps.event.addDomListener(window, "load", function () {
    var map = new google.maps.Map(document.getElementById("map-canvas"), {
        center: (window.innerWidth > 750) ? new google.maps.LatLng(48.87381015919818, -123.0403734496767) : new google.maps.LatLng(49.108272032644635, -122.94670092759013),
        zoom: (window.innerWidth > 750) ? 9 : 7.8,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
            {
                stylers: [
                    {
                        saturation: -200,
                    },
                ],
            },
        ],
    });

    var panelDiv = document.getElementById("panel");

    var data = new MedicareDataSource();

    var view = new storeLocator.View(map, data, {
        geolocation: true,
    });

    view.createMarker = function (store) {
        var markerOptions = {
            position: store.getLocation(),
            icon: pinSymbol(),
            title: store.getDetails().title,
        };
        return new google.maps.Marker(markerOptions);
    };

    var infoBubble = new InfoBubble();
    view.getInfoWindow = function (store) {
        if (!store) {
            return infoBubble;
        }

        var details = store.getDetails();

        var html = `<div class="store-item store-item-modal">
            <div class="title">${details.title}</div>
            <div class="address">${details.address}</div>
            <div class="phone">${details.phone}</div>
            <div class="hours">${details.hours}</div>
            <div class="page">${details.page}</div>
        </div>`;

        infoBubble.setContent($(html)[0]);
        return infoBubble;
    };

    new storeLocator.Panel(panelDiv, {
        view: view,
    });
});
