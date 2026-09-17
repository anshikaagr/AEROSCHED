import pandas as pd


# ============================================================
# FILES
# ============================================================

flights_file = "data/processed/egll_flights_july2026.parquet"
events_file = "data/processed/egll_runway_events_july2026.parquet"

output_file = "data/processed/egll_workload_july2026.parquet"


# ============================================================
# LOAD DATA
# ============================================================

flights = pd.read_parquet(flights_file)
events = pd.read_parquet(events_file)

print("Flights loaded:", len(flights))
print("Runway events loaded:", len(events))


# ============================================================
# FIX RUNWAY NAMES
# ============================================================

# Treat "nan" as missing
events["runway"] = events["runway"].replace("nan", pd.NA)

# Mapping discovered from geographic matching
runway_mapping = {
    510279283: "09L/27R",
    1252338026: "09R/27L"
}

# Fill missing runway names using runway_id
events["runway"] = events["runway"].fillna(
    events["runway_id"].map(runway_mapping)
)


# ============================================================
# MERGE FLIGHT INFORMATION
# ============================================================

flight_columns = [
    "id",
    "icao24",
    "flt_id",
    "dof",
    "adep",
    "ades",
    "registration",
    "model",
    "typecode",
    "icao_aircraft_class",
    "icao_operator",
    "first_seen",
    "last_seen"
]

flight_data = flights[flight_columns].copy()

flight_data = flight_data.rename(
    columns={"id": "flight_id"}
)

df = events.merge(
    flight_data,
    on="flight_id",
    how="left"
)


# ============================================================
# DETERMINE OPERATION
# ============================================================

df["operation"] = "unknown"

df.loc[df["adep"] == "EGLL", "operation"] = "departure"

df.loc[df["ades"] == "EGLL", "operation"] = "arrival"


# ============================================================
# SORT EVENTS
# ============================================================

df = df.sort_values(
    ["flight_id", "event_time"]
).reset_index(drop=True)


# ============================================================
# REMOVE FLIGHTS WITH MISMATCHED ENTRY/EXIT COUNTS
# ============================================================

event_counts = (
    df.groupby(["flight_id", "type"])
      .size()
      .unstack(fill_value=0)
)

if "entry-runway" not in event_counts.columns:
    event_counts["entry-runway"] = 0

if "exit-runway" not in event_counts.columns:
    event_counts["exit-runway"] = 0

valid_flights = event_counts[
    event_counts["entry-runway"] ==
    event_counts["exit-runway"]
].index

df = df[df["flight_id"].isin(valid_flights)].copy()


# ============================================================
# PAIR ENTRY → EXIT
# ============================================================

entries = df[df["type"] == "entry-runway"].copy()

exits = df[df["type"] == "exit-runway"].copy()


# Pair sequential entry and exit events for each flight
entries["event_number"] = (
    entries.groupby("flight_id").cumcount()
)

exits["event_number"] = (
    exits.groupby("flight_id").cumcount()
)


# Keep relevant columns
entries = entries[
    [
        "flight_id",
        "event_number",
        "event_time",
        "runway",
        "runway_id",
        "time_in_use_s"
    ]
].rename(
    columns={
        "event_time": "entry_time",
        "runway": "entry_runway",
        "runway_id": "entry_runway_id",
        "time_in_use_s": "entry_time_in_use_s"
    }
)

exits = exits[
    [
        "flight_id",
        "event_number",
        "event_time",
        "runway",
        "runway_id",
        "time_in_use_s"
    ]
].rename(
    columns={
        "event_time": "exit_time",
        "runway": "exit_runway",
        "runway_id": "exit_runway_id",
        "time_in_use_s": "exit_time_in_use_s"
    }
)


paired = entries.merge(
    exits,
    on=["flight_id", "event_number"],
    how="inner"
)


# ============================================================
# CALCULATE OCCUPANCY
# ============================================================

paired["observed_occupancy_sec"] = (
    paired["exit_time"] -
    paired["entry_time"]
).dt.total_seconds()


# Use entry runway as the runway for the operation
paired["runway"] = paired["entry_runway"]


# ============================================================
# ADD FLIGHT INFORMATION
# ============================================================

flight_info = df[
    [
        "flight_id",
        "icao24",
        "flt_id",
        "dof",
        "adep",
        "ades",
        "registration",
        "model",
        "typecode",
        "icao_aircraft_class",
        "icao_operator",
        "operation"
    ]
].drop_duplicates("flight_id")


paired = paired.merge(
    flight_info,
    on="flight_id",
    how="left"
)


# ============================================================
# CHECK OCCUPANCY AGAINST OPDI DURATION
# ============================================================

paired["duration_difference_sec"] = (
    paired["observed_occupancy_sec"] -
    paired["entry_time_in_use_s"]
)


# ============================================================
# FINAL COLUMNS
# ============================================================

final_columns = [
    "flight_id",
    "flt_id",
    "icao24",
    "operation",
    "adep",
    "ades",
    "registration",
    "model",
    "typecode",
    "icao_aircraft_class",
    "icao_operator",
    "runway",
    "entry_time",
    "exit_time",
    "observed_occupancy_sec",
    "entry_time_in_use_s",
    "duration_difference_sec"
]

final = paired[final_columns].copy()


# ============================================================
# SAVE
# ============================================================

final.to_parquet(
    output_file,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print("\n========== FINAL WORKLOAD ==========")

print("Rows:", len(final))
print("Unique flights:", final["flight_id"].nunique())

print("\nOperations:")
print(final["operation"].value_counts(dropna=False))

print("\nRunways:")
print(final["runway"].value_counts(dropna=False))

print("\nMissing runway:")
print(final["runway"].isna().sum())

print("\nMissing operation:")
print((final["operation"] == "unknown").sum())

print("\nOccupancy statistics:")
print(final["observed_occupancy_sec"].describe())

print("\nDuration difference:")
print(final["duration_difference_sec"].describe())

print("\nSaved:")
print(output_file)