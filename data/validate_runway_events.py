import pandas as pd

file_path = "data/processed/egll_runway_events_july2026.parquet"

df = pd.read_parquet(file_path)

print("========== BASIC INFO ==========")
print("Rows:", len(df))
print("Unique flights:", df["flight_id"].nunique())

# Treat string "nan" as missing
df["runway"] = df["runway"].replace("nan", pd.NA)

print("\n========== EVENT TYPES ==========")
print(df["type"].value_counts())

print("\n========== RUNWAYS ==========")
print(df["runway"].value_counts(dropna=False))

# Count entry and exit events per flight
event_counts = (
    df.groupby(["flight_id", "type"])
      .size()
      .unstack(fill_value=0)
)

# Make sure both columns exist
if "entry-runway" not in event_counts.columns:
    event_counts["entry-runway"] = 0

if "exit-runway" not in event_counts.columns:
    event_counts["exit-runway"] = 0

print("\n========== ENTRY / EXIT COUNTS ==========")
print(event_counts[["entry-runway", "exit-runway"]].head(20))

# Flights with equal number of entries and exits
clean_count = (
    event_counts["entry-runway"] ==
    event_counts["exit-runway"]
)

print("\n========== PAIRING CHECK ==========")
print("Flights with equal entry/exit counts:",
      clean_count.sum())

print("Flights with mismatched entry/exit counts:",
      (~clean_count).sum())

# Flights with missing runway name
missing_runway = df["runway"].isna()

print("\n========== MISSING RUNWAY ==========")
print("Events with missing runway name:",
      missing_runway.sum())

print("Flights affected by missing runway:",
      df.loc[missing_runway, "flight_id"].nunique())

# Show problematic flights
problem_flights = event_counts[~clean_count]

print("\n========== PROBLEMATIC FLIGHTS ==========")
print(problem_flights.head(20))

# Duplicate timestamps
duplicates = df.duplicated(
    subset=["flight_id", "type", "event_time"],
    keep=False
)

print("\n========== DUPLICATE EVENTS ==========")
print("Duplicate event rows:", duplicates.sum())
print("Flights affected:", df.loc[duplicates, "flight_id"].nunique())