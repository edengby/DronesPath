const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Paths
const inputFilePath = path.join(__dirname, 'filtered_messages.csv');
const outputFilePath = path.join(__dirname, 'cities_extracted_1.csv');

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

// Function to extract cities from text
const extractCities = (textArray) => {
    const cities = [];
    textArray.forEach((item, index) => {
        if (typeof item === 'object' && item.type === 'bold' && item.text.includes('•')) {
            // Extract city name by taking the next plain text item if exists
            const cityText = textArray[index + 1];
            if (typeof cityText === 'string') {
                cities.push(cityText.trim());
            }
        }
    });
    return cities;
};

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
            const textArray = JSON.parse(row.Text);

            // Extract city names and date/time updates
            const cities = extractCities(textArray);
            cities.forEach(city => {
                records.push({ id, city, date, date_unixtime });
            });
        })
        .on('end', async () => {
            // Write the extracted cities to the new CSV file
            await csvWriter.writeRecords(records);
            console.log('City extraction complete. File saved as cities_extracted_1.csv');
        })
        .on('error', (error) => {
            console.error('Error processing CSV:', error);
        });
};

// Run the process
processCsv();
