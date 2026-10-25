# AeroSched — Airport Runway Scheduling and Simulation System

AeroSched is an Operating Systems project that simulates airport runway scheduling using **FCFS, Priority Scheduling, and Dynamic Priority Scheduling with Aging**. It combines a C++17 scheduling engine, Python-based data processing, and a React dashboard to evaluate and visualize scheduling performance.

The project explores how different scheduling policies handle flight requests when runway availability, runway eligibility, and flight priorities must be considered.

> **Project scope:** AeroSched is an academic simulation for controlled experiments. It is not designed, certified, or intended for real-world air traffic control.

## Overview

Airport runways are limited resources that must be allocated to competing flight requests. Different scheduling policies can produce different waiting times and levels of responsiveness to urgent requests.

AeroSched models this problem as a scheduling simulation and compares multiple policies using measurable performance indicators.

### Project Objectives

* Implement and compare multiple scheduling policies.
* Model runway eligibility and availability constraints.
* Evaluate waiting time, throughput, and runway utilization.
* Examine how priority-based scheduling affects emergency requests.
* Explore Dynamic Priority with Aging as an approach to reducing starvation.
* Present historical airport data and simulation results through a dashboard.

## Features

* **Multiple scheduling policies:** FCFS, Priority Scheduling, and Dynamic Priority with Aging.
* **Runway-aware allocation:** Considers runway eligibility and availability when scheduling requests.
* **Workload-based testing:** Supports experiments using different flight-request workloads.
* **Performance evaluation:** Examines average waiting time, maximum waiting time, emergency waiting time, throughput, and runway utilization.
* **Interactive dashboard:** Provides visual exploration of airport data and scheduling comparisons.
* **Historical data exploration:** Includes airport overview, aircraft queue, runway information, timeline, and data-derived alerts.
* **Experiment comparison:** Helps compare scheduling behaviour under different simulated traffic conditions.

## Scheduling Algorithms

### 1. First Come, First Served (FCFS)

FCFS considers requests in their arrival order.

**Purpose:** Establish a baseline for comparing the other scheduling policies.

### 2. Priority Scheduling

Priority Scheduling gives preference to requests according to their assigned priority.

**Purpose:** Evaluate how priority-based scheduling affects urgent requests and overall system performance.

### 3. Dynamic Priority Scheduling with Aging

Dynamic Priority with Aging is designed to increase a waiting request's effective priority over time.

**Purpose:** Investigate whether increasing priority with waiting time can reduce starvation while maintaining acceptable scheduling performance.

The effectiveness of each policy depends on the workload and the scheduler's implementation. Results should be validated using the same input workload before making performance comparisons.

## Technology Stack

| Technology     | Role                                                           |
| -------------- | -------------------------------------------------------------- |
| C++17          | Scheduling engine and allocation logic                         |
| Python         | Data processing, experiment support, and dashboard integration |
| Pandas         | Tabular data processing                                        |
| React          | Dashboard interface                                            |
| Vite           | Frontend development server and build tooling                  |
| JSON           | Structured scheduler results for dashboard integration         |
| CSV            | Flight-request workloads and tabular inputs                    |
| Git and GitHub | Version control and project hosting                            |

## System Architecture

The project follows a workflow connecting the scheduling engine to the visualization layer.

```text
             Flight Workload
                  CSV
                   |
                   v
          C++17 Scheduling Engine
                   |
          +--------+--------+
          |        |        |
         FCFS   Priority   Dynamic
          |        |        |
          +--------+--------+
                   |
                   v
          Schedule and Metrics
                   |
                   v
            JSON Results
                   |
                   v
          Python Integration
                   |
                   v
           React + Vite UI
                   |
                   v
          Visual Comparisons
```

Python scripts support data processing and integration. Historical airport data is explored separately from the synthetic workloads used for scheduler experiments.

## Dataset and Workloads

AeroSched uses two distinct types of data for different purposes.

### Historical Airport Data

The project uses historical flight-event and flight-list data associated with Heathrow Airport (EGLL), covering July 2026.

The analyzed dataset contains:

* **18,232** runway operations
* **17,813** unique flights
* **13,912** departures
* **4,320** arrivals
* Runway pairs **09R/27L** and **09L/27R**

Historical records support airport-data exploration and dashboard visualizations. They should not be interpreted as live airport information or as direct outputs from the scheduling simulator.

### Synthetic Scheduling Workloads

Synthetic workloads are prepared to test the scheduling algorithms under controlled conditions.

The project includes workload scenarios of different sizes and traffic patterns, including:

* Small, medium, and large workloads
* Stress workloads
* Arrival-heavy and departure-heavy workloads
* Emergency-focused workloads
* Runway-contention scenarios
* Congested workloads

For a fair comparison, the same workload should be evaluated using each scheduling policy.

Synthetic data is used for controlled experiments and does not reproduce every condition of a real airport.

### Data Source

Historical flight data is associated with [OPDI](https://www.opdi.aero/data.html).

Check the source's terms and data-use conditions before redistributing raw datasets. Large source files should not be committed to the repository unless necessary and permitted.

## Performance Metrics

AeroSched evaluates scheduling behaviour using the following metrics.

| Metric                 | Description                                        |
| ---------------------- | -------------------------------------------------- |
| Average waiting time   | Average time requests spend waiting before service |
| Maximum waiting time   | Longest observed waiting time among requests       |
| Emergency waiting time | Waiting time experienced by emergency requests     |
| Throughput             | Number of operations processed per unit of time    |
| Runway utilization     | Proportion of modeled runway time spent in use     |

No single metric fully describes scheduling performance. For example, reducing emergency waiting time may increase the average waiting time for other requests.

Results should therefore be interpreted together rather than relying on one metric alone.

## Project Structure

The repository is organized into the following main directories.

```text
AEROSCHED/
├── dashboard/       # React/Vite dashboard
├── data/            # Dataset and workload files
├── docs/            # Project documentation
├── results/         # Experiment outputs
├── scheduler/       # C++ scheduling engine
├── screenshots/     # Dashboard and project screenshots
├── scripts/         # Data processing and integration scripts
├── simulation/      # Simulation-related components
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

The exact files and subdirectories may change as the project develops.

## Getting Started

### Prerequisites

Install the following tools:

* Git
* A C++ compiler that supports C++17
* Python 3
* Node.js and npm
* A code editor such as Visual Studio Code

### 1. Clone the Repository

```bash
git clone https://github.com/anshikaagr/AEROSCHED.git
cd AEROSCHED
```

### 2. Compile the C++ Scheduler

From the repository root, run:

```bash
g++ -std=c++17 -Wall -Wextra scheduler/scheduler.cpp -o scheduler/aerosched
```

This compiles the scheduler into an executable.

On Windows, the generated executable may need to be run as `scheduler/aerosched.exe`.

### 3. Run a Scheduling Experiment

Choose an available CSV workload and a scheduling mode supported by the scheduler.

The exact command-line arguments depend on the implementation in `scheduler/scheduler.cpp`. Refer to the source code and its supported usage before running an experiment.

### 4. Refresh Dashboard Results

Run the integration script from the repository root:

```bash
python scripts/update_scheduler_dashboard.py
```

This script is intended to refresh the scheduler results consumed by the dashboard. Ensure the scheduler has produced the required outputs and that Python dependencies are installed.

### 5. Start the Dashboard

Open a terminal in the dashboard directory:

```bash
cd dashboard
npm install
npm run dev
```

Open the local address printed by Vite in your browser. The development server commonly uses `http://localhost:5173/`.

**Note:** The dashboard may display historical airport data separately from scheduler experiment results. Updating one does not necessarily update the other.

## Dashboard

The dashboard provides different views of the project.

| Section                      | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| Overview                     | Summarizes historical airport data             |
| Aircraft Queue               | Explores historical flight records             |
| Runways                      | Displays runway-related information            |
| Timeline                     | Presents historical operations chronologically |
| Alerts                       | Highlights data-derived anomalies              |
| Scheduling Policy Comparison | Compares scheduling experiment results         |

Historical dashboard views are not live airport feeds. Scheduling comparison results come from simulation workloads.

## Experiments and Results

AeroSched is designed to compare scheduling policies under consistent workload conditions.

Experiments can examine:

* How waiting time changes as workload size increases
* How priority scheduling affects emergency requests
* How runway contention affects scheduling outcomes
* Whether Dynamic Priority with Aging changes waiting behaviour
* How throughput and runway utilization vary between policies

Reported results should be accompanied by the workload used, the scheduling policy, and the metrics produced by the actual run.

Dynamic Priority with Aging should be evaluated using targeted tests that verify priority changes over time and check whether the resulting schedule differs as expected.

## Limitations

* Synthetic workloads cannot represent every real-world airport condition.
* Results depend on workload design and the scheduler's implementation.
* Dynamic Priority with Aging requires targeted validation to demonstrate its effectiveness.
* Historical dashboard data is not a live airport feed.
* The simulation is an educational model, not an operational air traffic control system.
* Simulation results should not be treated as evidence of real-world aviation safety or performance.

## Future Improvements

* Add more automated tests for scheduling edge cases.
* Validate priority aging and starvation-related behaviour.
* Expand workload scenarios and performance comparisons.
* Improve traceability between scheduler outputs and dashboard metrics.
* Add repeatable experiment exports and result summaries.
* Improve documentation and reproducibility.

## Contributors

**Anshika Agrawal** and **Shreya Yadav**

Developed collaboratively as an Operating Systems project, focusing on airport runway scheduling, simulation, and performance visualization.

Developed as an Operating Systems project.

## Acknowledgements

* OPDI for the historical flight-data source.
* The open-source tools and libraries used in the project.

---

**AeroSched — Exploring airport runway scheduling through Operating Systems concepts.**
