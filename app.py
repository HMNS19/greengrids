from flask import Flask, render_template, request, jsonify
import json
import os
import subprocess
import sys

app = Flask(__name__)

# Load emission and dispersion modules
def load_emission_data():
    try:
        # Import the Python emission functions
        from emission_utils import get_emission_by_district, get_all_districts_emission_data
        return get_emission_by_district, get_all_districts_emission_data
    except Exception as e:
        print(f"Error loading emission data: {e}")
        return None, None

def load_dispersion_model():
    try:
        # Import the Python dispersion utilities
        from dispersion_utils import run_dispersion_simulation, get_dispersion_results
        return run_dispersion_simulation, get_dispersion_results
    except Exception as e:
        print(f"Error loading dispersion model: {e}")
        return None, None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/map')
def map():
    return render_template('map2.html')

@app.route('/funding')
def funding():
    return render_template('funding.html')


@app.route('/news')
def news():
    return render_template('news.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

# API endpoints for emission data
@app.route('/api/emissions/district/<district_name>')
def get_district_emissions(district_name):
    try:
        getEmissionByDistrict, _ = load_emission_data()
        if not getEmissionByDistrict:
            return jsonify({'error': 'Emission data module not available'}), 500
        
        year = request.args.get('year', '2025')
        emission_data = getEmissionByDistrict(district_name, year)
        
        if not emission_data:
            return jsonify({'error': 'District not found'}), 404
        
        return jsonify(emission_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/emissions/all')
def get_all_emissions():
    try:
        _, getAllDistrictsEmissionData = load_emission_data()
        if not getAllDistrictsEmissionData:
            return jsonify({'error': 'Emission data module not available'}), 500
        
        year = request.args.get('year', '2025')
        all_emissions = getAllDistrictsEmissionData(year)
        
        return jsonify({
            'year': year,
            'districts': all_emissions,
            'total_districts': len(all_emissions)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API endpoints for dispersion simulation
@app.route('/api/dispersion/simulate', methods=['POST'])
def simulate_dispersion():
    try:
        run_dispersion_simulation, _ = load_dispersion_model()
        if not run_dispersion_simulation:
            return jsonify({'error': 'Dispersion model not available'}), 500
        
        data = request.get_json()
        steps = data.get('steps', 20)
        wind_speed = data.get('wind_speed', 5)
        wind_direction = data.get('wind_direction', 'NE')
        year = data.get('year', '2025')
        
        # Run dispersion simulation
        result = run_dispersion_simulation(steps, wind_speed, wind_direction, year)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 500
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dispersion/results')
def get_dispersion_results():
    try:
        _, get_dispersion_results = load_dispersion_model()
        if not get_dispersion_results:
            return jsonify({'error': 'Dispersion model not available'}), 500
        
        year = request.args.get('year', '2025')
        
        # Get results
        results = get_dispersion_results(year)
        
        return jsonify({
            'year': year,
            'results': results,
            'total_districts': len(results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# New route for emission visualization page
@app.route('/emissions')
def emissions():
    return render_template('emissions.html')

# New route for scenario comparison dashboard
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

# API endpoints for capture simulation
@app.route('/api/capture/simulate', methods=['POST'])
def simulate_capture():
    try:
        from dispersion_utils import run_capture_simulation
        
        data = request.get_json()
        scenario_name = data.get('scenario_name', 'custom')
        year = data.get('year', '2025')
        interventions = data.get('interventions', {})
        
        # Run capture simulation
        result = run_capture_simulation(scenario_name, year)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 500
        
        return jsonify({
            'success': True,
            'scenario_name': scenario_name,
            'year': year,
            'message': 'Capture simulation completed successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/capture/results/<scenario_name>')
def get_capture_results(scenario_name):
    try:
        from dispersion_utils import get_capture_results
        
        year = request.args.get('year', '2025')
        
        # Get results
        results = get_capture_results(year)
        
        return jsonify({
            'scenario_name': scenario_name,
            'year': year,
            'results': results,
            'total_districts': len(results)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API endpoints for complete workflow
@app.route('/api/workflow/run', methods=['POST'])
def run_complete_workflow():
    try:
        from dispersion_utils import run_complete_workflow
        
        data = request.get_json()
        scenario_name = data.get('scenario_name', 'custom')
        year = data.get('year', '2025')
        dispersion_config = data.get('dispersion', {})
        capture_config = data.get('capture', {})
        
        # Run complete workflow
        result = run_complete_workflow(scenario_name, year, dispersion_config, capture_config)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 500
        
        return jsonify({
            'success': True,
            'scenario_name': scenario_name,
            'year': year,
            'message': 'Complete workflow executed successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/workflow/compare', methods=['POST'])
def compare_scenarios():
    try:
        from dispersion_utils import compare_scenarios
        
        data = request.get_json()
        scenario_names = data.get('scenario_names', ['baseline', 'tree_planting'])
        year = data.get('year', '2025')
        
        # Run scenario comparison
        result = compare_scenarios(scenario_names, year)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 500
        
        return jsonify({
            'success': True,
            'scenario_names': scenario_names,
            'year': year,
            'message': 'Scenario comparison completed successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
