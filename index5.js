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

  Object.keys(dronePaths).forEach(function(droneId) {
    var coords = dronePaths[droneId];
    if (coords.length > 0) {
      var latlngs = coords.map(function(coord) {
        return [coord.lat, coord.lng];
      });
      var polyline = L.polyline(latlngs, { color: getRandomColor() }).addTo(map);
      polyline.bindPopup('Drone ID: ' + droneId);
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
