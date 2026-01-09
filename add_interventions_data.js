const fs = require('fs');
const path = require('path');

// Default intervention configuration
const DEFAULT_INTERVENTIONS = {
    trees_planted: 0,
    vertical_gardens: 0,
    capture_units: 0
};

// Add interventions data to JSON
function addInterventionsData(data) {
    for (const year in data) {
        for (const district in data[year]) {
            if (district === 'timestamp') continue; // Skip timestamp entries
            
            // Add interventions property if not present
            if (!data[year][district].interventions) {
                data[year][district].interventions = { ...DEFAULT_INTERVENTIONS };
            }
        }
    }
    return data;
}

function main() {
    try {
        console.log('Reading JSON file...');
        const filePath = path.join(__dirname, 'static', 'data', 'bengaluru_area_temperatures.json');
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log('Adding interventions data...');
        const updatedData = addInterventionsData(jsonData);
        
        console.log('Writing updated JSON file...');
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 4));
        
        console.log('Interventions data added successfully!');
        console.log('Sample data for first district:');
        const firstYear = Object.keys(updatedData)[0];
        const firstDistrict = Object.keys(updatedData[firstYear])[0];
        console.log(JSON.stringify(updatedData[firstYear][firstDistrict].interventions, null, 2));
        
    } catch (error) {
        console.error('Error processing JSON file:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = { addInterventionsData };