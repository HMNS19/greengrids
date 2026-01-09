import csv
import json
import urllib.parse
import urllib.request
import time
from datetime import datetime, timezone

API_KEY = "d6d2e55f10031a5ac76118baa137ee15"
HISTORY_URL = "https://api.openweathermap.org/data/2.5/air_pollution/history"

INPUT_CSV = "locations_with_coords.csv"
OUTPUT_CSV = "historical_yearly_aqi.csv"

# OpenWeather air pollution history realistically starts ~late 2020
START_YEAR = 2020
END_YEAR = datetime.now(tz=timezone.utc).year

results = []

def unix_ts(year, month, day):
    return int(datetime(year, month, day, tzinfo=timezone.utc).timestamp())

with open(INPUT_CSV, newline="", encoding="utf-8") as csvfile:
    reader = csv.DictReader(csvfile)

    for row in reader:
        area = (
            row.get("area")
            or row.get("Area")
            or row.get("location")
            or row.get("Location")
            or row.get("name")
            or row.get("Name")
        )

        lat = (
            row.get("latitude")
            or row.get("Latitude")
            or row.get("lat")
            or row.get("Lat")
        )

        lon = (
            row.get("longitude")
            or row.get("Longitude")
            or row.get("lon")
            or row.get("lng")
            or row.get("Lng")
        )

        if not area or not lat or not lon:
            print("❌ Skipping row:", row)
            continue

        print(f"\n📍 Processing area: {area}")

        for year in range(START_YEAR, END_YEAR + 1):
            start_ts = unix_ts(year, 1, 1)
            end_ts = unix_ts(year, 12, 31)

            params = {
                "lat": lat,
                "lon": lon,
                "start": start_ts,
                "end": end_ts,
                "appid": API_KEY
            }

            url = HISTORY_URL + "?" + urllib.parse.urlencode(params)

            try:
                with urllib.request.urlopen(url, timeout=30) as response:
                    data = json.loads(response.read().decode())

                if "list" not in data or not data["list"]:
                    print(f"  ⚠ No data for {area} in {year}")
                    continue

                acc = {
                    "aqi": [],
                    "pm2_5": [],
                    "pm10": [],
                    "no2": [],
                    "o3": [],
                    "co": []
                }

                for entry in data["list"]:
                    acc["aqi"].append(entry["main"]["aqi"])
                    acc["pm2_5"].append(entry["components"]["pm2_5"])
                    acc["pm10"].append(entry["components"]["pm10"])
                    acc["no2"].append(entry["components"]["no2"])
                    acc["o3"].append(entry["components"]["o3"])
                    acc["co"].append(entry["components"]["co"])

                results.append({
                    "area": area,
                    "year": year,
                    "latitude": lat,
                    "longitude": lon,
                    "aqi_openweather_avg": round(sum(acc["aqi"]) / len(acc["aqi"]), 2),
                    "pm2_5_avg": round(sum(acc["pm2_5"]) / len(acc["pm2_5"]), 2),
                    "pm10_avg": round(sum(acc["pm10"]) / len(acc["pm10"]), 2),
                    "no2_avg": round(sum(acc["no2"]) / len(acc["no2"]), 2),
                    "o3_avg": round(sum(acc["o3"]) / len(acc["o3"]), 2),
                    "co_avg": round(sum(acc["co"]) / len(acc["co"]), 2)
                })

                print(f"  ✔ Year {year} done")

            except Exception as e:
                print(f"  ❌ Failed {area} {year}:", e)

            time.sleep(1)  # VERY important for free tier

# Write output
if results:
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    print("\nDONE")
    print("Saved:", OUTPUT_CSV)
else:
    print("\nNo yearly data collected.")
