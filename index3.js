const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Paths
const inputFilePath = path.join(__dirname, 'filtered_messages.csv');
const outputFilePath = path.join(__dirname, 'cities_extracted.csv');

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

// Function to extract cities with timestamps from text array
const extractCitiesWithTime = (textArray, defaultDate) => {
    const citiesWithTime = [];
    let currentTime = defaultDate;

    textArray.forEach((item, index) => {
        // Update current time if it's a timestamp in italics
        if (typeof item === 'object' && item.type === 'italic' && /\d{2}:\d{2}/.test(item.text)) {
            currentTime = item.text;
        }

        // Extract city name if item is in bold with a bullet point
        if (typeof item === 'object' && item.type === 'bold' && item.text.includes('•')) {
            const cityText = textArray[index + 1];
            if (typeof cityText === 'string') {
                citiesWithTime.push({ city: cityText.trim(), time: currentTime });
            }
        }
    });

    return citiesWithTime;
};

// Main function to process data
const processCsv = async () => {
    const records = [];

    // Read and process the CSV file
    fs.createReadStream(inputFilePath)
        .pipe(csv())
        .on('data', (row) => {
            const id = row.ID;
            const defaultDate = row.Date;
            const date_unixtime = row['Date Unixtime'];
            const textArray = JSON.parse(row.Text);

            // Extract cities with updated timestamps
            const citiesWithTime = extractCitiesWithTime(textArray, defaultDate);
            citiesWithTime.forEach(({ city, time }) => {
                // Construct full date with the specific time
                const adjustedDate = `${defaultDate.split('T')[0]}T${time}`;
                records.push({ id, city, date: adjustedDate, date_unixtime });
            });
        })
        .on('end', async () => {
            // Write extracted cities with timestamps to the new CSV file
            await csvWriter.writeRecords(records);
            console.log('City extraction complete. File saved as cities_extracted.csv');
        })
        .on('error', (error) => {
            console.error('Error processing CSV:', error);
        });
};

// Run the process
processCsv();
