import pandas as pd
import numpy as np

events_file = "data/processed/egll_runway_events_july2026.parquet"
runways_file = "data/raw/runways.csv"

events = pd.read_parquet(events_file)
runways = pd.read_csv(runways_file)

# Treat "nan" as missing
events["runway"] = events["runway"].replace("nan", pd.NA)

# Only the two unnamed OSM runway IDs
target_ids = [510279283, 1252338026]

missing = events[
    events["runway_id"].isin(target_ids)
].copy()

print("========== MISSING OSM RUNWAY LOCATIONS ==========")

for runway_id in target_ids:

    rows = missing[missing["runway_id"] == runway_id]

    print("\n----------------------------------------")
    print("OSM runway ID:", runway_id)
    print("Events:", len(rows))
    print("Flights:", rows["flight_id"].nunique())

    print("Latitude:")
    print("  Mean:", rows["latitude"].mean())
    print("  Median:", rows["latitude"].median())

    print("Longitude:")
    print("  Mean:", rows["longitude"].mean())
    print("  Median:", rows["longitude"].median())


# Get the two EGLL physical runways
egll = runways[runways["airport_ident"] == "EGLL"].copy()

print("\n\n========== EGLL RUNWAY LOCATIONS ==========")

for _, r in egll.iterrows():

    center_lat = (
        r["le_latitude_deg"] + r["he_latitude_deg"]
    ) / 2

    center_lon = (
        r["le_longitude_deg"] + r["he_longitude_deg"]
    ) / 2

    print(
        f"\nRunway: {r['le_ident']}/{r['he_ident']}"
    )
    print("ID:", r["id"])
    print("Center latitude:", center_lat)
    print("Center longitude:", center_lon)


# Compare distance between the average event location
# and the center of each physical runway.
print("\n\n========== DISTANCE COMPARISON ==========")

for runway_id in target_ids:

    rows = missing[missing["runway_id"] == runway_id]

    event_lat = rows["latitude"].mean()
    event_lon = rows["longitude"].mean()

    print(f"\nOSM ID: {runway_id}")

    for _, r in egll.iterrows():

        center_lat = (
            r["le_latitude_deg"] + r["he_latitude_deg"]
        ) / 2

        center_lon = (
            r["le_longitude_deg"] + r["he_longitude_deg"]
        ) / 2

        # Approximate distance in km
        lat_km = (event_lat - center_lat) * 111
        lon_km = (
            (event_lon - center_lon)
            * 111
            * np.cos(np.radians(center_lat))
        )

        distance = np.sqrt(lat_km**2 + lon_km**2)

        print(
            f"  {r['le_ident']}/{r['he_ident']}: "
            f"{distance:.3f} km"
        )