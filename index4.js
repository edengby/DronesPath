const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Paths
const inputFilePath = path.join(__dirname, 'cities_extracted.csv');
const outputFilePath = path.join(__dirname, 'duplicated_cities.csv');

// CSV Writer setup
const csvWriter = createObjectCsvWriter({
    path: outputFilePath,
    header: [
        { id: 'id', title: 'ID' },
        { id: 'city', title: 'City' },
        { id: 'date', title: 'Date' },
        { id: 'date_unixtime', title: 'Date Unixtime' }
    ]
});

// Main function to process data
const processCsv = async () => {
    const records = [];

    // Read and process the CSV file
    fs.createReadStream(inputFilePath)
        .pipe(csv())
        .on('data', (row) => {
            const id = row.ID;
            const date = row.Date;
            const date_unixtime = row['Date Unixtime'];

            // Split the city names by comma and trim whitespace
            const cities = row.City.split(',').map(city => city.trim());

            // Duplicate row for each city
            cities.forEach(city => {
                records.push({ id, city, date, date_unixtime });
            });
        })
        .on('end', async () => {
            // Write duplicated cities to the new CSV file
            await csvWriter.writeRecords(records);
            console.log('City duplication complete. File saved as duplicated_cities.csv');
        })
        .on('error', (error) => {
            console.error('Error processing CSV:', error);
        });
};

// Run the process
processCsv();
