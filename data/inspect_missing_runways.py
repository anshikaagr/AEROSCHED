import pandas as pd

file_path = "data/processed/egll_runway_events_july2026.parquet"

df = pd.read_parquet(file_path)

# Convert "nan" string to actual missing value
df["runway"] = df["runway"].replace("nan", pd.NA)

missing = df[df["runway"].isna()].copy()

print("========== MISSING RUNWAY EVENTS ==========")

print("Rows:", len(missing))
print("Unique flights:", missing["flight_id"].nunique())

print("\n========== RUNWAY IDs ==========")
print(missing["runway_id"].value_counts().head(20))

print("\n========== EVENT TYPES ==========")
print(missing["type"].value_counts())

print("\n========== SAMPLE ==========")
print(
    missing[
        [
            "flight_id",
            "type",
            "event_time",
            "runway_id",
            "time_in_use_s"
        ]
    ].head(30).to_string(index=False)
)