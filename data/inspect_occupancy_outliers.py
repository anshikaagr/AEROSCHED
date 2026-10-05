import pandas as pd

file_path = "data/processed/egll_workload_july2026.parquet"

df = pd.read_parquet(file_path)

print("========== OCCUPANCY OUTLIERS ==========")

outliers = (
    df[df["observed_occupancy_sec"] > 300]
    .sort_values("observed_occupancy_sec", ascending=False)
)

print("Operations > 5 minutes:", len(outliers))

print("\nTop 30 longest operations:")

columns = [
    "flight_id",
    "flt_id",
    "operation",
    "runway",
    "entry_time",
    "exit_time",
    "observed_occupancy_sec",
    "model",
    "typecode"
]

print(
    outliers[columns]
    .head(30)
    .to_string(index=False)
)