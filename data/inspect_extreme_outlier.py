import pandas as pd

file_path = "data/processed/egll_workload_july2026.parquet"

df = pd.read_parquet(file_path)

outlier = df[df["observed_occupancy_sec"] > 1800].copy()

print("========== EXTREME OUTLIERS ==========")

print(
    outlier[
        [
            "flight_id",
            "flt_id",
            "icao24",
            "operation",
            "runway",
            "entry_time",
            "exit_time",
            "observed_occupancy_sec",
            "entry_time_in_use_s",
            "model",
            "typecode"
        ]
    ].to_string(index=False)
)

print("\n========== ALL OPERATIONS FOR SAME FLIGHT ==========")

flight_ids = outlier["flight_id"].tolist()

same_flight = df[df["flight_id"].isin(flight_ids)]

print(
    same_flight.to_string(index=False)
)