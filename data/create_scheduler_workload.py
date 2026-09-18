import pandas as pd

# Input file
input_file = "data/processed/egll_workload_july2026.parquet"

# Output file
output_file = "data/processed/egll_scheduler_workload_july2026.parquet"

# Load final workload
df = pd.read_parquet(input_file)

print("========== CREATING SCHEDULER WORKLOAD ==========")

# Select only the fields useful for scheduling
scheduler_df = df[
    [
        "flight_id",
        "flt_id",
        "icao24",
        "operation",
        "runway",
        "entry_time",
        "exit_time",
        "observed_occupancy_sec",
        "typecode",
        "icao_aircraft_class",
        "icao_operator",
    ]
].copy()

# Rename occupancy column to a simpler name
scheduler_df = scheduler_df.rename(
    columns={
        "observed_occupancy_sec": "occupancy_sec",
        "typecode": "aircraft_type",
        "icao_aircraft_class": "aircraft_class",
        "icao_operator": "operator",
    }
)

# Sort chronologically
scheduler_df = scheduler_df.sort_values("entry_time").reset_index(drop=True)

# Save
scheduler_df.to_parquet(output_file, index=False)

print("Rows:", len(scheduler_df))
print("Columns:", len(scheduler_df.columns))

print("\n========== COLUMNS ==========")
print(scheduler_df.columns.tolist())

print("\n========== OPERATIONS ==========")
print(scheduler_df["operation"].value_counts())

print("\n========== RUNWAYS ==========")
print(scheduler_df["runway"].value_counts())

print("\n========== FIRST 10 ROWS ==========")
print(scheduler_df.head(10).to_string(index=False))

print("\nSaved to:")
print(output_file)