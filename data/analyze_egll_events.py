import pandas as pd

file_path = "data/processed/egll_events_july2026.parquet"

df = pd.read_parquet(file_path)

print("========== DATASET ==========")
print("Rows:", len(df))
print("Columns:", df.columns.tolist())

print("\n========== EVENT COUNTS ==========")
print(df["type"].value_counts())

print("\n========== MISSING VALUES ==========")
print(df.isnull().sum())

print("\n========== UNIQUE FLIGHTS ==========")
print(df["flight_id"].nunique())

print("\n========== INFO VALUES ==========")
print(df["info"].value_counts().head(30))

print("\n========== SAMPLE RUNWAY EVENTS ==========")
runway_events = df[df["type"].isin(["entry-runway", "exit-runway"])]

print(
    runway_events[
        ["flight_id", "type", "event_time", "longitude",
         "latitude", "altitude", "info"]
    ].head(20).to_string()
)