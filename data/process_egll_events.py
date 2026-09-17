import pandas as pd
from pathlib import Path

RAW_PATH = Path("data/raw")
PROCESSED_PATH = Path("data/processed")

# Load our EGLL flight IDs
egll_flights = pd.read_parquet(
    PROCESSED_PATH / "egll_flights_july2026.parquet"
)

egll_ids = set(egll_flights["id"])

print("EGLL flight IDs:", len(egll_ids))

# Only these event types matter for our initial scheduler
relevant_events = {
    "take-off",
    "landing",
    "entry-runway",
    "exit-runway",
}

event_files = sorted(
    RAW_PATH.glob("flight_events_*.parquet")
)

all_events = []

for file in event_files:
    print(f"\nProcessing: {file.name}")

    events = pd.read_parquet(file)

    # Keep only events belonging to EGLL flights
    events = events[events["flight_id"].isin(egll_ids)]

    # Keep only relevant runway-related events
    events = events[events["type"].isin(relevant_events)]

    print("Matching events:", len(events))

    all_events.append(events)

# Combine results from all event files
egll_events = pd.concat(all_events, ignore_index=True)

# Keep only July 2026 events
egll_events["event_time"] = pd.to_datetime(
    egll_events["event_time"]
)

egll_events = egll_events[
    (egll_events["event_time"] >= "2026-07-01") &
    (egll_events["event_time"] < "2026-08-01")
]

# Save processed events
output_file = PROCESSED_PATH / "egll_events_july2026.parquet"

egll_events.to_parquet(
    output_file,
    index=False
)

print("\n========== RESULT ==========")
print("Total EGLL events:", len(egll_events))
print("\nEvent type counts:")
print(egll_events["type"].value_counts())

print("\nSaved:", output_file)