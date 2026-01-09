const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
    cell_area: 100, // km² - assumed constant for all cells
    dispersion_rate: 0.15, // 15% of CO₂ disperses to neighbors each timestep
    wind_effect: 0.3, // Wind amplifies dispersion in wind direction
    max_iterations: 50,
    convergence_threshold: 0.01 // Stop when changes are below this threshold
};

// Wind direction mapping
const WIND_DIRECTIONS = {
    'N': { x: 0, y: -1 },
    'NE': { x: 1, y: -1 },
    'E': { x: 1, y: 0 },
    'SE': { x: 1, y: 1 },
    'S': { x: 0, y: 1 },
    'SW': { x: -1, y: 1 },
    'W': { x: -1, y: 0 },
    'NW': { x: -1, y: -1 }
};

class DispersionModel {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.data = null;
        this.districts = [];
        this.neighbors = new Map();
    }

    // Load data from JSON file
    loadData(filePath = null) {
        try {
            const dataPath = filePath || path.join(__dirname, 'static', 'data', 'bengaluru_area_temperatures.json');
            this.data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            this.districts = this.extractDistricts();
            this.calculateNeighbors();
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }

    // Extract district names from the data
    extractDistricts() {
        if (!this.data) return [];
        
        const year = Object.keys(this.data)[0]; // Use first available year
        return Object.keys(this.data[year]).filter(name => name !== 'timestamp');
    }

    // Calculate initial CO₂ concentration for each cell
    calculateInitialConcentration(year = '2025') {
        if (!this.data || !this.data[year]) return;

        for (const district of this.districts) {
            if (this.data[year][district]) {
                const totalEmission = this.data[year][district].total_emission || 0;
                this.data[year][district].co2_concentration = totalEmission / this.config.cell_area;
            }
        }
    }

    // Define neighborhood relationships (simplified grid-based approach)
    calculateNeighbors() {
        // For simplicity, we'll create a basic grid structure
        // In a real implementation, this would be based on actual geographical coordinates
        
        const gridSize = Math.ceil(Math.sqrt(this.districts.length));
        const grid = [];
        
        // Create a 2D grid representation
        for (let i = 0; i < this.districts.length; i += gridSize) {
            grid.push(this.districts.slice(i, i + gridSize));
        }

        // Calculate neighbors for each district
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const district = grid[row][col];
                if (!district) continue;

                const neighbors = [];
                
                // Check all 8 directions
                const directions = [
                    [-1, -1], [-1, 0], [-1, 1],
                    [0, -1],           [0, 1],
                    [1, -1],  [1, 0],  [1, 1]
                ];

                for (const [dr, dc] of directions) {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    
                    if (newRow >= 0 && newRow < grid.length && 
                        newCol >= 0 && newCol < grid[newRow].length && 
                        grid[newRow][newCol]) {
                        neighbors.push(grid[newRow][newCol]);
                    }
                }
                
                this.neighbors.set(district, neighbors);
            }
        }
    }

    // Calculate wind effect on dispersion
    calculateWindEffect(fromDistrict, toDistrict, wind) {
        if (!wind || !wind.direction) return 1.0;

        const windDir = WIND_DIRECTIONS[wind.direction];
        if (!windDir) return 1.0;

        // Simplified wind effect calculation
        // In reality, this would use actual geographical coordinates
        const windSpeed = wind.speed || 5;
        const windMultiplier = 1 + (windSpeed * this.config.wind_effect);
        
        return windMultiplier;
    }

    // Simulate one timestep of dispersion
    simulateTimestep(year, wind = null) {
        if (!this.data || !this.data[year]) return;

        const newConcentrations = new Map();
        
        // Calculate new concentrations for each district
        for (const district of this.districts) {
            if (!this.data[year][district]) continue;

            const currentConcentration = this.data[year][district].co2_concentration || 0;
            const neighbors = this.neighbors.get(district) || [];
            
            let incomingCO2 = 0;
            let outgoingCO2 = 0;

            // Calculate incoming CO₂ from neighbors
            for (const neighbor of neighbors) {
                if (this.data[year][neighbor]) {
                    const neighborConcentration = this.data[year][neighbor].co2_concentration || 0;
                    const windEffect = this.calculateWindEffect(neighbor, district, wind);
                    const dispersionAmount = neighborConcentration * this.config.dispersion_rate * windEffect;
                    incomingCO2 += dispersionAmount;
                }
            }

            // Calculate outgoing CO₂ to neighbors
            outgoingCO2 = currentConcentration * this.config.dispersion_rate * neighbors.length;

            // Calculate new concentration
            const newConcentration = Math.max(0, currentConcentration - outgoingCO2 + incomingCO2);
            newConcentrations.set(district, newConcentration);
        }

        // Update concentrations
        for (const [district, concentration] of newConcentrations) {
            this.data[year][district].co2_concentration = Math.round(concentration * 100) / 100;
        }
    }

    // Main simulation function
    simulateDispersion(steps, wind = null, year = '2025') {
        if (!this.data) {
            console.error('No data loaded. Call loadData() first.');
            return false;
        }

        console.log(`Starting CO₂ dispersion simulation for ${steps} steps...`);
        console.log(`Wind: ${wind ? `${wind.speed} m/s ${wind.direction}` : 'None'}`);
        
        // Calculate initial concentrations
        this.calculateInitialConcentration(year);
        
        const initialConcentrations = new Map();
        for (const district of this.districts) {
            if (this.data[year][district]) {
                initialConcentrations.set(district, this.data[year][district].co2_concentration);
            }
        }

        // Run simulation
        for (let step = 0; step < steps; step++) {
            this.simulateTimestep(year, wind);
            
            // Check for convergence
            if (step > 0 && step % 10 === 0) {
                let maxChange = 0;
                for (const district of this.districts) {
                    if (this.data[year][district]) {
                        const current = this.data[year][district].co2_concentration;
                        const previous = initialConcentrations.get(district);
                        const change = Math.abs(current - previous);
                        maxChange = Math.max(maxChange, change);
                    }
                }
                
                if (maxChange < this.config.convergence_threshold) {
                    console.log(`Convergence reached at step ${step}`);
                    break;
                }
            }
        }

        // Store dispersion results
        for (const district of this.districts) {
            if (this.data[year][district]) {
                this.data[year][district].co2_concentration_after_dispersion = 
                    this.data[year][district].co2_concentration;
            }
        }

        console.log('Simulation completed!');
        return true;
    }

    // Get concentration data for a specific district
    getConcentrationData(district, year = '2025') {
        if (!this.data || !this.data[year] || !this.data[year][district]) {
            return null;
        }

        const districtData = this.data[year][district];
        return {
            district,
            year,
            initial_concentration: districtData.co2_concentration || 0,
            final_concentration: districtData.co2_concentration_after_dispersion || 0,
            total_emission: districtData.total_emission || 0,
            neighbors: this.neighbors.get(district) || []
        };
    }

    // Get all concentration data
    getAllConcentrationData(year = '2025') {
        if (!this.data || !this.data[year]) return [];

        const results = [];
        for (const district of this.districts) {
            const data = this.getConcentrationData(district, year);
            if (data) {
                results.push(data);
            }
        }
        return results;
    }

    // Save updated data to file
    saveData(filePath = null) {
        if (!this.data) return false;

        try {
            const dataPath = filePath || path.join(__dirname, 'static', 'data', 'bengaluru_area_temperatures.json');
            fs.writeFileSync(dataPath, JSON.stringify(this.data, null, 4));
            console.log('Data saved successfully!');
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // Reset concentrations (useful for running multiple simulations)
    resetConcentrations(year = '2025') {
        if (!this.data || !this.data[year]) return;

        for (const district of this.districts) {
            if (this.data[year][district]) {
                delete this.data[year][district].co2_concentration;
                delete this.data[year][district].co2_concentration_after_dispersion;
            }
        }
    }
}

// Convenience functions for easy usage
function createDispersionModel(config = {}) {
    return new DispersionModel(config);
}

function runSimulation(steps = 20, wind = null, config = {}) {
    const model = createDispersionModel(config);
    
    if (!model.loadData()) {
        console.error('Failed to load data');
        return false;
    }
    
    const success = model.simulateDispersion(steps, wind);
    
    if (success) {
        model.saveData();
        return model;
    }
    
    return false;
}

// Export for use in other modules
module.exports = {
    DispersionModel,
    createDispersionModel,
    runSimulation,
    DEFAULT_CONFIG,
    WIND_DIRECTIONS
};

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const steps = parseInt(args[0]) || 20;
    const windSpeed = parseInt(args[1]) || 5;
    const windDirection = args[2] || 'NE';
    
    const wind = { speed: windSpeed, direction: windDirection };
    
    console.log('Running CO₂ dispersion simulation...');
    const model = runSimulation(steps, wind);
    
    if (model) {
        console.log('\nSample results:');
        const sampleData = model.getAllConcentrationData().slice(0, 3);
        console.log(JSON.stringify(sampleData, null, 2));
    }
}