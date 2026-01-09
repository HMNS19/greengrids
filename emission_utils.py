import json
import os
import random
from typing import Dict, List, Optional, Any

# Configuration for emission generation
EMISSION_CONFIG = {
    "urban": {
        "transport": {"min": 1500, "max": 3000},
        "industrial": {"min": 2000, "max": 5000},
        "residential": {"min": 800, "max": 1500}
    },
    "rural": {
        "transport": {"min": 200, "max": 800},
        "industrial": {"min": 100, "max": 1000},
        "residential": {"min": 1000, "max": 2500}
    },
    "suburban": {
        "transport": {"min": 800, "max": 1800},
        "industrial": {"min": 500, "max": 2000},
        "residential": {"min": 900, "max": 1800}
    }
}

# District classification for realistic emission distribution
DISTRICT_TYPES = {
    # Urban districts
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
    
    # Suburban areas
    'Hosakote': 'suburban',
    'Devanahalli': 'suburban',
    'Doddaballapura': 'suburban',
    'Nelmangala': 'suburban',
    'Ramanagara': 'suburban',
    'Chikkaballapura': 'suburban',
    'Kolar': 'suburban',
    'Tumakuru': 'suburban',
    
    # Rural areas (default for unclassified districts)
    'default': 'rural'
}

def get_random_emission(district_type: str) -> Dict[str, float]:
    """Generate random emission data for a district type."""
    config = EMISSION_CONFIG[district_type]
    return {
        "transport_emission": round(random.uniform(config["transport"]["min"], config["transport"]["max"]), 2),
        "industrial_emission": round(random.uniform(config["industrial"]["min"], config["industrial"]["max"]), 2),
        "residential_emission": round(random.uniform(config["residential"]["min"], config["residential"]["max"]), 2)
    }

def load_emission_data(file_path: str = None) -> Dict[str, Any]:
    """Load emission data from JSON file."""
    if file_path is None:
        file_path = os.path.join(os.path.dirname(__file__), 'static', 'data', 'bengaluru_area_temperatures.json')
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading data: {e}")
        return {}

def save_emission_data(data: Dict[str, Any], file_path: str = None) -> bool:
    """Save emission data to JSON file."""
    if file_path is None:
        file_path = os.path.join(os.path.dirname(__file__), 'static', 'data', 'bengaluru_area_temperatures.json')
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving data: {e}")
        return False

def get_emission_by_district(district_name: str, year: str = '2025') -> Optional[Dict[str, Any]]:
    """Get emission data for a specific district."""
    try:
        data = load_emission_data()
        
        if year not in data or district_name not in data[year]:
            return None
        
        district_data = data[year][district_name]
        
        if 'total_emission' not in district_data:
            return None
        
        return {
            "district": district_name,
            "year": year,
            "transport_emission": district_data.get("transport_emission", 0),
            "industrial_emission": district_data.get("industrial_emission", 0),
            "residential_emission": district_data.get("residential_emission", 0),
            "total_emission": district_data.get("total_emission", 0),
            "breakdown": {
                "transport_percentage": round((district_data.get("transport_emission", 0) / district_data.get("total_emission", 1)) * 100, 2),
                "industrial_percentage": round((district_data.get("industrial_emission", 0) / district_data.get("total_emission", 1)) * 100, 2),
                "residential_percentage": round((district_data.get("residential_emission", 0) / district_data.get("total_emission", 1)) * 100, 2)
            }
        }
    except Exception as e:
        print(f"Error getting emission data: {e}")
        return None

def get_all_districts_emission_data(year: str = '2025') -> List[Dict[str, Any]]:
    """Get emission data for all districts."""
    try:
        data = load_emission_data()
        
        if year not in data:
            return []
        
        districts = []
        for district_name in data[year]:
            if district_name == 'timestamp':
                continue
            
            emission_data = get_emission_by_district(district_name, year)
            if emission_data:
                districts.append(emission_data)
        
        return districts
    except Exception as e:
        print(f"Error getting all districts emission data: {e}")
        return []

def add_emission_data_to_json() -> bool:
    """Add emission data to the existing JSON file."""
    try:
        data = load_emission_data()
        
        for year in data:
            for district in data[year]:
                if district == 'timestamp':
                    continue
                
                # Check if emission data already exists
                if 'total_emission' in data[year][district]:
                    continue
                
                district_type = DISTRICT_TYPES.get(district, DISTRICT_TYPES['default'])
                emissions = get_random_emission(district_type)
                
                # Calculate total emission
                total_emission = sum(emissions.values())
                
                # Add emission data to the district
                data[year][district].update(emissions)
                data[year][district]['total_emission'] = round(total_emission, 2)
        
        return save_emission_data(data)
    except Exception as e:
        print(f"Error adding emission data: {e}")
        return False

# Initialize emission data if not present
if __name__ == "__main__":
    print("Adding emission data to JSON...")
    if add_emission_data_to_json():
        print("Emission data added successfully!")
    else:
        print("Failed to add emission data.")