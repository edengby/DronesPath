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

const pathSegments = {}; // To store segments and their counts

// Read Drone_Infiltration_Analysis.csv and build drone paths
fs.createReadStream('Drone_Infiltration_Analysis.csv')
    .pipe(csv())
    .on('data', (row) => {
        const citiesPassedStr = row['Cities Passed'];
        const citiesPassed = parseCitiesPassed(citiesPassedStr);

        const coords = citiesPassed
            .map((cityName) => {
                const coord = cityCoords[cityName];
                if (coord) {
                    return { city: cityName, ...coord };
                } else {
                    console.warn(`Coordinates not found for city: ${cityName}`);
                    return null;
                }
            })
            .filter((coord) => coord !== null);

        // Process segments between cities
        let prevCoord = null;
        coords.forEach((currentCoord) => {
            if (prevCoord) {
                const distance = getDistanceFromLatLonInKm(
                    prevCoord.lat,
                    prevCoord.lng,
                    currentCoord.lat,
                    currentCoord.lng
                );
                if (distance <= 15) {
                    const segmentKey = `${prevCoord.city}->${currentCoord.city}`;
                    if (pathSegments[segmentKey]) {
                        pathSegments[segmentKey].count += 1;
                    } else {
                        pathSegments[segmentKey] = {
                            from: prevCoord,
                            to: currentCoord,
                            count: 1,
                        };
                    }
                } else {
                    console.warn(`Skipping segment due to distance > 15 km between ${prevCoord.city} and ${currentCoord.city}`);
                }
            }
            prevCoord = currentCoord;
        });
    })
    .on('end', () => {
        console.log('CSV file successfully processed');
        generateMap(pathSegments);
    });

// Function to generate HTML map using Leaflet
function generateMap(pathSegments) {
    const pathSegmentsData = JSON.stringify(pathSegments);
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Aggregated Drone Paths Map</title>
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

  var pathSegments = ${pathSegmentsData};

  // Determine the maximum count to normalize line widths
  var maxCount = 0;
  Object.keys(pathSegments).forEach(function(segmentKey) {
    if (pathSegments[segmentKey].count > maxCount) {
      maxCount = pathSegments[segmentKey].count;
    }
  });

  // Draw the segments
  Object.keys(pathSegments).forEach(function(segmentKey) {
    var segment = pathSegments[segmentKey];
    var latlngs = [
      [segment.from.lat, segment.from.lng],
      [segment.to.lat, segment.to.lng]
    ];
    var weight = (segment.count / maxCount) * 10 + 1; // Line width between 1 and 11
    var polyline = L.polyline(latlngs, { color: '#000dff', weight: weight }).addTo(map);
    polyline.bindPopup(
      segment.from.city + ' → ' + segment.to.city + '<br>' +
      'Count: ' + segment.count
    );
  });
</script>
</body>
</html>
`;
    fs.writeFileSync('aggregated_drone_paths_map.html', htmlContent);
    console.log('Map has been generated as aggregated_drone_paths_map.html');
}
