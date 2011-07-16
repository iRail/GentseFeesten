var GentseFeesten = new function() {
	//
	// API
	//

	/*
		day: what day to fetch data for (1 <= day <= 10)
		cbSuccess(data)
		cbError(reason)
	*/
	this.getEvents = function(day, cbSuccess, cbError) {	
		if (day < 0 || day > 10)
			cbError("invalid day requested")
	
		if (! Modernizr.localstorage) {
			cbError("no localstorage accessible")
			return
		}
	
		// Manage current day
		var cachedData = $.parseJSON(localStorage.getItem("day_" + day));
		if (cachedData == null) {
			$.ajax({
				url: 'js/data/day_' + day + '.json',
				async:	false,
				dataType: 'json',
				success: function(data) {
					// TODO: QUOTA_EXCEEDED, remove previous days?
					localStorage.setItem("day_" + day, JSON.stringify(data));
					cbSuccess(data)
				}
			});
		} else {
			cbSuccess(cachedData)
		}
	}

	/*
		cbSuccess(latitude, longitude, accuracy)
		cbError(error string)
		cached: indicates whether a cached entry can be used (default: true)
	*/
	this.getLocation = function(cbSuccess, cbError, cached) {
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
	
		// Fetch a position
		navigator.geolocation.getCurrentPosition(
			function(position) {
				var latitude = position.coords.latitude;
				var longitude = position.coords.longitude;
	
				cbSuccess(
					position.coords.latitude,
					position.coords.longitude,
					position.coords.accuracy
				)
			},
			function(error) {
				switch(error.code) {
					case error.TIMEOUT:
						cbError("time-out")
						break;
					default:
						cbError("unknown error")
				};
			},
			{
				maximumAge:	age,	// Maximum 10 minutes old
				timeout:	10000	// Time-out after 10 seconds
			}
		);
	}

	/*
		data: list of events, JSON result of getEvents
		latitude
		longitude
		radius: in kilometers
	*/
	this.filterEvents = function(data, hour) {
	    // Resulting structures
	    var dataOutput = {
	        "now": Array(),
	        "upcoming": Array(),
	        "continuous": Array()
	    }
	    
	    // Get continuous items
	    dataOutput.continuous = $.grep(data, function(event) {
			return (event.schedule.start === "00:00" && event.schedule.stop === "00:00")
		});
	    
		// Filter on hour
		var starthour, stophour
		data = $.grep(data, function(event) {
			if (event.schedule.start === "00:00" && event.schedule.stop === "00:00")
			    return false
			
			starthour = event.schedule.start.substr(0, 2)
			stophour = event.schedule.stop.substr(0, 2)
			return (starthour >= hour || stophour >= hour)
		});
	
		// Partition into hours
		for (var i = 0; i < 24-hour; i++)
			dataOutput.upcoming.push(Array())
		$.each(data, function(index, event) {
			starthour = event.schedule.start.substr(0, 2)
			if (starthour >= hour)
				dataOutput.upcoming[starthour-hour].push(event)
			else
				dataOutput.now.push(event)
		});
		
		// Sort the partitions
		function sortEvents(a, b) {
		    var mina = a.schedule.start.substr(0, 2)*60 + a.schedule.start.substr(3)
		    var minb = b.schedule.start.substr(0, 2)*60 + b.schedule.start.substr(3)
		    return (mina - minb);
	    }
	    dataOutput.now.sort(sortEvents)
		$.each(dataOutput.upcoming, function() {
		    this.sort(sortEvents)
		});
	
		return dataOutput
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
