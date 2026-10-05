import pandas as pd
import json
from pathlib import Path


INPUT_FILE = "data/processed/egll_scheduler_workload_july2026.parquet"
OUTPUT_FILE = "dashboard/public/dashboard_data.json"


def main():

    df = pd.read_parquet(INPUT_FILE)

    # Basic statistics
    total_operations = len(df)

    departures = int(
        (df["operation"] == "departure").sum()
    )

    arrivals = int(
        (df["operation"] == "arrival").sum()
    )

    runway_counts = (
        df["runway"]
        .value_counts()
        .to_dict()
    )

    # Occupancy
    average_occupancy = float(
        df["occupancy_sec"].mean()
    )

    maximum_occupancy = float(
        df["occupancy_sec"].max()
    )

    # Time range
    start_time = df["entry_time"].min()
    end_time = df["exit_time"].max()

    observation_seconds = (
        end_time - start_time
    ).total_seconds()

    # Runway utilization
    runway_utilization = {}

    for runway in runway_counts:

        occupied = float(
            df.loc[
                df["runway"] == runway,
                "occupancy_sec"
            ].sum()
        )

        utilization = (
            occupied / observation_seconds
        ) * 100

        runway_utilization[runway] = round(
            utilization,
            4
        )

    number_of_runways = len(runway_counts)

    overall_utilization = (
        df["occupancy_sec"].sum()
        /
        (observation_seconds * number_of_runways)
    ) * 100

    # Build JSON object
    dashboard_data = {
        "airport": "EGLL",
        "period": "July 2026",

        "operations": {
            "total": total_operations,
            "departures": departures,
            "arrivals": arrivals,
        },

        "runways": {
            runway: {
                "operations": int(count),
                "utilization_percent":
                    runway_utilization[runway],
            }
            for runway, count
            in runway_counts.items()
        },

        "occupancy": {
            "average_sec": round(
                average_occupancy,
                2
            ),
            "maximum_sec": round(
                maximum_occupancy,
                2
            ),
        },

        "observation_period": {
            "start": str(start_time),
            "end": str(end_time),
        },

        "overall_utilization_percent":
            round(
                overall_utilization,
                4
            ),
    }

    # Make sure dashboard/public exists
    Path("dashboard/public").mkdir(
        parents=True,
        exist_ok=True
    )

    # Write JSON
    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            dashboard_data,
            f,
            indent=2
        )

    print("========== DASHBOARD DATA ==========")
    print(json.dumps(
        dashboard_data,
        indent=2
    ))

    print("\nSaved to:")
    print(OUTPUT_FILE)


if __name__ == "__main__":
    main()