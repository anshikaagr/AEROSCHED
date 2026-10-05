import pandas as pd
import json

file_path = "data/processed/egll_runway_events_july2026.parquet"

df = pd.read_parquet(file_path)

target_ids = [510279283, 1252338026]

print("========== TARGET RUNWAY METADATA ==========")

for runway_id in target_ids:

    rows = df[df["runway_id"] == runway_id]

    print("\n" + "=" * 60)
    print("RUNWAY ID:", runway_id)
    print("Events:", len(rows))
    print("Flights:", rows["flight_id"].nunique())

    print("\nSample info:")

    for value in rows["info"].head(5):

        try:
            info = json.loads(value) if isinstance(value, str) else value
            print(json.dumps(info, indent=2))
        except Exception:
            print(value)