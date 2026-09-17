import pandas as pd

flight_file = "data/raw/flight_list_202607.parquet"

df = pd.read_parquet(flight_file)

# Flights departing from EGLL
egll_departures = df[df["adep"] == "EGLL"].copy()

# Flights arriving at EGLL
egll_arrivals = df[df["ades"] == "EGLL"].copy()

# Combine both
egll_flights = pd.concat(
    [egll_departures, egll_arrivals]
).drop_duplicates(subset=["id"])

print("EGLL departures:", len(egll_departures))
print("EGLL arrivals:", len(egll_arrivals))
print("Unique EGLL flights:", len(egll_flights))

# Save only the relevant flights
output_file = "data/processed/egll_flights_july2026.parquet"

egll_flights.to_parquet(output_file, index=False)

print("\nSaved:", output_file)