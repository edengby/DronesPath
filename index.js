const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

// Load JSON file
const dataFilePath = path.join(__dirname, './result.json');
const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

// Filter messages
const filteredMessages = data.messages.filter(message => {
    return (
        message.text &&
        Array.isArray(message.text) &&
        message.text[0] &&
        message.text[0].text === "✈️ חדירת כלי טיס עוין"
    );
});

// Prepare CSV writer
const csvFilePath = path.join(__dirname, 'filtered_messages.csv');
const csv = csvWriter({
    path: csvFilePath,
    header: [
        { id: 'id', title: 'ID' },
        { id: 'date', title: 'Date' },
        { id: 'date_unixtime', title: 'Date Unixtime' },
        { id: 'text', title: 'Text' }
    ]
});

// Prepare data for CSV
const csvData = filteredMessages.map(message => ({
    id: message.id,
    date: message.date,
    date_unixtime: message.date_unixtime,
    text: JSON.stringify(message.text)
}));

// Write to CSV
csv.writeRecords(csvData)
    .then(() => {
        console.log('CSV file was written successfully');
    })
    .catch(err => {
        console.error('Error writing CSV file', err);
    });
