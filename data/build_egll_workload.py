import pandas as pd

FLIGHTS = "data/processed/egll_flights_july2026.parquet"
EVENTS = "data/processed/egll_runway_events_july2026.parquet"

flights = pd.read_parquet(FLIGHTS)
events = pd.read_parquet(EVENTS)

# Keep the flight information we need
flight_info = flights[
    [
        "id",
        "icao24",
        "flt_id",
        "adep",
        "ades",
        "registration",
        "model",
        "typecode",
        "icao_aircraft_class",
        "icao_operator",
    ]
].copy()

# Rename flight ID so the merge is clear
flight_info = flight_info.rename(columns={"id": "flight_id"})

# Merge flight metadata with runway events
workload = events.merge(
    flight_info,
    on="flight_id",
    how="left"
)

# Determine whether this is an EGLL departure or arrival
workload["operation"] = workload.apply(
    lambda row:
        "departure" if row["adep"] == "EGLL"
        else "arrival" if row["ades"] == "EGLL"
        else "unknown",
    axis=1
)

# Sort chronologically
workload["event_time"] = pd.to_datetime(workload["event_time"])
workload = workload.sort_values("event_time")

print("========== WORKLOAD ==========")
print("Rows:", len(workload))
print("Unique flights:", workload["flight_id"].nunique())

print("\nOperations:")
print(workload["operation"].value_counts())

print("\nRunways:")
print(workload["runway"].value_counts(dropna=False))

print("\nSample:")
print(
    workload[
        [
            "flight_id",
            "flt_id",
            "operation",
            "adep",
            "ades",
            "type",
            "event_time",
            "runway",
            "time_in_use_s",
            "typecode",
            "icao_aircraft_class",
        ]
    ].head(20).to_string(index=False)
)