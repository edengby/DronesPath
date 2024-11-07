const fs = require('fs');
const csv = require('csv-parser');

// Read and map city coordinates from cities_with_coords.json
const cityCoords = {};
const citiesData = JSON.parse(fs.readFileSync('cities_with_coords.json', 'utf8'));
citiesData.forEach((city) => {
    cityCoords[city.city] = {
        lat: parseFloat(city.lat),
        lng: parseFloat(city.lng),
    };
});

// Function to parse 'Cities Passed' field
function parseCitiesPassed(citiesPassedStr) {
    // Replace single quotes with double quotes and remove surrounding quotes
    const jsonStr = citiesPassedStr.replace(/'/g, '"').replace(/^"|"$/g, '');
    try {
        return JSON.parse(jsonStr);
    } catch (err) {
        console.error('Error parsing cities passed:', citiesPassedStr);
        return [];
    }
}

// Function to compute distance between two lat/lng points in kilometers
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Earth's radius in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

const dronePaths = {};

// Read Drone_Infiltration_Analysis.csv and build drone paths
fs.createReadStream('Drone_Infiltration_Analysis.csv')
    .pipe(csv())
    .on('data', (row) => {
        const droneId = row['Drone ID'];
        const citiesPassedStr = row['Cities Passed'];
        const citiesPassed = parseCitiesPassed(citiesPassedStr);

        const coords = citiesPassed
            .map((cityName) => {
                const coord = cityCoords[cityName];
                if (coord) {
                    return coord;
                } else {
                    console.warn(`Coordinates not found for city: ${cityName}`);
                    return null;
                }
            })
            .filter((coord) => coord !== null);

        dronePaths[droneId] = coords;
    })
    .on('end', () => {
        console.log('CSV file successfully processed');
        generateMap(dronePaths);
    });

// Function to generate HTML map using Leaflet
function generateMap(dronePaths) {
    const dronePathsData = JSON.stringify(dronePaths);
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Drone Paths Map</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Load Leaflet from CDN -->
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    #map { height: 100vh; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map').setView([31.5, 34.75], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  var dronePaths = ${dronePathsData};

  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Earth's radius in km
    var dLat = deg2rad(lat2 - lat1);  
    var dLon = deg2rad(lon2 - lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
  }

  function deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  Object.keys(dronePaths).forEach(function(droneId) {
    var coords = dronePaths[droneId];
    if (coords.length > 0) {
      var filteredCoords = [];
      var prevCoord = coords[0];
      filteredCoords.push(prevCoord);

      for (var i = 1; i < coords.length; i++) {
        var currentCoord = coords[i];
        var distance = getDistanceFromLatLonInKm(
          prevCoord.lat,
          prevCoord.lng,
          currentCoord.lat,
          currentCoord.lng
        );
        if (distance <= 15) {
          filteredCoords.push(currentCoord);
          prevCoord = currentCoord;
        } else {
          console.warn('Skipping point due to distance > 15 km between points for drone ' + droneId);
          // Do not update prevCoord, so the next point will be compared to the last included point
        }
      }

      if (filteredCoords.length > 1) {
        var latlngs = filteredCoords.map(function(coord) {
          return [coord.lat, coord.lng];
        });
        var polyline = L.polyline(latlngs, { color: getRandomColor() }).addTo(map);
        polyline.bindPopup('Drone ID: ' + droneId);
      } else {
        console.warn('Not enough points to draw a path for drone ' + droneId);
      }
    }
  });

  function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

</script>
</body>
</html>
`;
    fs.writeFileSync('drone_paths_map.html', htmlContent);
    console.log('Map has been generated as drone_paths_map.html');
}
