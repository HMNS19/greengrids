const fs = require('fs');
const path = require('path');

// Import required modules
const { createDispersionModel } = require('./dispersionModel');
const { createCaptureSimulation, PREDEFINED_SCENARIOS } = require('./captureSimulation');

class Dashboard {
    constructor() {
        this.scenarios = new Map();
        this.currentData = null;
        this.districts = [];
    }

    // Load data from JSON file
    loadData(filePath = null) {
        try {
            const dataPath = filePath || path.join(__dirname, 'static', 'data', 'bengaluru_area_temperatures.json');
            this.currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            this.districts = this.extractDistricts();
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }

    // Extract district names from the data
    extractDistricts() {
        if (!this.currentData) return [];
        
        const year = Object.keys(this.currentData)[0];
        return Object.keys(this.currentData[year]).filter(name => name !== 'timestamp');
    }

    // Run complete workflow: Emission → Dispersion → Capture
    async runCompleteWorkflow(scenarioConfig, year = '2025') {
        console.log(`Running complete workflow for scenario: ${scenarioConfig.name}`);
        
        try {
            // Step 1: Load data
            if (!this.loadData()) {
                throw new Error('Failed to load data');
            }

            // Step 2: Run dispersion simulation
            console.log('Running dispersion simulation...');
            const dispersionModel = createDispersionModel();
            if (!dispersionModel.loadData()) {
                throw new Error('Failed to load dispersion model');
            }

            const dispersionSuccess = dispersionModel.simulateDispersion(
                scenarioConfig.dispersion?.steps || 20,
                scenarioConfig.dispersion?.wind || { speed: 5, direction: 'NE' },
                year
            );

            if (!dispersionSuccess) {
                throw new Error('Dispersion simulation failed');
            }

            // Step 3: Run capture simulation
            console.log('Running capture simulation...');
            const captureSimulation = createCaptureSimulation();
            if (!captureSimulation.loadData()) {
                throw new Error('Failed to load capture simulation');
            }

            const captureSuccess = captureSimulation.simulateCaptureScenario(scenarioConfig, year);
            if (!captureSuccess) {
                throw new Error('Capture simulation failed');
            }

            // Step 4: Store scenario results
            const scenarioResults = {
                name: scenarioConfig.name,
                year: year,
                timestamp: new Date().toISOString(),
                dispersion: {
                    steps: scenarioConfig.dispersion?.steps || 20,
                    wind: scenarioConfig.dispersion?.wind || { speed: 5, direction: 'NE' }
                },
                capture: {
                    config: scenarioConfig,
                    results: captureSimulation.getCaptureResults(year),
                    summary: captureSimulation.getScenarioSummary(scenarioConfig.name, year)
                },
                raw_data: this.currentData[year]
            };

            this.scenarios.set(scenarioConfig.name, scenarioResults);
            
            console.log(`Scenario ${scenarioConfig.name} completed successfully`);
            return scenarioResults;

        } catch (error) {
            console.error(`Error running workflow for ${scenarioConfig.name}:`, error);
            return null;
        }
    }

    // Run multiple scenarios for comparison
    async runMultipleScenarios(scenarioConfigs, year = '2025') {
        console.log(`Running ${scenarioConfigs.length} scenarios for comparison...`);
        
        const results = [];
        
        for (const config of scenarioConfigs) {
            const result = await this.runCompleteWorkflow(config, year);
            if (result) {
                results.push(result);
            }
        }

        return results;
    }

    // Compare scenarios
    compareScenarios(scenarioNames, year = '2025') {
        const comparisons = [];
        
        for (const scenarioName of scenarioNames) {
            const scenario = this.scenarios.get(scenarioName);
            if (scenario && scenario.capture?.summary) {
                comparisons.push(scenario.capture.summary);
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
                Math.round((comparisons[0].percent_reduction - comparisons[comparisons.length - 1].percent_reduction) * 100) / 100 : 0,
            comparison_metrics: this.calculateComparisonMetrics(comparisons)
        };
    }

    // Calculate detailed comparison metrics
    calculateComparisonMetrics(scenarios) {
        if (scenarios.length < 2) return null;

        const metrics = {
            co2_reduction_range: {
                min: Math.min(...scenarios.map(s => s.percent_reduction)),
                max: Math.max(...scenarios.map(s => s.percent_reduction)),
                range: Math.max(...scenarios.map(s => s.percent_reduction)) - Math.min(...scenarios.map(s => s.percent_reduction))
            },
            capture_efficiency: scenarios.map(s => ({
                scenario: s.scenario_name,
                capture_per_unit: s.total_capture / s.total_districts,
                efficiency_score: s.percent_reduction / (s.total_capture / 1000) // Normalized efficiency
            })),
            district_performance: this.analyzeDistrictPerformance(scenarios)
        };

        return metrics;
    }

    // Analyze district performance across scenarios
    analyzeDistrictPerformance(scenarios) {
        const districtAnalysis = new Map();

        scenarios.forEach(scenario => {
            if (scenario.scenarios) {
                scenario.scenarios.forEach(district => {
                    if (!districtAnalysis.has(district.district)) {
                        districtAnalysis.set(district.district, []);
                    }
                    districtAnalysis.get(district.district).push({
                        scenario: scenario.scenario_name,
                        reduction: district.reduction,
                        capture: district.capture
                    });
                });
            }
        });

        const results = [];
        for (const [district, performances] of districtAnalysis) {
            const avgReduction = performances.reduce((sum, p) => sum + p.reduction, 0) / performances.length;
            const maxReduction = Math.max(...performances.map(p => p.reduction));
            const minReduction = Math.min(...performances.map(p => p.reduction));

            results.push({
                district,
                average_reduction: Math.round(avgReduction * 100) / 100,
                max_reduction: Math.round(maxReduction * 100) / 100,
                min_reduction: Math.round(minReduction * 100) / 100,
                consistency: Math.round((1 - (maxReduction - minReduction) / maxReduction) * 100 * 100) / 100
            });
        }

        return results.sort((a, b) => b.average_reduction - a.average_reduction);
    }

    // Generate visualization data
    generateVisualizationData(scenarioNames, year = '2025') {
        const scenarios = scenarioNames.map(name => this.scenarios.get(name)).filter(s => s);
        
        if (scenarios.length === 0) return null;

        return {
            heatmap_data: this.generateHeatmapData(scenarios, year),
            chart_data: this.generateChartData(scenarios),
            timeline_data: this.generateTimelineData(scenarios),
            district_breakdown: this.generateDistrictBreakdown(scenarios)
        };
    }

    // Generate heatmap data for map visualization
    generateHeatmapData(scenarios, year) {
        const heatmapData = [];
        
        scenarios.forEach(scenario => {
            if (scenario.capture?.results) {
                scenario.capture.results.forEach(district => {
                    heatmapData.push({
                        district: district.district,
                        scenario: scenario.name,
                        co2_before: district.co2_before_capture,
                        co2_after: district.co2_after_capture,
                        reduction: district.percent_reduction,
                        lat: this.getDistrictCoordinates(district.district).lat,
                        lng: this.getDistrictCoordinates(district.district).lng
                    });
                });
            }
        });

        return heatmapData;
    }

    // Generate chart data for various visualizations
    generateChartData(scenarios) {
        const chartData = {
            bar_chart: {
                labels: scenarios.map(s => s.name),
                datasets: [
                    {
                        label: 'Total CO₂ Before',
                        data: scenarios.map(s => s.capture?.summary?.total_CO2_before || 0),
                        backgroundColor: 'rgba(255, 99, 132, 0.6)'
                    },
                    {
                        label: 'Total CO₂ After',
                        data: scenarios.map(s => s.capture?.summary?.total_CO2_after || 0),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)'
                    },
                    {
                        label: 'Total Capture',
                        data: scenarios.map(s => s.capture?.summary?.total_capture || 0),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)'
                    }
                ]
            },
            pie_chart: {
                labels: ['CO₂ Remaining', 'CO₂ Captured'],
                data: scenarios.map(s => [
                    s.capture?.summary?.total_CO2_after || 0,
                    s.capture?.summary?.total_capture || 0
                ])
            },
            line_chart: this.generateLineChartData(scenarios)
        };

        return chartData;
    }

    // Generate line chart data for time series
    generateLineChartData(scenarios) {
        const datasets = scenarios.map((scenario, index) => ({
            label: scenario.name,
            data: scenario.capture?.results?.map(d => d.percent_reduction) || [],
            borderColor: `hsl(${index * 360 / scenarios.length}, 70%, 50%)`,
            backgroundColor: `hsla(${index * 360 / scenarios.length}, 70%, 50%, 0.1)`,
            fill: false
        }));

        return {
            labels: scenarios[0]?.capture?.results?.map(d => d.district) || [],
            datasets
        };
    }

    // Generate timeline data for animation
    generateTimelineData(scenarios) {
        return scenarios.map(scenario => ({
            scenario: scenario.name,
            timestamp: scenario.timestamp,
            steps: scenario.dispersion?.steps || 0,
            wind: scenario.dispersion?.wind || {},
            total_capture: scenario.capture?.summary?.total_capture || 0,
            percent_reduction: scenario.capture?.summary?.percent_reduction || 0
        }));
    }

    // Generate district breakdown data
    generateDistrictBreakdown(scenarios) {
        const districtData = new Map();

        scenarios.forEach(scenario => {
            if (scenario.capture?.results) {
                scenario.capture.results.forEach(district => {
                    if (!districtData.has(district.district)) {
                        districtData.set(district.district, []);
                    }
                    districtData.get(district.district).push({
                        scenario: scenario.name,
                        co2_before: district.co2_before_capture,
                        co2_after: district.co2_after_capture,
                        reduction: district.percent_reduction,
                        interventions: district.interventions
                    });
                });
            }
        });

        return Array.from(districtData.entries()).map(([district, data]) => ({
            district,
            scenarios: data,
            average_reduction: data.reduce((sum, d) => sum + d.reduction, 0) / data.length,
            best_scenario: data.reduce((best, current) => 
                current.reduction > best.reduction ? current : best
            )
        }));
    }

    // Get district coordinates (mock data - in real implementation, use actual coordinates)
    getDistrictCoordinates(district) {
        // Mock coordinates - replace with actual district coordinates
        const mockCoords = {
            'Bengaluru Urban': { lat: 12.9716, lng: 77.5946 },
            'Bangalore North': { lat: 13.0827, lng: 77.6303 },
            'Bangalore East': { lat: 12.9716, lng: 77.6401 },
            'Bangalore South': { lat: 12.9141, lng: 77.6101 },
            'Anekal': { lat: 12.7081, lng: 77.7001 }
        };
        
        return mockCoords[district] || { lat: 12.9716, lng: 77.5946 };
    }

    // Export scenario data
    exportScenarioData(scenarioName, format = 'json') {
        const scenario = this.scenarios.get(scenarioName);
        if (!scenario) return null;

        if (format === 'json') {
            return JSON.stringify(scenario, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(scenario);
        }

        return null;
    }

    // Convert scenario data to CSV
    convertToCSV(scenario) {
        if (!scenario.capture?.results) return '';

        const headers = ['District', 'CO2 Before', 'CO2 After', 'Total Capture', 'Percent Reduction', 'Trees Planted', 'Vertical Gardens', 'Capture Units'];
        const rows = scenario.capture.results.map(district => [
            district.district,
            district.co2_before_capture,
            district.co2_after_capture,
            district.total_capture,
            district.percent_reduction,
            district.interventions.trees_planted,
            district.interventions.vertical_gardens,
            district.interventions.capture_units
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // Get all available scenarios
    getAvailableScenarios() {
        return Array.from(this.scenarios.keys());
    }

    // Clear all scenarios
    clearScenarios() {
        this.scenarios.clear();
    }

    // Get scenario summary
    getScenarioSummary(scenarioName) {
        const scenario = this.scenarios.get(scenarioName);
        return scenario ? scenario.capture?.summary : null;
    }
}

// Convenience functions
function createDashboard() {
    return new Dashboard();
}

async function runScenarioComparison(scenarioNames, year = '2025') {
    const dashboard = createDashboard();
    
    if (!dashboard.loadData()) {
        console.error('Failed to load data');
        return null;
    }

    const scenarios = scenarioNames.map(name => PREDEFINED_SCENARIOS[name] || { name });
    const results = await dashboard.runMultipleScenarios(scenarios, year);
    
    if (results.length > 0) {
        const comparison = dashboard.compareScenarios(scenarioNames, year);
        const visualization = dashboard.generateVisualizationData(scenarioNames, year);
        
        return {
            scenarios: results,
            comparison,
            visualization
        };
    }
    
    return null;
}

// Export for use in other modules
module.exports = {
    Dashboard,
    createDashboard,
    runScenarioComparison,
    PREDEFINED_SCENARIOS
};

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    const scenarioNames = args.length > 0 ? args : ['baseline', 'tree_planting', 'mixed_strategy'];
    
    console.log(`Running scenario comparison: ${scenarioNames.join(', ')}`);
    runScenarioComparison(scenarioNames)
        .then(results => {
            if (results) {
                console.log('\nComparison Results:');
                console.log(JSON.stringify(results.comparison, null, 2));
            } else {
                console.log('No results generated');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}