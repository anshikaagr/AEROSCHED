import pandas as pd

file_path = "data/raw/flight_list_202607.parquet"

df = pd.read_parquet(file_path)

airport = "EGLL"

departures = df[df["adep"] == airport]
arrivals = df[df["ades"] == airport]

print(f"========== {airport} ==========")

print("\nDepartures:", len(departures))
print("Arrivals:", len(arrivals))

print("\nUnique aircraft:", departures["icao24"].nunique())

print("\nAircraft classes:")
print(departures["icao_aircraft_class"].value_counts(dropna=False))

print("\nAircraft types:")
print(departures["typecode"].value_counts(dropna=False).head(15))

print("\nMissing values in departures:")
print(departures.isnull().sum())