import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

INPUT_FILE = "data/processed/workloads/medium_workload.parquet"


# ============================================================
# LOAD WORKLOAD
# ============================================================

def load_workload():
    df = pd.read_parquet(INPUT_FILE)

    print("========== WORKLOAD LOADED ==========")
    print("Rows:", len(df))

    return df


# ============================================================
# WAITING TIME
# ============================================================

def calculate_waiting_time(df):
    """
    Calculate the waiting time represented by our simulated
    request time and observed runway entry time.

    This is NOT scheduler waiting time yet.
    It represents the gap between simulated request and
    observed runway entry.
    """

    waiting = (
        df["observed_entry_time"] -
        df["request_time"]
    ).dt.total_seconds()

    return waiting


# ============================================================
# TURNAROUND TIME
# ============================================================

def calculate_turnaround_time(df):
    """
    Time from simulated request until observed runway exit.
    """

    turnaround = (
        df["observed_exit_time"] -
        df["request_time"]
    ).dt.total_seconds()

    return turnaround


# ============================================================
# RUNWAY UTILIZATION
# ============================================================

def calculate_runway_utilization(df):
    """
    Calculate observed runway utilization for each runway.

    Utilization =
        total runway occupancy /
        total observation period
    """

    results = {}

    observation_start = df["observed_entry_time"].min()
    observation_end = df["observed_exit_time"].max()

    observation_seconds = (
        observation_end - observation_start
    ).total_seconds()

    # Avoid division by zero
    if observation_seconds <= 0:
        return results

    for runway in df["observed_runway"].unique():

        runway_df = df[
            df["observed_runway"] == runway
        ]

        occupied_seconds = runway_df[
            "occupancy_sec"
        ].sum()

        utilization = (
            occupied_seconds /
            observation_seconds
        ) * 100

        results[runway] = utilization

    # Overall utilization
    total_occupied = df["occupancy_sec"].sum()

    number_of_runways = df["observed_runway"].nunique()

    overall_utilization = (
        total_occupied /
        (observation_seconds * number_of_runways)
    ) * 100

    results["overall"] = overall_utilization

    return results


# ============================================================
# MAIN METRICS
# ============================================================

def calculate_metrics(df):

    waiting_time = calculate_waiting_time(df)

    turnaround_time = calculate_turnaround_time(df)

    runway_utilization = calculate_runway_utilization(df)

    metrics = {
        "aircraft_count": len(df),

        "average_waiting_time_sec":
            waiting_time.mean(),

        "maximum_waiting_time_sec":
            waiting_time.max(),

        "average_turnaround_time_sec":
            turnaround_time.mean(),

        "maximum_turnaround_time_sec":
            turnaround_time.max(),

        "runway_utilization":
            runway_utilization,
    }

    return metrics


# ============================================================
# DISPLAY RESULTS
# ============================================================

def print_metrics(metrics):

    print("\n========== SCHEDULING METRICS ==========")

    print(
        "Aircraft:",
        metrics["aircraft_count"]
    )

    print(
        "Average waiting time:",
        round(
            metrics["average_waiting_time_sec"],
            2
        ),
        "seconds"
    )

    print(
        "Maximum waiting time:",
        round(
            metrics["maximum_waiting_time_sec"],
            2
        ),
        "seconds"
    )

    print(
        "Average turnaround time:",
        round(
            metrics["average_turnaround_time_sec"],
            2
        ),
        "seconds"
    )

    print(
        "Maximum turnaround time:",
        round(
            metrics["maximum_turnaround_time_sec"],
            2
        ),
        "seconds"
    )

    print("\nRunway utilization:")

    for runway, utilization in (
        metrics["runway_utilization"].items()
    ):

        print(
            f"{runway}: {utilization:.2f}%"
        )


# ============================================================
# PROGRAM ENTRY
# ============================================================

if __name__ == "__main__":

    df = load_workload()

    metrics = calculate_metrics(df)

    print_metrics(metrics)