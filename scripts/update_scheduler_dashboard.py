import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BINARY = ROOT / "scheduler" / "aerosched"
WORKLOAD = ROOT / "data" / "processed" / "workloads" / "congested_test.csv"
OUTPUT = ROOT / "dashboard" / "public" / "scheduler_results.json"

if not BINARY.exists():
    raise SystemExit(f"Scheduler binary not found: {BINARY}")
if not WORKLOAD.exists():
    raise SystemExit(f"Test workload not found: {WORKLOAD}")

result = subprocess.run(
    [str(BINARY), str(WORKLOAD), "both"],
    cwd=ROOT,
    capture_output=True,
    text=True,
)

if result.returncode != 0:
    print(result.stderr)
    raise SystemExit("Scheduler execution failed.")

raw = result.stdout
headers = list(re.finditer(
    r"(?im)^.*\b(FCFS|PRIORITY)\b.*\bRESULTS\b.*$",
    raw
))

if len(headers) < 2:
    print(raw)
    raise SystemExit(
        "Could not identify both result sections. "
        "Check the scheduler's printed headings."
    )

def extract(section, labels):
    for label in labels:
        match = re.search(
            rf"(?im)^.*{label}.*?([-+]?\d[\d,]*(?:\.\d+)?)",
            section
        )
        if match:
            return float(match.group(1).replace(",", ""))
    return None

results = {}

for i, header in enumerate(headers):
    name = header.group(1).upper()
    end = headers[i + 1].start() if i + 1 < len(headers) else len(raw)
    section = raw[header.end():end]

    metrics = {
        "average_wait_sec": extract(section, [r"Average waiting time"]),
        "maximum_wait_sec": extract(section, [r"Maximum waiting time"]),
        "emergency_count": extract(section, [r"Emergency flights"]),
        "emergency_average_wait_sec": extract(
            section, [r"Emergency average wait"]
        ),
        "emergency_maximum_wait_sec": extract(
            section, [r"Emergency maximum wait"]
        ),
        "non_emergency_average_wait_sec": extract(
            section, [r"Non-emergency average wait"]
        ),
        "non_emergency_maximum_wait_sec": extract(
            section, [r"Non-emergency maximum wait"]
        ),
        "throughput_flights_per_hour": extract(
            section, [r"Throughput"]
        ),
        "runway_utilization_percent": extract(
            section, [r"utilization"]
        ),
    }

    missing = [key for key, value in metrics.items() if value is None]
    if missing:
        print(f"\nCould not parse {name}: {', '.join(missing)}")
        print(section)
        raise SystemExit("No dashboard JSON written; parser needs adjustment.")

    results[name.lower()] = metrics

if "fcfs" not in results or "priority" not in results:
    raise SystemExit("Both FCFS and Priority results are required.")

payload = {
    "title": "Scheduler Comparison",
    "scenario": "Congested test — all 500 requests clustered at one time",
    "source": "C++ scheduler simulation",
    "warning": (
        "Synthetic stress test; results are not a prediction of "
        "real-world airport performance."
    ),
    "results": results,
}

OUTPUT.write_text(json.dumps(payload, indent=2) + "\n")
print(f"Updated dashboard data: {OUTPUT}")
print(json.dumps(results, indent=2))
