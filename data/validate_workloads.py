import pandas as pd
from pathlib import Path


WORKLOAD_DIR = Path("data/processed/workloads")


def validate_file(file_path):
    print("\n" + "=" * 60)
    print(f"FILE: {file_path.name}")
    print("=" * 60)

    df = pd.read_parquet(file_path)

    print("Rows:", len(df))
    print("Columns:", len(df.columns))

    # Required columns
    required_columns = [
        "flight_id",
        "flt_id",
        "icao24",
        "operation",
        "request_time",
        "observed_entry_time",
        "observed_exit_time",
        "occupancy_sec",
        "observed_runway",
        "eligible_runways",
        "fuel_urgency",
        "emergency",
        "priority",
    ]

    missing_columns = [
        col for col in required_columns
        if col not in df.columns
    ]

    print("\nMissing required columns:")
    print(missing_columns if missing_columns else "None")

    # Missing values
    print("\nMissing values:")
    print(df[required_columns].isnull().sum())

    # Request time must be before/equal to observed entry
    invalid_request_times = (
        df["request_time"] > df["observed_entry_time"]
    ).sum()

    print("\nRequest time after observed entry:")
    print(invalid_request_times)

    # Occupancy must be positive
    invalid_occupancy = (
        df["occupancy_sec"] <= 0
    ).sum()

    print("\nInvalid occupancy:")
    print(invalid_occupancy)

    # Valid operations
    invalid_operations = (
        ~df["operation"].isin(["arrival", "departure"])
    ).sum()

    print("\nInvalid operations:")
    print(invalid_operations)

    # Valid runways
    valid_runways = {"09R/27L", "09L/27R"}

    invalid_runways = (
        ~df["observed_runway"].isin(valid_runways)
    ).sum()

    print("\nInvalid observed runways:")
    print(invalid_runways)

    # Priority check
    invalid_priority = (
        (df["priority"] < 0) |
        (df["priority"] > 150)
    ).sum()

    print("\nInvalid priority values:")
    print(invalid_priority)

    # Duplicate records
    duplicates = df.duplicated(
        subset=["flight_id", "request_time"]
    ).sum()

    print("\nDuplicate flight/request records:")
    print(duplicates)

    # Emergency count
    print("\nEmergency aircraft:")
    print(df["emergency"].value_counts())

    # Priority distribution
    print("\nPriority distribution:")
    print(df["priority"].value_counts().sort_index())

    print("\nValidation complete.")


def main():

    print("========== WORKLOAD VALIDATION ==========")

    files = sorted(
        WORKLOAD_DIR.glob("*.parquet")
    )

    print("Files found:", len(files))

    for file_path in files:
        validate_file(file_path)

    print("\n========== ALL FILES CHECKED ==========")


if __name__ == "__main__":
    main()