//Init Map
//*******************************************************************************************************************************************************
var lat = 41.141376;
var lng = -8.613999;
var zoom = 14;

// add an OpenStreetMap tile layer
var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ';


var grayscale = L.tileLayer(mbUrl, {
        id: 'mapbox.light',
        attribution: mbAttr
    }),
    streets = L.tileLayer(mbUrl, {
        id: 'mapbox.streets',
        attribution: mbAttr
    });


var map = L.map('map', {
    center: [lat, lng], // Porto
    zoom: zoom,
    layers: [streets],
    zoomControl: true,
    fullscreenControl: true,
    fullscreenControlOptions: { // optional
        title: "Show me the fullscreen !",
        titleCancel: "Exit fullscreen mode",
        position: 'bottomright'
    }
});

var baseLayers = {
    "Grayscale": grayscale, // Grayscale tile layer
    "Streets": streets, // Streets tile layer
};

layerControl = L.control.layers(baseLayers, null, {
    position: 'bottomleft'
}).addTo(map);

// Initialise the FeatureGroup to store editable layers
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var featureGroup = L.featureGroup();

var drawControl = new L.Control.Draw({
    position: 'topright',
	collapsed: false,
    draw: {
        // Available Shapes in Draw box. To disable anyone of them just convert true to false
        polyline: false,
        polygon: false,
        circle: false,
        rectangle: true,
        marker: false,
    }

});
map.addControl(drawControl); // To add anything to map, add it to "drawControl"
//*******************************************************************************************************************************************************
//*****************************************************************************************************************************************
// Index Road Network by Using R-Tree
//*****************************************************************************************************************************************
var rt = cw(function(data,cb){
	var self = this;
	var request,_resp;
	importScripts("js/rtree.js");
	if(!self.rt){
		self.rt=RTree();
		request = new XMLHttpRequest();
		request.open("GET", data);
		request.onreadystatechange = function() {
			if (request.readyState === 4 && request.status === 200) {
				_resp=JSON.parse(request.responseText);
				self.rt.geoJSON(_resp);
				cb(true);
			}
		};
		request.send();
	}else{
		return self.rt.bbox(data);
	}
});

rt.data(cw.makeUrl("js/trips.json"));
//*****************************************************************************************************************************************	
//*****************************************************************************************************************************************
// Drawing Shapes (polyline, polygon, circle, rectangle, marker) Event:
// Select from draw box and start drawing on map.
//*****************************************************************************************************************************************	

map.on('draw:created', function (e) {
	
	var type = e.layerType,
		layer = e.layer;
	
	if (type === 'rectangle') {
		console.log(layer.getLatLngs()); //Rectangle Corners points
		var bounds=layer.getBounds();
		rt.data([[bounds.getSouthWest().lng,bounds.getSouthWest().lat],[bounds.getNorthEast().lng,bounds.getNorthEast().lat]]).
		then(function(d){var result = d.map(function(a) {return a.properties;});


		/**************************************************************************

		HIER WIRD ALLES GESCHRIEBEN WERDEN, INDEM DIE VARIABLE 'result'
		VERWENDET WIRD, DENN ES SCHLIEßT ALLE ERGEBNISSE ZUR REISEINFORMATION EIN

		**************************************************************************/
		currTrips = result;

		console.log(result);		// Trip Info: avspeed, distance, duration, endtime, maxspeed, minspeed, starttime, streetnames, taxiid, tripid
		DrawRS(result);
		});
	}
	
	drawnItems.addLayer(layer);			//Add your Selection to Map  
});

var currTrips;

//*****************************************************************************************************************************************
// DrawRS Function:
// Input is a list of road segments ID and their color. Then the visualization can show the corresponding road segments with the color
// Test:      var input_data = [{road:53, color:"#f00"}, {road:248, color:"#0f0"}, {road:1281, color:"#00f"}];
//            DrawRS(input_data);
//*****************************************************************************************************************************************
function DrawRS(trips) {
	for (var j=0; j<trips.length; j++) {  // Check Number of Segments and go through all segments
		var TPT = new Array();			  
		TPT = TArr[trips[j].tripid].split(',');  		 // Find each segment in TArr Dictionary. 
		var polyline = new L.Polyline([]).addTo(drawnItems);
        polyline.setStyle({
            color: 'red',                      // polyline color
			weight: 1,                         // polyline weight
			opacity: 0.5,                      // polyline opacity
			smoothFactor: 1.0
        });

		for(var y = 0; y < TPT.length-1; y=y+2){    // Parse latlng for each segment
			polyline.addLatLng([parseFloat(TPT[y+1]), parseFloat(TPT[y])]);
		}
	}

	// Checks to see if data was returned
	if (currTrips.length != 0) {
		// Update visualizations pane w/ visualizations
		document.getElementById("title").style.textDecoration = "underline";
		document.getElementById("title").innerHTML = "Visualizations";
		drawWordCloud();
		drawSankey();
		drawScatterMatrix();
	} else {
		// Error message if no data had been loaded
		document.getElementById("title").innerHTML = "Data had not been loaded. Please try again.";
	}
}

// Function to change the color of trip paths including a particular streetname
function changeColorStreetname(streetname) {
	// Remove the existing paths
	d3.select('svg').selectAll('g').remove();
	// For each trip, remake the lines but make the lines different if they include the selected street
	currTrips.forEach(trip => {
		let selectedStreet = trip.streetnames.includes(streetname);
		var TPT = new Array();			  
		TPT = TArr[trip.tripid].split(',');  		 // Find each segment in TArr Dictionary. 
		var polyline = new L.Polyline([]).addTo(drawnItems);
        polyline.setStyle({
            color: selectedStreet ? 'green' : 'red',                      // polyline color
			weight: selectedStreet ? 3 : 1,                         // polyline weight
			opacity: 0.5,                      // polyline opacity
			smoothFactor: 1.0  
        });
		for(var y = 0; y < TPT.length-1; y=y+2){    // Parse latlng for each segment
			polyline.addLatLng([parseFloat(TPT[y+1]), parseFloat(TPT[y])]);
		}
	});
}

// Function to get a sorted list of the top street names
function getTopStreetNames() {
	// Log an error if there are no trips selected
	if (currTrips == null) {
		console.log("Select streets to run this function");
		return;
	}
	// Get the top street names
	return [].concat(...currTrips
						.map(trip => trip.streetnames
							.filter((v, i, self) => self.indexOf(v) === i))) // Extract the unique streetnames from the object array into a 1d array
					.reduce((results, street) => { // Reduce the array by street name
						let index = -1;
						results.forEach((o, i) => { // Gets the index of the current street in the array
							if (o.street === street) {
								index = i;
								return;
							}
						})
						if (index === -1) {
							results.push({"street": street, "freq": 1}); // Pushes a new key/value object onto the accumulator if does not exist
						} else {
							results[index].freq += 1; // Increments the value of the street in the accumulator if does exist
						}
						return results;
					}, [])
					.sort((a, b) => b.freq - a.freq); // Sorts the list descending
}

// Function to get a sorted list of the top pick up and drop off locations
function getPickUpDropOffFreqs() {
	// Log an error if there are no trips selected
	if (currTrips == null) {
		console.log("Select streets to run this function");
		return;
	}
	// Reduces the trips into a 2d array of pickup, dropoff, and frequency
	return currTrips.reduce((results, trip) => {
		let pickUp = trip.streetnames[0]; // Gets the pickup location
		if (results.map(r => r[1]).includes(pickUp)) { // Skips this trip if pickup is already a dropoff to avoid cycles
			return results;
		}
		let dropOff = trip.streetnames[trip.streetnames.length-1]; // Gets the dropoff location
		if (pickUp === dropOff){ // Skips this trip if the pickup and dropoff locations are the same
			return results;
		}
		let found = false; // Initializes found to false
		results.forEach(r => { // Finds the pickup/dropoff pair and increments if it finds it
			if (r[0] === pickUp && r[1] === dropOff) {
				r[2] += 1;
				found = true;
				return;
			}
		})
		if (!found) { // Adds the pickup/dropoff pair with initial value of 1 if not found
			results.push([pickUp, dropOff, 1]);
		}
		return results;
	}, []).sort((a, b) => b[2] - a[2]); // Sorts the results by frequency descending
}

function drawWordCloud() {
	// Write wordcloud title
	document.getElementById("wordcloud").innerHTML = "<h2>Wordcloud Visualization</h2>"+
														"<p>Click on a street name to highlight all paths including it on the map!</p>";
	document.getElementById("wordcloud").style.border = "thick solid";
	document.getElementById("wordcloud").style.borderRadius = "20px";

	let top10 = getTopStreetNames().slice(0,10); // Takes the top 10 streets
	let ratio = top10[0].freq / 300; // Gets the ratio between top street frequency and 300
	shuffle(top10); // Randomly shuffles the streets
	top10.forEach(s => s.freq = Math.round(s.freq / ratio)); // Normalizes the frequencies of all streets
	
	// Draws the word cloud
	d3.select("#wordcloud")
		.selectAll("span")
		.data(top10)
		.enter()
		.append("span")
		.text(s => s.street.replace(/ /g, "-")) // Adds the text, replacing spaces with dashes
		.style("font-size", s => (s.freq / 7).toString() + "px") // Makes a font size relative to normalized frequency
		.style("padding", "5px")
		.style("color", "red")
		.style("cursor", "pointer")
		.on("click", s => { // Changes color of text if clicked
			d3.select("#wordcloud")
				.selectAll("span")
				.style("color", sub => sub.street === s.street ? "green" : "red");
			changeColorStreetname(s.street);
		})
		;
}

// Starts drawing the sankey chart
function drawSankey() {
	google.charts.load('current', {'packages':['sankey']}); // Loads the sankey package from Google (thanks Google)
    google.charts.setOnLoadCallback(drawSankeyCallBack); // Starts callback function to actually draw the chart

}

function drawSankeyCallBack() {
	// Creates the header and border for sankey chart
	document.getElementById("sankey").innerHTML = "<h2>Sankey Chart</h2>" +
													"<p>This chart shows the frequencies between top pick up and dropoff locations." + 
													"Mouse over the bars to see a detailed description.</p>" +
													"<div id=\"sankey-chart\" style=\"padding:15px;\"></div>";
													// "<div style=\"margin-top: 50px; \"></div>";
	
	document.getElementById("sankey").style.border = "thick solid";
	document.getElementById("sankey").style.borderRadius = "20px";
	// Sets up the data
	var data = new google.visualization.DataTable();
	data.addColumn('string', 'From');
	data.addColumn('string', 'To');
	data.addColumn('number', 'Weight');

	// Adds the rows of the data from the top 15 pickup/drop pairs
	data.addRows(getPickUpDropOffFreqs().slice(0,15));

	// Sets the size of the chart
	var options = {
		width: 500,
		height: 300
	};

	// Creates and draws the chart
	var chart = new google.visualization.Sankey(document.getElementById('sankey-chart'));
	chart.draw(data, options);
}

// Randomly shuffles an array
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Starts to draw the scatter matrix
function drawScatterMatrix(){	
	google.charts.load('current', {'packages':['corechart']}); // Loads the scatter matrix from Google (thanks Google)
    google.charts.setOnLoadCallback(drawScatterMatrixCallBack); // Starts callback function to draw scatter matrix
}

function drawScatterMatrixCallBack(){
	// Draws the header and border styles
	document.getElementById('scatter').innerHTML= "<h2>Scatter-Matrix</h2>" +
													"<p>The following is a scatter matrix comparing trip distance, duration, and maximum speed. </p>" + 
													"<div id=\"scatter1\" style=\"width:33%; float:left\"></div>"+
													"<div id=\"scatter2\" style=\"width:33%; float:left\"></div>" + 
													"<div id=\"scatter3\" style=\"width:33%; float:left\"></div>" + 
													"<div id=\"scatter4\" style=\"width:33%; float:left\"></div>" + 
													"<div id=\"scatter5\" style=\"width:33%; float:left\"></div>" + 
													"<div id=\"scatter6\" style=\"width:33%; float:left\"></div>" + 
													"<div id=\"scatter7\" style=\"width:33%; float:left\"></div>" + 
													"<div id=\"scatter8\" style=\"width:33%; float:left\"></div>" + 
													"<div id=\"scatter9\" style=\"width:33%; float:left\"></div>" +
													"<p style=\"color:white; margin-bottom: 15px;\">Do not remove this text</p>";
	document.getElementById("scatter").style.border = "thick solid";
	document.getElementById("scatter").style.borderRadius = "20px";
	// Get 1d arrays of the distances, durations and max speeds
	let distance = currTrips.map(t => t.distance);
	let duration = currTrips.map(t => t.duration);
	let maxSpeed = currTrips.map(t => t.maxspeed);

	// Draw row 1 scatter plots
	drawScatterPlot('Distance', distance, 'Distance', distance, 1);
	drawScatterPlot('Distance', distance, 'Duration', duration, 2);
	drawScatterPlot('Distance', distance, 'Max Speed', maxSpeed, 3);
	// Draw row 2 scatter plots
	drawScatterPlot('Duration', duration, 'Distance', distance, 4);
	drawScatterPlot('Duration', duration, 'Duration', duration, 5);
	drawScatterPlot('Duration', duration, 'Max Speed', maxSpeed, 6);
	// Draw row 3 scatter plots
	drawScatterPlot('Max Speed', maxSpeed, 'Distance', distance, 7);
	drawScatterPlot('Max Speed', maxSpeed, 'Duration', duration, 8);
	drawScatterPlot('Max Speed', maxSpeed, 'Max Speed', maxSpeed, 9);
}

/*
// Helper function to fill the 
function fillScatterArray(results, arr1, arr2) {
	for (let i = 0; i < arr1.length; i++) {
		results.push([arr1[i], arr2[i]]);
	}
}
*/

// Draws scatter plot
function drawScatterPlot(title1, param_arr1, title2, param_arr2, chartNum) {
	// Copies arrays
	arr1 = param_arr1.slice();
	arr2 = param_arr2.slice();

	// Adds title to 2d array
	let rawData = [[title1, title2]];
	// Adds each line of data to 2d array
	for (let i = 0; i < arr2.length; i++) {
		rawData.push([arr1[i], arr2[i]]);
	}
	// Formats data for Google visualization
	var data = google.visualization.arrayToDataTable(rawData);
	// Sets chart options
	var options = {
		title: title1 + ' vs. ' + title2,
		hAxis: {title: title1, minValue: 0, maxValue: arr1.sort((a, b) => b - a)[0]},
		vAxis: {title: title2, minValue: 0, maxValue: arr2.sort((a, b) => b - a)[0]},
		legend: 'none'
	};
	// Creates and draws the scatter plot
	var chart = new google.visualization.ScatterChart(document.getElementById('scatter'+chartNum));
	chart.draw(data, options);
}
