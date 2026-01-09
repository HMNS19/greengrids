const fs = require('fs');
const path = 'static/data/bengaluru_area_temperatures.json';

// Read the JSON file
fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    // Parse the JSON data
    const jsonData = JSON.parse(data);
    let entriesWithoutNdvi = 0;
    let entriesWithNdvi = 0;
    let totalEntries = 0;
    
    // Iterate through each year
    Object.keys(jsonData).forEach(year => {
      // Iterate through each area in the year
      Object.keys(jsonData[year]).forEach(area => {
        totalEntries++;
        const areaData = jsonData[year][area];
        
        // Check if ndvi value is missing
        if (areaData.ndvi === undefined) {
          entriesWithoutNdvi++;
        } else {
          entriesWithNdvi++;
        }
      });
    });
    
    console.log(`\nJSON Analysis Summary:`);
    console.log(`Total entries: ${totalEntries}`);
    console.log(`Entries with NDVI values: ${entriesWithNdvi}`);
    console.log(`Entries without NDVI values: ${entriesWithoutNdvi}`);
    
    if (entriesWithoutNdvi === 0) {
      console.log(`\nAll entries now have NDVI values! The script has completed its job successfully.`);
    } else {
      console.log(`\nThere are still ${entriesWithoutNdvi} entries without NDVI values.`);
    }
    
  } catch (parseErr) {
    console.error('Error parsing JSON:', parseErr);
  }
}); 