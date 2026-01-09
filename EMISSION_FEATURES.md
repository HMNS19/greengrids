# GreenGrid Enhanced Features: Emission Analysis, CO₂ Dispersion & Carbon Capture

This document describes the comprehensive environmental analysis and simulation features added to the GreenGrid project, including emission tracking, CO₂ dispersion modeling, carbon capture interventions, and scenario comparison capabilities.

## Overview

The GreenGrid project has been significantly enhanced with a complete environmental analysis platform that includes:

1. **Emission Data Management**: Comprehensive tracking of transport, industrial, and residential emissions across Karnataka districts
2. **CO₂ Dispersion Modeling**: Advanced simulation of how CO₂ spreads across neighboring areas based on wind conditions
3. **Carbon Capture Interventions**: Modeling of various carbon capture strategies including tree planting, vertical gardens, and capture units
4. **Scenario Comparison**: Interactive dashboard for comparing different environmental strategies and their effectiveness
5. **Real-time Visualization**: Dynamic charts, maps, and analytics for environmental data

## Complete Feature Set

### Part 1: Emission Data Extension

### 1. Emission Data Extension

**File**: `add_emission_data.js`

- **Transport Emissions**: Realistic mock data for vehicle emissions (tons/year)
- **Industrial Emissions**: Manufacturing and industrial facility emissions (tons/year)  
- **Residential Emissions**: Household and residential area emissions (tons/year)
- **Total Emissions**: Computed field that sums all three emission types
- **District Classification**: Urban, suburban, and rural districts with different emission profiles

**Key Functions**:
- `getEmissionByDistrict(districtName, year)` - Get emission data for a specific district
- `getAllDistrictsEmissionData(year)` - Get emission data for all districts
- `addEmissionData(data)` - Add emission data to existing JSON structure

### 2. CO₂ Dispersion Model

**File**: `dispersionModel.js`

- **Initial Concentration Calculation**: `co2_concentration = total_emission / cell_area`
- **Neighbor-based Dispersion**: CO₂ spreads to adjacent cells based on wind conditions
- **Wind Effects**: Configurable wind speed and direction parameters
- **Convergence Detection**: Automatic stopping when changes become minimal
- **Timestep Simulation**: Iterative updates with configurable steps

**Key Functions**:
- `simulateDispersion(steps, wind, year)` - Run the dispersion simulation
- `getConcentrationData(district, year)` - Get concentration data for a district
- `getAllConcentrationData(year)` - Get concentration data for all districts

### 3. Web Interface

**File**: `templates/emissions.html`

- **Interactive Controls**: Year selection, simulation parameters, wind settings
- **Real-time Visualization**: Live display of emission data and simulation results
- **Statistics Dashboard**: Summary statistics for all districts
- **District Cards**: Individual district emission breakdowns and CO₂ concentrations

### 4. API Endpoints

**File**: `app.py`

- `GET /api/emissions/district/<district_name>` - Get emission data for a specific district
- `GET /api/emissions/all` - Get emission data for all districts
- `POST /api/dispersion/simulate` - Run CO₂ dispersion simulation
- `GET /api/dispersion/results` - Get simulation results
- `GET /emissions` - Access the emissions visualization page

## Usage Examples

### Command Line Usage

```bash
# Add emission data to JSON
node add_emission_data.js

# Run dispersion simulation
node dispersionModel.js 20 8 NE

# Test emission functions
node -e "const { getEmissionByDistrict } = require('./add_emission_data.js'); console.log(getEmissionByDistrict('Bengaluru Urban'));"
```

### API Usage

```javascript
// Get emission data for a district
fetch('/api/emissions/district/Bengaluru Urban?year=2025')
  .then(response => response.json())
  .then(data => console.log(data));

// Run dispersion simulation
fetch('/api/dispersion/simulate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    steps: 20,
    wind_speed: 8,
    wind_direction: 'NE',
    year: '2025'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Configuration

### Emission Data Configuration

```javascript
const EMISSION_CONFIG = {
    urban: {
        transport: { min: 1500, max: 3000 },
        industrial: { min: 2000, max: 5000 },
        residential: { min: 800, max: 1500 }
    },
    rural: {
        transport: { min: 200, max: 800 },
        industrial: { min: 100, max: 1000 },
        residential: { min: 1000, max: 2500 }
    }
};
```

### Dispersion Model Configuration

```javascript
const DEFAULT_CONFIG = {
    cell_area: 100, // km²
    dispersion_rate: 0.15, // 15% per timestep
    wind_effect: 0.3, // Wind amplification factor
    max_iterations: 50,
    convergence_threshold: 0.01
};
```

## Data Structure

### Updated JSON Structure

```json
{
    "2025": {
        "Bengaluru Urban": {
            "timestamp": "2025-04-12",
            "temperature": 31.36,
            "aqi": 52.81,
            "ndvi": 5.50,
            "transport_emission": 2104.28,
            "industrial_emission": 4985.71,
            "residential_emission": 1486.41,
            "total_emission": 8576.40,
            "co2_concentration": 8576.40,
            "co2_concentration_after_dispersion": 8576.40
        }
    }
}
```

## Wind Directions

Supported wind directions: N, NE, E, SE, S, SW, W, NW

## Backward Compatibility

- All existing temperature, AQI, and NDVI data is preserved
- New emission fields are additive and don't affect existing functionality
- The system gracefully handles missing emission data

## Future Enhancements

- Real-time weather data integration
- More sophisticated dispersion algorithms
- Geographic coordinate-based neighbor calculation
- Historical emission trend analysis
- Interactive map visualization
- Export functionality for simulation results