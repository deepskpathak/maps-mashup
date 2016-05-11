/*
 * ------------------- GLOBALS -------------------
 */
var app = {
        total: 0
    },
    defaultPosition = new google.maps.LatLng(17.3667, 78.4667),
    mapOptions = {
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        center: defaultPosition,
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
        }
    },
    styles = [{
        stylers: [{
            hue: "#00ffe6"
        }, {
            saturation: -20
        }]
    }, {
        featureType: "road",
        elementType: "geometry",
        stylers: [{
            lightness: 100
        }, {
            visibility: "simplified"
        }]
    }, {
        featureType: "road",
        elementType: "labels",
        stylers: [{
            visibility: "off"
        }]
    }],
    map, circle, placesService, markersArray = [],
    routesArray = [],
    infowindow = new google.maps.InfoWindow();
var directionsService = new google.maps.DirectionsService();
var directionsDisplay = new google.maps.DirectionsRenderer();

/*
 * ------------------- GEOLOCATION HANDLER -------------------
 */
/* This part of the code handles the Geocode for client to provide its geolocation
* 'success' and 'failure' callbacks handle specific scenarios. In case of Client denying geolocation, it is presented with a form to input a location.
* */

// Success when a data is recieved through Geolocation API
// A home location is created through Geocoding.
var success = function(data) {
    var position = new google.maps.LatLng(data.coords.latitude, data.coords.longitude),
        niceAddress = "Your location",
        geocoder = new google.maps.Geocoder();
        geocoder.geocode({
            'latLng': position
        }, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    if (results[0]) {
                    niceAddress = results[0].formatted_address;    // format address in human-readable way
                }
            }
        map.setCenter(position);

        var origin_marker = new google.maps.Marker({
            map: map,
            draggable: true,
            animation: google.maps.Animation.DROP,
            position: position,
            icon: "img/home1.png"
        });
        google.maps.event.addListener(origin_marker, 'click', function() {
            var originwindow = new google.maps.InfoWindow({
                map: map,
                position: position,
                content: niceAddress
            });
            var infowindow = new google.maps.InfoWindow(originwindow);
        });
    });
    //map.setCenter(position);
    app.home = position;
};

// When clients fails to provide data through Geolocation, user is prompted to enter an address to locate.
var failure = function(error) {
    var formResponse = function(e) {
        var geocoder = new google.maps.Geocoder(),
            position = defaultPosition,
            niceAddress = "Sorry We Couldn't Find Your Location";
        geocoder.geocode({
            'address': document.getElementById("location").value
        },

        function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                if (results[0]) {
                    niceAddress = results[0].formatted_address;
                    position = new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng())
                }
            }
            map.setCenter(position);
            var origin_marker = new google.maps.Marker({
                map: map,
                draggable: true,
                animation: google.maps.Animation.DROP,
                position: position,
                icon: "img/home1.png"
            });
            google.maps.event.addListener(origin_marker, 'click', function() {
                var options = {
                    map: map,
                    position: position,
                    content: niceAddress
                };
                var infowindow = new google.maps.InfoWindow(options);
            });
            document.getElementById("geocode").style.display = "none";
            $('#formContainer').show();
            app.home = position;
            //app.destination = 'NIFT, Hyderabad';
            //calcRoute();
        });
        return false;
    };
    // Creation of a Fallback form on the DOM
    var fallback = document.createElement("form");
    fallback.id = "geocode";
    fallback.setAttribute("class", "form-inline");
    // Messages according to the error recieved
    if (error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                fallback.innerHTML += "<p>You chose not share geolocation data. <p>Please, use the form below.</p> </p>";
                break;

            case error.POSITION_UNAVAILABLE:
                fallback.innerHTML += "<p>Sorry, we couldn't determine your location. Please, use the form below. </p>";
                break;

            case error.TIMEOUT:
                fallback.innerHTML += "<p>Sorry, the location request time out. Please, use the form below. </p>";
                break;

            default:
                fallback.innerHTML += "<p>Sorry, there was an error. Please use the form below. </p>";
                break;
        }
    }
    fallback.innerHTML += "<div class='form-group'>";
    fallback.innerHTML += "<label for='location'>Enter Your Location </label>";
    fallback.innerHTML += "<input type='text' id='location' required/>";
    fallback.innerHTML += "<button type='submit' class='btn btn-sm btn-success'/><i class='glyphicon glyphicon-map-marker'></i></button>";
    fallback.innerHTML += "</div>";
    fallback.onsubmit = formResponse;
    document.getElementById("formContainer").appendChild(fallback);
    app.autocomplete(); // call autocomplete, just in case geolocation fails, it should be available.
    //origin = document.getElementById("location").value;
};

// The function to handle the Geolocation request
app.findGeocode = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, failure, {
            timeout: 5000  // After this, failure with timeout error will trigger
        });
    } else {
        failure();
    }
    return true;
};



/*
* ------------------- UTILITY FUNCTIONS -------------------
*/

/*This handles the checkbox at the top. Just a demo on how we can search specific point of interest*/
app.config = function() {
    app.types = [];
    $('input[type="checkbox"]').click(function() {
        var item = $(this).attr('value');
        if (app.types.indexOf(item) == -1) app.types.push(item);
        else {
            app.types.pop(item);
        }
    });
};


// Toggle directions Panel
app.togglePanel = function() {
    var panel = document.getElementById('directionsPanel');
    var anchor = document.getElementById('showPanel');
    if (panel.style.display == 'block') {
        panel.style.display = 'none';
        anchor.innerHTML = 'Show Directions';
        // close the directions panel on a ESC key
    } else {
        panel.style.display = 'block';
        anchor.innerHTML = 'Hide Directions';
    }
};


// Clear all the overlays
app.clearOverlays = function() {
    for (var i = 0; i < markersArray.length; i++) {
        markersArray[i].setMap(null);
    }
    markersArray.length = 0;
};


// Clear a route mark when another destination is selected
app.clearRoutes = function(directionsDisplay) {
    for (var i = 0; i < routesArray.length; i++) {
        directionsDisplay.setMap(null);
    }
    routesArray.length = 0;
};

// Autocomplete for a fallback form
app.autocomplete = function () {
    var options = {componentRestrictions: {country: 'us'}};
    // Using a Closure so that this function can work with changes only in 'option' variable.
    function googleAutoFill() {
        var input = document.getElementById("location");
        new google.maps.places.Autocomplete(input, options);
    }
    return googleAutoFill();
};

// Reset the page
app.resetAll = function () {
    // just a simple reload. Tried to re-initialize canvas element on click but couldn't do it.
    window.location.reload();
};
/*
 * ------------------- APP FUNCTIONS -------------------
 * These functions do the actual tasks in the application - drawing, dragging, and resizing a circle on the map and call the places API.
 */


// Draw a circle on the MAP when clicked somehere
app.drawCircle = function(position) {
    google.maps.event.clearInstanceListeners(map);
    var populationOptions = {
        strokeColor: '#008cba',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#008cba',
        fillOpacity: 0.35,
        draggable: true,
        editable: true,
        map: map,
        center: position,
        radius: 5000
    };
    var place;
    placesService = new google.maps.places.PlacesService(map);
    circle = new google.maps.Circle(populationOptions);
    app.markPlaces(circle);
    //return circle;
};

// Mark the places
app.markPlaces = function(circle) {
    var circleBounds = circle.getBounds();
    var radius = circle.getRadius() - 1500;
    var request = {
        location: circle.getCenter(),
        radius: radius,
        types: app.types
    };
    placesService.nearbySearch(request, placesCallback);

    function placesCallback(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length; i++) {
                place = results[i];
                if (circleBounds.contains(place.geometry.location)) {
                    createMarker(results[i]);
                }
            }
        }
    }
// Create the information popoover - NOT USED in this application
    function createInfoWindow(place) {
        var placeLoc = place.geometry.location;
        var placeName = place.name.toUpperCase();
        var placeType = place.types[0];
        var placeAddress = place.formatted_address ? place.formatted_address : '';
        var placeNumber = place.formatted_phone_number ? place.formatted_phone_number : '';
        var placeRating = place.rating ? place.rating : 'Not Rated Yet';
        var placeReview = place.review_summary ? place.review_summary : 'No Reviews';
        var placeOpeningHours = place.opening_hours ? place.opening_hours.open_now : 'No Info';
        var placeOpen = placeOpeningHours ? 'Open Right Now!' : 'Not Open';
        var placePhotos = place.photos ? place.photos[0].getUrl() : 'img/home1.png';
        return placeData = "<div><span>"+placeName+"</span><br><span>"+placeRating+"</span><br><span>"+placeReview+"</span><br><span>"+placeOpen+"</span></div>"
    }

// Specific Markers depending on type of the place
    function createMarker(place) {
        var placeLoc = place.geometry.location;
        var placeType = place.types[0];
        if (placeType == 'hospital') {
            icon = 'img/firstaid.png';
        } else if (placeType == 'restaurant') {
            icon = 'img/restaurant.png';
        } else if (placeType == 'bar') {
            icon = 'img/winebar.png';
        } else if (placeType == 'meal_takeaway') {
            icon = 'img/takeaway.png';
        } else if (placeType == 'store') {
            icon = 'img/supermarket.png';
        } else {
            icon = 'img/icon.png';
        }

        var marker = new google.maps.Marker({
            map: map,
            //draggable:true,
            animation: google.maps.Animation.DROP,
            position: placeLoc,
            content: place.name,
            icon: icon
            //icon: photos[0].getUrl({'maxWidth': 55, 'maxHeight': 55})
        });
        markersArray.push(marker);
        google.maps.event.addListener(marker, 'click', function() {
            infowindow.setContent(this.content);
            infowindow.open(map, this);
            directionsDisplay.setMap(null);
            app.getDirections(this);
        });
    }
    google.maps.event.addListener(circle, 'dragend', function() {
        app.circleDragged(circle);
    });
    google.maps.event.addListener(circle, 'radius_changed', function() {
        app.circleResized(circle);
    });
};

// Circle drag handler

app.circleDragged = function(circle) {
    var dragCircle = circle;
    app.clearOverlays();
    app.markPlaces(circle);
};


// Circle resize handler
app.circleResized = function(circle) {
    var editCircle = circle;
    app.clearOverlays();
    app.markPlaces(circle);
};

// Get the directions to show on panel

app.getDirections = function(marker, count) {
    var start = app.home;
    var end = marker.getPosition();
    var request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING
    };
    directionsDisplay.setMap(map);
    if (directionsDisplay != null) {
        directionsDisplay.setDirections({
            routes: []
        });
    }
    directionsDisplay.setPanel(document.getElementById('directionsPanel'));
    directionsDisplay.setOptions({
        suppressMarkers: true
    });
    directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            document.getElementById('directionsPanel').innerHTML = "";
            directionsDisplay.setDirections(response);
            app.computeTotalDistance(response);
        }
    });
};

// Distance calculator

app.computeTotalDistance = function(result) {
    var total = app.totalDistance = 0;
    var myroute = result.routes[0];
    for (i = 0; i < myroute.legs.length; i++) {
        total += myroute.legs[i].distance.value;
    }
    total = total / 1000;
    app.totalDistance = total;
    //document.getElementById("total").innerHTML = total + " km";
};


// Initialize the Application. Important handlers.

app.initialize = function() {
    app.config();
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    app.findGeocode();
    styledMap = new google.maps.StyledMapType(styles, {
        name: "Styled Map"
    });
    map.mapTypes.set('map_style', styledMap);
    map.setMapTypeId('map_style');
    defaultPosition = map.getCenter();
    // Event handler to draw the circle - rest of circle functions like drag and resize are called implicitly.
    google.maps.event.addListener(map, 'click', function(e) {
        app.drawCircle(e.latLng);
    });
    // show-hide directions panel
    $('#showPanel').click(function() {
        app.togglePanel();
    });
    // reset the Map
    $('#resetMap').click(function(){
        app.resetAll();
    });
};
// Get started when all is set.
window.onload = app.initialize; 