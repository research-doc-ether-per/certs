
npm install csv-parser

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const csvPath = path.join(__dirname, 'errors.csv');

const results = [];

fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', (row) => {
    results.push(row);
  })
  .on('end', () => {
    console.log(results);
  });
