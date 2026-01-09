const fs = require('fs');
const path = require('path');

// Configuration for emission generation
const EMISSION_CONFIG = {
    // Urban districts have higher transport and industrial emissions
    urban: {
        transport: { min: 1500, max: 3000 },
        industrial: { min: 2000, max: 5000 },
        residential: { min: 800, max: 1500 }
    },
    // Rural districts have higher residential but lower total emissions
    rural: {
        transport: { min: 200, max: 800 },
        industrial: { min: 100, max: 1000 },
        residential: { min: 1000, max: 2500 }
    },
    // Suburban areas have moderate emissions
    suburban: {
        transport: { min: 800, max: 1800 },
        industrial: { min: 500, max: 2000 },
        residential: { min: 900, max: 1800 }
    }
};

// District classification for realistic emission distribution
const DISTRICT_TYPES = {
    // Urban districts
    'Bengaluru Urban': 'urban',
    'Bangalore North': 'urban',
    'Bangalore East': 'urban',
    'Bangalore South': 'urban',
    'Defence Colony': 'urban',
    'Anekal': 'urban',
    'Yelahanka taluku': 'urban',
    'Thanisandra': 'urban',
    'Herohalli': 'urban',
    'Nagadevanahalli': 'urban',
    'Uttarahalli': 'urban',
    'Vasanthpura': 'urban',
    'Yelchenahalli': 'urban',
    'Jaraganahalli': 'urban',
    'Puttenahalli': 'urban',
    'Bilekhalli': 'urban',
    'Kodichikkanahalli': 'urban',
    
    // Suburban areas
    'Hosakote': 'suburban',
    'Devanahalli': 'suburban',
    'Doddaballapura': 'suburban',
    'Nelmangala': 'suburban',
    'Ramanagara': 'suburban',
    'Chikkaballapura': 'suburban',
    'Kolar': 'suburban',
    'Tumakuru': 'suburban',
    
    // Rural areas (default for unclassified districts)
    'default': 'rural'
};

function getRandomEmission(type) {
    const config = EMISSION_CONFIG[type];
    return {
        transport_emission: Math.round((Math.random() * (config.transport.max - config.transport.min) + config.transport.min) * 100) / 100,
        industrial_emission: Math.round((Math.random() * (config.industrial.max - config.industrial.min) + config.industrial.min) * 100) / 100,
        residential_emission: Math.round((Math.random() * (config.residential.max - config.residential.min) + config.residential.min) * 100) / 100
    };
}

function addEmissionData(data) {
    for (const year in data) {
        for (const district in data[year]) {
            if (district === 'timestamp') continue; // Skip timestamp entries
            
            const districtType = DISTRICT_TYPES[district] || DISTRICT_TYPES.default;
            const emissions = getRandomEmission(districtType);
            
            // Calculate total emission
            const total_emission = emissions.transport_emission + emissions.industrial_emission + emissions.residential_emission;
            
            // Add emission data to the district
            data[year][district] = {
                ...data[year][district],
                ...emissions,
                total_emission: Math.round(total_emission * 100) / 100
            };
        }
    }
    return data;
}

function main() {
    try {
        console.log('Reading JSON file...');
        const filePath = path.join(__dirname, 'static', 'data', 'bengaluru_area_temperatures.json');
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log('Adding emission data...');
        const updatedData = addEmissionData(jsonData);
        
        console.log('Writing updated JSON file...');
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 4));
        
        console.log('Emission data added successfully!');
        console.log('Sample data for first district:');
        const firstYear = Object.keys(updatedData)[0];
        const firstDistrict = Object.keys(updatedData[firstYear])[0];
        console.log(JSON.stringify(updatedData[firstYear][firstDistrict], null, 2));
        
    } catch (error) {
        console.error('Error processing JSON file:', error);
    }
}

if (require.main === module) {
    main();
}

// Function to get emission data by district name
function getEmissionByDistrict(districtName, year = '2025') {
    try {
        const filePath = path.join(__dirname, 'static', 'data', 'bengaluru_area_temperatures.json');
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (!jsonData[year] || !jsonData[year][districtName]) {
            return null;
        }
        
        const districtData = jsonData[year][districtName];
        
        return {
            district: districtName,
            year: year,
            transport_emission: districtData.transport_emission,
            industrial_emission: districtData.industrial_emission,
            residential_emission: districtData.residential_emission,
            total_emission: districtData.total_emission,
            breakdown: {
                transport_percentage: Math.round((districtData.transport_emission / districtData.total_emission) * 100 * 100) / 100,
                industrial_percentage: Math.round((districtData.industrial_emission / districtData.total_emission) * 100 * 100) / 100,
                residential_percentage: Math.round((districtData.residential_emission / districtData.total_emission) * 100 * 100) / 100
            }
        };
    } catch (error) {
        console.error('Error getting emission data:', error);
        return null;
    }
}

// Function to get all districts with their emission data
function getAllDistrictsEmissionData(year = '2025') {
    try {
        const filePath = path.join(__dirname, 'static', 'data', 'bengaluru_area_temperatures.json');
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (!jsonData[year]) {
            return [];
        }
        
        const districts = [];
        for (const districtName in jsonData[year]) {
            if (districtName === 'timestamp') continue;
            const emissionData = getEmissionByDistrict(districtName, year);
            if (emissionData) {
                districts.push(emissionData);
            }
        }
        
        return districts;
    } catch (error) {
        console.error('Error getting all districts emission data:', error);
        return [];
    }
}

module.exports = { 
    addEmissionData, 
    getEmissionByDistrict, 
    getAllDistrictsEmissionData 
};