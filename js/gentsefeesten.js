var GentseFeesten = new function() {
	//
	// API
	//

	/*
		Static data members
	*/
	
	var cbEventError, cbEventSuccess
	
	var cbLocationSuccess, cbLocationError

	/*
		day: what day to fetch data for (1 <= day <= 10)
		cbSuccess(data)
		cbError(reason)
	*/
	this.getEvents = function(day, cbSuccess, cbError) {
		cbEventError = cbError
		cbEventSuccess = cbSuccess
	
		if (day < 0 || day > 10)
			cbEventError("invalid day requested")
	
		if (! Modernizr.localstorage) {
			cbEventError("no localstorage accessible")
			return
		}
	
		// Manage current day
		var cachedData = $.parseJSON(localStorage.getItem("day_" + day))
		if (cachedData == null) {
			$.ajax({
				url: 'js/data/day_' + day + '.json',
				async:	false,
				dataType: 'json',
				success: function(data) {
					// TODO: QUOTA_EXCEEDED, remove previous days?
					localStorage.setItem("day_" + day, JSON.stringify(data));
					cbEventSuccess(data)
				}
			});
		} else {
			cbEventSuccess(cachedData)
		}
	}

	/*
		cbSuccess(latitude, longitude, accuracy)
		cbError(error string)
		cached: indicates whether a cached entry can be used (default: true)
	*/
	this.getLocation = function(cbSuccess, cbError, cached) {
		cbLocationError = cbError
		cbLocationSuccess = cbSuccess
	
		if (typeof cached === "undefined")
			cached = true
		var age = 0
		if (cached)
			age = 600000
	
		// Check if we have geolocation capabilities
		if (! Modernizr.geolocation) {
			cbError("No HTML5 geolocation available")
			return
		}
	
		// Fetch a psition
		navigator.geolocation.getCurrentPosition(
			onLocationSuccess,
			onLocationError,
			{
				// TODO: do not use cached entries on a forced refresh
				maximumAge:	cached,	// Maximum 10 minutes old
				timeout:	30000	// Time-out after 30 seconds
			}
		);
	}

	/*
		data: list of events, JSON result of getEvents
		latitude
		longitude
		radius: in kilometers
	*/
	this.filterEvents = function(data, latitude, longitude, radius, hour) {
		// Filter on distance
		data = $.grep(data, function(event){
			event.location.distance = distance(latitude, event.location.latitude, longitude, event.location.longitude)
			return (event.location.distance <= radius);
		});
		data.sort(function(a, b) {
			return (a.location.distance - b.location.distance);
		});
	
		// Filter on hour
		var starthour, stophour
		data = $.grep(data, function(event){
			starthour = event.schedule.start.substr(0, 2)
			stophour = event.schedule.stop.substr(0, 2)
			return (starthour >= hour || stophour >= hour)
		});
	
		// Partition into hours
		var dataPartitions = Array()
		for (var i = 0; i < 24-hour+1; i++)
			dataPartitions.push(Array())
		$.each(data, function(index, event) {
			starthour = event.schedule.start.substr(0, 2)
			if (starthour >= hour)
				dataPartitions[starthour-hour+1].push(event)
			else
				dataPartitions[0].push(event)
		});
	
		return dataPartitions
	}


	//
	// Event handlers
	//

	var onLocationSuccess = function(position) {
		var latitude = position.coords.latitude;
		var longitude = position.coords.longitude;
	
		cbLocationSuccess(
			position.coords.latitude,
			position.coords.longitude,
			position.coords.accuracy
		)
	}

	var onLocationError = function(error) {
		switch(error.code) {
			case error.TIMEOUT:
				cbLocationError("time-out")
				break;
			default:
				cbLocationError("unknown error")
		};
	}


	//
	// Auxiliary
	//

	var distance = function(lat1, lat2, lon1, lon2){
		var R = 6371; // km
		var dLat = (lat2-lat1)*Math.PI/180;//radians
		var dLon = (lon2-lon1)*Math.PI/180;
		var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2); 
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		return R * c;
	}	
};
