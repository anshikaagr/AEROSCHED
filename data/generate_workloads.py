import pandas as pd
import numpy as np
from pathlib import Path


# ============================================================
# CONFIGURATION
# ============================================================

INPUT_FILE = "data/processed/egll_scheduler_workload_july2026.parquet"
OUTPUT_DIR = Path("data/processed/workloads")

# Fixed seed = same workloads every time we run the script
RANDOM_SEED = 42

# Workload sizes
WORKLOAD_SIZES = {
    "small": 100,
    "medium": 500,
    "large": 2000,
    "stress": 5000,
}


# ============================================================
# PRIORITY GENERATION
# ============================================================

def generate_priority_fields(df, rng):
    """
    Generate simulated emergency and fuel-urgency information.

    These fields are simulation inputs, not values directly
    provided by the OPDI dataset.
    """

    # Most aircraft are normal.
    # A small fraction have increased fuel urgency.
    fuel_categories = [
        "normal",
        "low",
        "medium",
        "high",
        "critical",
    ]

    fuel_probabilities = [
        0.60,
        0.15,
        0.12,
        0.08,
        0.05,
    ]

    df["fuel_urgency"] = rng.choice(
        fuel_categories,
        size=len(df),
        p=fuel_probabilities
    )

    # Emergency situations are deliberately rare.
    df["emergency"] = rng.random(len(df)) < 0.02

    # Fuel urgency points
    fuel_points = {
        "normal": 0,
        "low": 5,
        "medium": 15,
        "high": 30,
        "critical": 50,
    }

    df["fuel_score"] = df["fuel_urgency"].map(fuel_points)

    # Emergency gets the highest priority contribution.
    df["emergency_score"] = np.where(
        df["emergency"],
        100,
        0
    )

    # Final initial priority
    df["priority"] = (
        df["fuel_score"] +
        df["emergency_score"]
    )

    return df


# ============================================================
# REQUEST TIME GENERATION
# ============================================================

def generate_request_times(df, rng):
    """
    Generate simulated scheduler request times.

    OPDI gives us observed runway-entry times, but does not
    directly provide scheduler queue-request times.

    Therefore request_time is generated before the observed
    runway entry using a controlled waiting interval.
    """

    # Simulated pre-scheduling waiting time:
    # 0 to 5 minutes
    waiting_seconds = rng.integers(
        low=0,
        high=301,
        size=len(df)
    )

    df["simulated_pre_request_wait_sec"] = waiting_seconds

    df["request_time"] = (
        df["entry_time"]
        - pd.to_timedelta(waiting_seconds, unit="s")
    )

    return df


# ============================================================
# BASE WORKLOAD
# ============================================================

def create_base_workload():
    print("========== LOADING SCHEDULER WORKLOAD ==========")

    df = pd.read_parquet(INPUT_FILE)

    print("Original rows:", len(df))

    # Use a fixed random generator
    rng = np.random.default_rng(RANDOM_SEED)

    # Generate simulation fields
    df = generate_request_times(df, rng)
    df = generate_priority_fields(df, rng)

    # Keep observed runway as reference.
    df["observed_runway"] = df["runway"]

    # For the simulation, both EGLL runways are considered
    # available resources.
    df["eligible_runways"] = "09R/27L,09L/27R"

    # Remove the original runway column because
    # observed_runway now represents historical ground truth.
    df = df.drop(columns=["runway"])

    # Rename timestamps for clarity
    df = df.rename(
        columns={
            "entry_time": "observed_entry_time",
            "exit_time": "observed_exit_time",
        }
    )

    # Sort by request time
    df = df.sort_values("request_time").reset_index(drop=True)

    print("Generated rows:", len(df))

    return df


# ============================================================
# CREATE SIZE-BASED WORKLOADS
# ============================================================

def create_size_workloads(df):
    print("\n========== CREATING SIZE-BASED WORKLOADS ==========")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(RANDOM_SEED)

    for name, size in WORKLOAD_SIZES.items():

        # Random sample, but reproducible
        workload = df.sample(
            n=size,
            random_state=RANDOM_SEED
        ).copy()

        workload = workload.sort_values(
            "request_time"
        ).reset_index(drop=True)

        output_file = OUTPUT_DIR / f"{name}_workload.parquet"

        workload.to_parquet(
            output_file,
            index=False
        )

        print(f"{name:8} → {len(workload):5} aircraft → {output_file}")


# ============================================================
# SPECIAL SCENARIOS
# ============================================================

def create_special_scenarios(df):

    print("\n========== CREATING SPECIAL SCENARIOS ==========")

    # --------------------------------------------------------
    # FCFS TEST
    # --------------------------------------------------------

    fcfs = df.sample(
        n=min(100, len(df)),
        random_state=10
    ).copy()

    fcfs = fcfs.sort_values("request_time")

    fcfs["priority"] = 0

    fcfs_file = OUTPUT_DIR / "fcfs_test.parquet"
    fcfs.to_parquet(fcfs_file, index=False)

    print("FCFS test created:", len(fcfs))


    # --------------------------------------------------------
    # PRIORITY TEST
    # --------------------------------------------------------

    priority = df.sample(
        n=min(100, len(df)),
        random_state=20
    ).copy()

    priority = priority.sort_values("request_time")

    priority_file = OUTPUT_DIR / "priority_test.parquet"
    priority.to_parquet(priority_file, index=False)

    print("Priority test created:", len(priority))


    # --------------------------------------------------------
    # ARRIVAL-HEAVY TEST
    # --------------------------------------------------------

    arrivals = df[df["operation"] == "arrival"]

    if len(arrivals) >= 100:

        arrival_heavy = arrivals.sample(
            n=100,
            random_state=30
        ).copy()

        arrival_heavy = arrival_heavy.sort_values(
            "request_time"
        )

        arrival_file = OUTPUT_DIR / "arrival_heavy_test.parquet"

        arrival_heavy.to_parquet(
            arrival_file,
            index=False
        )

        print(
            "Arrival-heavy test created:",
            len(arrival_heavy)
        )


    # --------------------------------------------------------
    # DEPARTURE-HEAVY TEST
    # --------------------------------------------------------

    departures = df[df["operation"] == "departure"]

    if len(departures) >= 100:

        departure_heavy = departures.sample(
            n=100,
            random_state=40
        ).copy()

        departure_heavy = departure_heavy.sort_values(
            "request_time"
        )

        departure_file = OUTPUT_DIR / "departure_heavy_test.parquet"

        departure_heavy.to_parquet(
            departure_file,
            index=False
        )

        print(
            "Departure-heavy test created:",
            len(departure_heavy)
        )


    # --------------------------------------------------------
    # EMERGENCY TEST
    # --------------------------------------------------------

    emergency = df[df["emergency"] == True]

    if len(emergency) > 0:

        emergency = emergency.copy()

        emergency_file = OUTPUT_DIR / "emergency_test.parquet"

        emergency.to_parquet(
            emergency_file,
            index=False
        )

        print(
            "Emergency test created:",
            len(emergency)
        )


    # --------------------------------------------------------
    # RUNWAY CONTENTION TEST
    # --------------------------------------------------------

    # Pick a short time window containing many aircraft.
    # This creates realistic temporal contention.
    sorted_df = df.sort_values("request_time").reset_index(drop=True)

    best_start = 0
    best_count = 0

    window_seconds = 10 * 60  # 10 minutes

    for i in range(len(sorted_df)):

        start_time = sorted_df.loc[i, "request_time"]
        end_time = start_time + pd.Timedelta(
            seconds=window_seconds
        )

        count = (
            sorted_df["request_time"]
            .between(start_time, end_time)
            .sum()
        )

        if count > best_count:
            best_count = count
            best_start = i

    contention_start = sorted_df.loc[
        best_start,
        "request_time"
    ]

    contention_end = (
        contention_start +
        pd.Timedelta(seconds=window_seconds)
    )

    contention = sorted_df[
        sorted_df["request_time"].between(
            contention_start,
            contention_end
        )
    ].copy()

    contention_file = OUTPUT_DIR / "runway_contention_test.parquet"

    contention.to_parquet(
        contention_file,
        index=False
    )

    print(
        "Runway contention test created:",
        len(contention)
    )


# ============================================================
# SUMMARY
# ============================================================

def print_summary(df):

    print("\n========== BASE WORKLOAD SUMMARY ==========")

    print("Rows:", len(df))

    print("\nOperations:")
    print(df["operation"].value_counts())

    print("\nFuel urgency:")
    print(df["fuel_urgency"].value_counts())

    print("\nEmergency aircraft:")
    print(df["emergency"].value_counts())

    print("\nPriority:")
    print(df["priority"].describe())

    print("\nRequest time:")
    print(df["request_time"].min())
    print("to")
    print(df["request_time"].max())


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    base_workload = create_base_workload()

    print_summary(base_workload)

    create_size_workloads(base_workload)

    create_special_scenarios(base_workload)

    print("\n========== DONE ==========")
    print("Workloads saved in:")
    print(OUTPUT_DIR)