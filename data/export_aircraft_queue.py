import pandas as pd
import json
from pathlib import Path

INPUT_FILE = Path("data/processed/egll_scheduler_workload_july2026.parquet")
OUTPUT_FILE = Path("dashboard/public/aircraft_queue.json")

# Load scheduler-ready workload
df = pd.read_parquet(INPUT_FILE)

# Select only the fields needed by the dashboard
queue = df[
    [
        "flight_id",
        "flt_id",
        "icao24",
        "operation",
        "runway",
        "entry_time",
        "exit_time",
        "occupancy_sec",
        "aircraft_type",
        "aircraft_class",
        "operator",
    ]
].copy()

# Convert timestamps to strings for JSON
queue["entry_time"] = queue["entry_time"].astype(str)
queue["exit_time"] = queue["exit_time"].astype(str)

# Replace missing values with None
queue = queue.astype(object).where(pd.notna(queue), None)

# Convert to records
records = queue.to_dict(orient="records")

# Make sure dashboard/public exists
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

# Save JSON
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(records, f, indent=2)

print("========== AIRCRAFT QUEUE EXPORT ==========")
print(f"Records exported: {len(records):,}")
print(f"Columns: {len(queue.columns)}")
print(f"Saved to: {OUTPUT_FILE}")