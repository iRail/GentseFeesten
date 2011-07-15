/*
 gentse_feesten.js
 gentse_feesten

 Created by Sjimi on 2011-07-12.
 Copyright 2011 Sjimi. All rights reserved.
 */

/*
 * HTML5 Storage functionality.
 */

/*
 * Check wether HTML5 Storage is supported.
 */
function supportsHTML5Storage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}

/*
 * Store a value in HTML5 Local Storage and escape it.
 */
function setValue(key, value) {
	localStorage[key] = escape(value);
}

/*
 * Get a value from HTML5 Local Storage and escape it.
 */
function getValue(key) {
	return localStorage[key];
}

/*
 * Store a value in HTML5 Session Storage and escape it.
 * WARNING: Not escaped.
 */
function setSessionValue(key, value) {
	sessionStorage[key] = value;
}

/*
 * Get a value from HTML5 Session Storage and escape it.
 */
function getSessionValue(key) {
	return sessionStorage[key];
}

/*
 * HTML5 Geolocation.
 */

function performGeolocation() {
	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition( function(position) {
			/*
			 * Store the position in HTML5 Session Storage.
			 */
			setSessionValue('location', position.coords.latitude + ';' + position.coords.longitude);
		},
		/*
		 * Error callback.
		 */ function(error) {
			switch(error.code) {
				case error.TIMEOUT:
					setSessionValue('geolocationError', 'Timeout');
					break;
				case error.POSITION_UNAVAILABLE:
					setSessionValue('geolocationError', 'Position unavailable');
					break;
				case error.PERMISSION_DENIED:
					setSessionValue('geolocationError', 'Permission denied');
					break;
				case error.UNKNOWN_ERROR:
					setSessionValue('geolocationError', 'Unknown error');
					break;
			}
		});
	} else {
		setSessionValue('geolocationError', 'Unknown error');
	}
}