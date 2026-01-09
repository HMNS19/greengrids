const fs = require('fs');
const path = require('path');

// Base capture efficiencies (approximate values)
const captureRates = {
    trees_planted: 0.0004,        // tons of CO₂ captured per tree per year
    vertical_gardens: 0.2,        // tons of CO₂ per unit area per year
    capture_units: 5.0            // tons of CO₂ per unit per year
};

// Default intervention configuration
const DEFAULT_INTERVENTIONS = {
    trees_planted: 0,
    vertical_gardens: 0,
    capture_units: 0
};

class CaptureSimulation {
    constructor(config = {}) {
        this.config = { ...DEFAULT_INTERVENTIONS, ...config };
        this.data = null;
        this.districts = [];
        this.scenarios = new Map();
    }

    // Load data from JSON file
    loadData(filePath = null) {
        try {
            const dataPath = filePath || path.join(__dirname, 'static', 'data', 'bengaluru_area_temperatures.json');
            this.data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            this.districts = this.extractDistricts();
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

    // Add interventions property to all cells if not present
    initializeInterventions(year = '2025') {
        if (!this.data || !this.data[year]) return;

        for (const district of this.districts) {
            if (this.data[year][district]) {
                if (!this.data[year][district].interventions) {
                    this.data[year][district].interventions = { ...DEFAULT_INTERVENTIONS };
                }
            }
        }
    }

    // Apply interventions to a single cell
    applyInterventions(cellData) {
        if (!cellData.interventions) {
            cellData.interventions = { ...DEFAULT_INTERVENTIONS };
        }

        const { trees_planted, vertical_gardens, capture_units } = cellData.interventions;
        const co2_before_capture = cellData.co2_concentration_after_dispersion || cellData.co2_concentration || 0;

        // Calculate total capture
        const total_capture = 
            (trees_planted * captureRates.trees_planted) +
            (vertical_gardens * captureRates.vertical_gardens) +
            (capture_units * captureRates.capture_units);

        // Apply capture (ensure CO₂ doesn't go below 0)
        const co2_after_capture = Math.max(co2_before_capture - total_capture, 0);

        return {
            co2_before_capture,
            co2_after_capture,
            total_capture,
            percent_reduction: co2_before_capture > 0 ? 
                Math.round((total_capture / co2_before_capture) * 100 * 100) / 100 : 0
        };
    }

    // Apply interventions to all cells
    applyInterventionsToAll(year = '2025') {
        if (!this.data || !this.data[year]) return false;

        this.initializeInterventions(year);

        for (const district of this.districts) {
            if (this.data[year][district]) {
                const result = this.applyInterventions(this.data[year][district]);
                
                // Update the cell data
                this.data[year][district].co2_before_capture = result.co2_before_capture;
                this.data[year][district].co2_after_capture = result.co2_after_capture;
                this.data[year][district].total_capture = result.total_capture;
                this.data[year][district].percent_reduction = result.percent_reduction;
            }
        }

        return true;
    }

    // Simulate a capture scenario with specific intervention counts
    simulateCaptureScenario(scenarioConfig, year = '2025') {
        if (!this.data || !this.data[year]) return false;

        console.log(`Simulating capture scenario: ${scenarioConfig.name || 'Unnamed'}`);
        
        // Apply interventions based on scenario
        if (scenarioConfig.interventions) {
            // Apply specific interventions to districts
            for (const [district, interventions] of Object.entries(scenarioConfig.interventions)) {
                if (this.data[year][district]) {
                    this.data[year][district].interventions = { ...DEFAULT_INTERVENTIONS, ...interventions };
                }
            }
        } else if (scenarioConfig.distribution) {
            // Apply interventions based on distribution rules
            this.applyDistributionInterventions(scenarioConfig.distribution, year);
        }

        // Apply interventions to all cells
        const success = this.applyInterventionsToAll(year);
        
        if (success) {
            // Store scenario results
            this.scenarios.set(scenarioConfig.name || 'scenario', {
                name: scenarioConfig.name || 'scenario',
                year: year,
                results: this.getCaptureResults(year),
                config: scenarioConfig
            });
        }

        return success;
    }

    // Apply interventions based on distribution rules
    applyDistributionInterventions(distribution, year) {
        const { type, count, districts } = distribution;
        
        if (type === 'uniform') {
            // Apply same intervention count to all districts
            for (const district of this.districts) {
                if (this.data[year][district]) {
                    this.data[year][district].interventions = { ...DEFAULT_INTERVENTIONS, ...count };
                }
            }
        } else if (type === 'targeted' && districts) {
            // Apply interventions to specific districts
            for (const [district, interventions] of Object.entries(districts)) {
                if (this.data[year][district]) {
                    this.data[year][district].interventions = { ...DEFAULT_INTERVENTIONS, ...interventions };
                }
            }
        } else if (type === 'proportional') {
            // Apply interventions proportional to emission levels
            const totalEmission = this.districts.reduce((sum, district) => {
                return sum + (this.data[year][district]?.total_emission || 0);
            }, 0);

            for (const district of this.districts) {
                if (this.data[year][district]) {
                    const emission = this.data[year][district].total_emission || 0;
                    const proportion = totalEmission > 0 ? emission / totalEmission : 0;
                    
                    const interventions = {};
                    for (const [key, value] of Object.entries(count)) {
                        interventions[key] = Math.round(value * proportion);
                    }
                    
                    this.data[year][district].interventions = { ...DEFAULT_INTERVENTIONS, ...interventions };
                }
            }
        }
    }

    // Get capture results for all districts
    getCaptureResults(year = '2025') {
        if (!this.data || !this.data[year]) return [];

        const results = [];
        for (const district of this.districts) {
            if (this.data[year][district]) {
                const districtData = this.data[year][district];
                results.push({
                    district,
                    year,
                    co2_before_capture: districtData.co2_before_capture || 0,
                    co2_after_capture: districtData.co2_after_capture || 0,
                    total_capture: districtData.total_capture || 0,
                    percent_reduction: districtData.percent_reduction || 0,
                    interventions: districtData.interventions || { ...DEFAULT_INTERVENTIONS },
                    total_emission: districtData.total_emission || 0
                });
            }
        }
        return results;
    }

    // Get summary statistics for a scenario
    getScenarioSummary(scenarioName, year = '2025') {
        const scenario = this.scenarios.get(scenarioName);
        if (!scenario) return null;

        const results = scenario.results;
        const totalCO2Before = results.reduce((sum, r) => sum + r.co2_before_capture, 0);
        const totalCO2After = results.reduce((sum, r) => sum + r.co2_after_capture, 0);
        const totalCapture = results.reduce((sum, r) => sum + r.total_capture, 0);
        const averageReduction = results.reduce((sum, r) => sum + r.percent_reduction, 0) / results.length;

        return {
            scenario_name: scenarioName,
            year: year,
            total_districts: results.length,
            total_CO2_before: Math.round(totalCO2Before * 100) / 100,
            total_CO2_after: Math.round(totalCO2After * 100) / 100,
            total_capture: Math.round(totalCapture * 100) / 100,
            percent_reduction: totalCO2Before > 0 ? Math.round((totalCapture / totalCO2Before) * 100 * 100) / 100 : 0,
            average_reduction_per_district: Math.round(averageReduction * 100) / 100,
            top_performing_districts: results
                .sort((a, b) => b.percent_reduction - a.percent_reduction)
                .slice(0, 5)
                .map(r => ({
                    district: r.district,
                    reduction: r.percent_reduction,
                    capture: r.total_capture
                }))
        };
    }

    // Compare multiple scenarios
    compareScenarios(scenarioNames, year = '2025') {
        const comparisons = [];
        
        for (const scenarioName of scenarioNames) {
            const summary = this.getScenarioSummary(scenarioName, year);
            if (summary) {
                comparisons.push(summary);
            }
        }

        // Sort by total capture
        comparisons.sort((a, b) => b.total_capture - a.total_capture);

        return {
            year: year,
            scenarios: comparisons,
            best_scenario: comparisons[0]?.scenario_name || null,
            total_possible_capture: Math.max(...comparisons.map(c => c.total_capture)),
            average_improvement: comparisons.length > 1 ? 
                Math.round((comparisons[0].percent_reduction - comparisons[comparisons.length - 1].percent_reduction) * 100) / 100 : 0
        };
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

    // Reset all interventions
    resetInterventions(year = '2025') {
        if (!this.data || !this.data[year]) return;

        for (const district of this.districts) {
            if (this.data[year][district]) {
                this.data[year][district].interventions = { ...DEFAULT_INTERVENTIONS };
                delete this.data[year][district].co2_before_capture;
                delete this.data[year][district].co2_after_capture;
                delete this.data[year][district].total_capture;
                delete this.data[year][district].percent_reduction;
            }
        }
    }

    // Get all available scenarios
    getAvailableScenarios() {
        return Array.from(this.scenarios.keys());
    }

    // Clear all scenarios
    clearScenarios() {
        this.scenarios.clear();
    }
}

// Predefined scenario configurations
const PREDEFINED_SCENARIOS = {
    baseline: {
        name: 'baseline',
        description: 'No interventions applied',
        interventions: {}
    },
    
    tree_planting: {
        name: 'tree_planting',
        description: 'Plant 1000 trees in each district',
        distribution: {
            type: 'uniform',
            count: { trees_planted: 1000 }
        }
    },
    
    vertical_gardens: {
        name: 'vertical_gardens',
        description: 'Install vertical gardens in urban areas',
        distribution: {
            type: 'targeted',
            districts: {
                'Bengaluru Urban': { vertical_gardens: 50 },
                'Bangalore North': { vertical_gardens: 30 },
                'Bangalore East': { vertical_gardens: 30 },
                'Bangalore South': { vertical_gardens: 30 }
            }
        }
    },
    
    capture_units: {
        name: 'capture_units',
        description: 'Install capture units in high-emission areas',
        distribution: {
            type: 'proportional',
            count: { capture_units: 10 }
        }
    },
    
    mixed_strategy: {
        name: 'mixed_strategy',
        description: 'Combined approach with trees, gardens, and capture units',
        distribution: {
            type: 'proportional',
            count: { 
                trees_planted: 500,
                vertical_gardens: 20,
                capture_units: 5
            }
        }
    }
};

// Convenience functions
function createCaptureSimulation(config = {}) {
    return new CaptureSimulation(config);
}

function runCaptureScenario(scenarioName, year = '2025', config = {}) {
    const simulation = createCaptureSimulation(config);
    
    if (!simulation.loadData()) {
        console.error('Failed to load data');
        return false;
    }
    
    const scenarioConfig = PREDEFINED_SCENARIOS[scenarioName] || { name: scenarioName, ...config };
    const success = simulation.simulateCaptureScenario(scenarioConfig, year);
    
    if (success) {
        simulation.saveData();
        return simulation;
    }
    
    return false;
}

// Export for use in other modules
module.exports = {
    CaptureSimulation,
    createCaptureSimulation,
    runCaptureScenario,
    PREDEFINED_SCENARIOS,
    captureRates,
    DEFAULT_INTERVENTIONS
};

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const scenarioName = args[0] || 'tree_planting';
    const year = args[1] || '2025';
    
    console.log(`Running capture scenario: ${scenarioName}`);
    const simulation = runCaptureScenario(scenarioName, year);
    
    if (simulation) {
        const summary = simulation.getScenarioSummary(scenarioName, year);
        console.log('\nScenario Summary:');
        console.log(JSON.stringify(summary, null, 2));
    }
}