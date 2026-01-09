import json
import os
import subprocess
import sys
from typing import Dict, List, Optional, Any

def run_dispersion_simulation(steps: int = 20, wind_speed: float = 5, wind_direction: str = 'NE', year: str = '2025') -> Dict[str, Any]:
    """Run dispersion simulation using Node.js module."""
    try:
        # Get the directory of the current script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Run the dispersion simulation
        result = subprocess.run([
            'node', 'dispersionModel.js', str(steps), str(wind_speed), wind_direction
        ], capture_output=True, text=True, cwd=script_dir)
        
        if result.returncode != 0:
            return {'error': f'Dispersion simulation failed: {result.stderr}'}
        
        # Load the updated data
        data_path = os.path.join(script_dir, 'static', 'data', 'bengaluru_area_temperatures.json')
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract results
        results = []
        if year in data:
            for district_name, district_data in data[year].items():
                if district_name == 'timestamp':
                    continue
                
                results.append({
                    'district': district_name,
                    'year': year,
                    'initial_concentration': district_data.get('co2_concentration', 0),
                    'final_concentration': district_data.get('co2_concentration_after_dispersion', 0),
                    'total_emission': district_data.get('total_emission', 0),
                    'neighbors': []  # Would need to be calculated separately
                })
        
        return {
            'success': True,
            'simulation_params': {
                'steps': steps,
                'wind': {'speed': wind_speed, 'direction': wind_direction},
                'year': year
            },
            'results': results,
            'total_districts': len(results)
        }
        
    except Exception as e:
        return {'error': f'Error running dispersion simulation: {str(e)}'}

def get_dispersion_results(year: str = '2025') -> List[Dict[str, Any]]:
    """Get dispersion results from the JSON file."""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(script_dir, 'static', 'data', 'bengaluru_area_temperatures.json')
        
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        results = []
        if year in data:
            for district_name, district_data in data[year].items():
                if district_name == 'timestamp':
                    continue
                
                results.append({
                    'district': district_name,
                    'year': year,
                    'initial_concentration': district_data.get('co2_concentration', 0),
                    'final_concentration': district_data.get('co2_concentration_after_dispersion', 0),
                    'total_emission': district_data.get('total_emission', 0),
                    'neighbors': []
                })
        
        return results
        
    except Exception as e:
        print(f'Error getting dispersion results: {e}')
        return []

def run_capture_simulation(scenario_name: str, year: str = '2025') -> Dict[str, Any]:
    """Run capture simulation using Node.js module."""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        result = subprocess.run([
            'node', 'captureSimulation.js', scenario_name, year
        ], capture_output=True, text=True, cwd=script_dir)
        
        if result.returncode != 0:
            return {'error': f'Capture simulation failed: {result.stderr}'}
        
        return {'success': True, 'scenario_name': scenario_name, 'year': year}
        
    except Exception as e:
        return {'error': f'Error running capture simulation: {str(e)}'}

def get_capture_results(year: str = '2025') -> List[Dict[str, Any]]:
    """Get capture results from the JSON file."""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(script_dir, 'static', 'data', 'bengaluru_area_temperatures.json')
        
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        results = []
        if year in data:
            for district_name, district_data in data[year].items():
                if district_name == 'timestamp':
                    continue
                
                results.append({
                    'district': district_name,
                    'year': year,
                    'co2_before_capture': district_data.get('co2_before_capture', 0),
                    'co2_after_capture': district_data.get('co2_after_capture', 0),
                    'total_capture': district_data.get('total_capture', 0),
                    'percent_reduction': district_data.get('percent_reduction', 0),
                    'interventions': district_data.get('interventions', {}),
                    'total_emission': district_data.get('total_emission', 0)
                })
        
        return results
        
    except Exception as e:
        print(f'Error getting capture results: {e}')
        return []

def run_complete_workflow(scenario_name: str, year: str = '2025', dispersion_config: Dict = None, capture_config: Dict = None) -> Dict[str, Any]:
    """Run complete workflow: Emission → Dispersion → Capture."""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Run the complete workflow using Node.js
        result = subprocess.run([
            'node', 'dashboard.js', scenario_name, year
        ], capture_output=True, text=True, cwd=script_dir)
        
        if result.returncode != 0:
            return {'error': f'Complete workflow failed: {result.stderr}'}
        
        return {'success': True, 'scenario_name': scenario_name, 'year': year}
        
    except Exception as e:
        return {'error': f'Error running complete workflow: {str(e)}'}

def compare_scenarios(scenario_names: List[str], year: str = '2025') -> Dict[str, Any]:
    """Compare multiple scenarios."""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Run scenario comparison using Node.js
        result = subprocess.run([
            'node', 'dashboard.js', *scenario_names
        ], capture_output=True, text=True, cwd=script_dir)
        
        if result.returncode != 0:
            return {'error': f'Scenario comparison failed: {result.stderr}'}
        
        return {'success': True, 'scenario_names': scenario_names, 'year': year}
        
    except Exception as e:
        return {'error': f'Error comparing scenarios: {str(e)}'}

if __name__ == "__main__":
    # Test the functions
    print("Testing dispersion simulation...")
    result = run_dispersion_simulation(10, 8, 'NE', '2025')
    print(f"Dispersion result: {result.get('success', False)}")
    
    print("Testing capture simulation...")
    result = run_capture_simulation('tree_planting', '2025')
    print(f"Capture result: {result.get('success', False)}")