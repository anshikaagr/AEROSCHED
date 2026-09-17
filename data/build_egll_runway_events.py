import pandas as pd
import json

INPUT = "data/processed/egll_events_july2026.parquet"
OUTPUT = "data/processed/egll_runway_events_july2026.parquet"

df = pd.read_parquet(INPUT)

# Convert JSON stored in "info" into columns
def parse_info(value):
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return {}

info_df = df["info"].apply(parse_info).apply(pd.Series)

df["osm_airport"] = info_df.get("osm_airport")
df["runway"] = info_df.get("osm_ref")
df["runway_id"] = info_df.get("osm_id")
df["time_in_use_s"] = info_df.get("opdi_time_in_use_s")

# Keep only runway events occurring at EGLL
df = df[
    (df["osm_airport"] == "EGLL") &
    (df["type"].isin(["entry-runway", "exit-runway"]))
].copy()

# Convert timestamp
df["event_time"] = pd.to_datetime(df["event_time"])

# Sort chronologically
df = df.sort_values("event_time")

# Save
df.to_parquet(OUTPUT, index=False)

print("========== EGLL RUNWAY EVENTS ==========")
print("Rows:", len(df))
print("Unique flights:", df["flight_id"].nunique())

print("\nRunways:")
print(df["runway"].value_counts(dropna=False))

print("\nEvent types:")
print(df["type"].value_counts())

print("\nMissing values:")
print(df[["runway", "runway_id", "time_in_use_s"]].isnull().sum())

print("\nSample:")
print(
    df[
        ["flight_id", "type", "event_time",
         "runway", "runway_id", "time_in_use_s"]
    ].head(20).to_string(index=False)
)

print("\nSaved:", OUTPUT)