import "./App.css";
import "./polish.css";                    // new, must come after App.css
import { useEffect, useState } from "react";
import Intro from "./components/Intro";   // new
function StatCard({ title, value, subtitle }) {
  return (
    <div className="stat-card">
      <p className="stat-title">{title}</p>
      <h2>{value}</h2>
      <p className="stat-subtitle">{subtitle}</p>
    </div>
  );
}

function RunwayCard({ runway, status, details }) {
  return (
    <div className="runway-card">
      <div className="runway-header">
        <h3>{runway}</h3>
        <span className={`status ${status.toLowerCase()}`}>
          ● {status}
        </span>
      </div>

      <p>{details}</p>
    </div>
  );
}


function AircraftQueue() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [operationFilter, setOperationFilter] = useState("all");

  useEffect(() => {
    fetch("/aircraft_queue.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load queue: ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        setFlights(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const query = search.trim().toLowerCase();

  const filteredFlights = flights
    .filter((flight) => {
      const searchable = [
        flight.flt_id,
        flight.flight_id,
        flight.aircraft_type,
        flight.runway,
      ];

      const matchesSearch = searchable.some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

      const operation = String(flight.operation ?? "").toLowerCase();
      const matchesOperation =
        operationFilter === "all" || operation === operationFilter;

      return matchesSearch && matchesOperation;
    })
    .sort(
      (a, b) =>
        new Date(a.entry_time).getTime() -
        new Date(b.entry_time).getTime()
    );

  const runwayGroups = filteredFlights.reduce((groups, flight) => {
    const runway = flight.runway || "Runway unavailable";
    if (!groups[runway]) groups[runway] = [];
    groups[runway].push(flight);
    return groups;
  }, {});

  if (loading) {
    return (
      <section className="section">
        <div className="info-card"><h3>Loading flight queue...</h3></div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section">
        <div className="info-card">
          <h3>Unable to load flight queue</h3>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AIRCRAFT OPERATIONS</p>
          <h2>Flight Queue by Runway</h2>
        </div>
        <span className="live-badge">
          {filteredFlights.length.toLocaleString()} FLIGHTS
        </span>
      </div>

      <div className="info-card">
        <h3>Runway Assignment Overview</h3>
        <p>
          Historical EGLL operations grouped by recorded runway and ordered
          by entry time. These records are not live assignments from the
          C++ scheduler.
        </p>
      </div>

      <div className="queue-filters">
        <input
          type="search"
          placeholder="Search flight, aircraft, or runway..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search flight queue"
        />

        <select
          value={operationFilter}
          onChange={(event) => setOperationFilter(event.target.value)}
          aria-label="Filter operation"
        >
          <option value="all">All operations</option>
          <option value="arrival">Arrivals</option>
          <option value="departure">Departures</option>
        </select>
      </div>

      {Object.keys(runwayGroups).length === 0 ? (
        <div className="info-card">
          <h3>No matching flights</h3>
          <p>Try a different search or operation filter.</p>
        </div>
      ) : (
        <div className="runway-queue-grid">
          {Object.entries(runwayGroups).map(([runway, runwayFlights]) => (
            <article className="runway-queue-card" key={runway}>
              <div className="runway-queue-header">
                <div>
                  <p className="eyebrow">ASSIGNED RUNWAY</p>
                  <h3>{runway}</h3>
                </div>
                <span className="live-badge">
                  {runwayFlights.length} flights
                </span>
              </div>

              <div className="flight-queue-list">
                {runwayFlights.slice(0, 50).map((flight, index) => {
                  const operation = String(
                    flight.operation ?? "unknown"
                  ).toLowerCase();

                  const timestamp = flight.entry_time
                    ? new Date(flight.entry_time)
                    : null;

                  const validTime =
                    timestamp && !Number.isNaN(timestamp.getTime());

                  return (
                    <div
                      className="flight-queue-item"
                      key={`${flight.flight_id ?? flight.flt_id ?? "flight"}-${index}`}
                    >
                      <div className="flight-queue-time">
                        {validTime
                          ? timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : "Time unavailable"}
                      </div>

                      <div className="flight-queue-marker">
                        <span />
                      </div>

                      <div className="flight-queue-details">
                        <div className="flight-queue-top">
                          <strong>
                            {flight.flt_id || flight.flight_id || "Unknown flight"}
                          </strong>
                          <span className={`operation ${operation}`}>
                            {operation}
                          </span>
                        </div>

                        <p>{flight.aircraft_type || "Aircraft unknown"}</p>

                        <small>
                          Runway occupancy:{" "}
                          {Number.isFinite(Number(flight.occupancy_sec)) &&
                            flight.occupancy_sec !== null &&
                            flight.occupancy_sec !== ""
                            ? `${Number(flight.occupancy_sec).toFixed(0)} sec`
                            : "Unavailable"}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>

              {runwayFlights.length > 50 && (
                <p className="queue-note">
                  Showing 50 of {runwayFlights.length} flights on this runway.
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      <p className="queue-note">
        Historical data only. Queue order reflects recorded entry time,
        not a verified operational schedule.
      </p>
    </section>
  );
}

function RunwaysPage({ data, flights }) {
  const runwayStats = {};

  flights.forEach((flight) => {
    const runway = flight.runway;

    if (!runway) return;

    if (!runwayStats[runway]) {
      runwayStats[runway] = {
        operations: 0,
        arrivals: 0,
        departures: 0,
        occupancy: [],
      };
    }

    runwayStats[runway].operations += 1;

    if (flight.operation === "arrival") {
      runwayStats[runway].arrivals += 1;
    }

    if (flight.operation === "departure") {
      runwayStats[runway].departures += 1;
    }

    if (flight.occupancy_sec != null) {
      runwayStats[runway].occupancy.push(
        Number(flight.occupancy_sec)
      );
    }
  });

  const getAverage = (values) => {
    if (values.length === 0) return 0;

    return (
      values.reduce((sum, value) => sum + value, 0) /
      values.length
    );
  };

  const getMaximum = (values) => {
    if (values.length === 0) return 0;

    return Math.max(...values);
  };

  const runways = ["09R/27L", "09L/27R"];

  return (
    <section className="section runway-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">RUNWAY CONTROL</p>
          <h2>Runway Overview</h2>
        </div>

        <span className="live-badge">● HISTORICAL DATA</span>
      </div>

      <div className="runway-detail-grid">
        {runways.map((runway) => {
          const stats = runwayStats[runway];

          if (!stats) return null;

          const utilization =
            data.runways[runway]?.utilization_percent ?? 0;

          const averageOccupancy = getAverage(stats.occupancy);

          const maximumOccupancy = getMaximum(stats.occupancy);

          return (
            <div className="runway-detail-card" key={runway}>
              <div className="runway-detail-header">
                <div>
                  <p className="eyebrow">RUNWAY</p>
                  <h2>{runway}</h2>
                </div>

                <span className="status available">
                  ● AVAILABLE
                </span>
              </div>

              <div className="runway-main-stat">
                <strong>
                  {stats.operations.toLocaleString()}
                </strong>

                <span>recorded operations</span>
              </div>

              <div className="runway-stat-grid">
                <div>
                  <span>UTILIZATION</span>
                  <strong>{utilization.toFixed(2)}%</strong>
                </div>

                <div>
                  <span>ARRIVALS</span>
                  <strong>
                    {stats.arrivals.toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>DEPARTURES</span>
                  <strong>
                    {stats.departures.toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>AVG. OCCUPANCY</span>
                  <strong>
                    {averageOccupancy.toFixed(2)} s
                  </strong>
                </div>

                <div>
                  <span>MAX. OCCUPANCY</span>
                  <strong>
                    {maximumOccupancy.toLocaleString()} s
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TimelinePage({ flights }) {
  const timelineFlights = [...flights]
    .sort(
      (a, b) =>
        new Date(a.entry_time) - new Date(b.entry_time)
    )
    .slice(0, 100);

  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">RUNWAY ACTIVITY</p>
          <h2>Operations Timeline</h2>
        </div>

        <span className="live-badge">
          ● HISTORICAL DATA
        </span>
      </div>

      <div className="timeline-card">
        {timelineFlights.map((flight, index) => (
          <div className="timeline-item" key={`${flight.flight_id}-${index}`}>
            <div className="timeline-time">
              {new Date(flight.entry_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div className="timeline-line">
              <span className="timeline-dot"></span>
            </div>

            <div className="timeline-content">
              <div className="timeline-top">
                <strong>
                  {flight.flt_id || flight.flight_id}
                </strong>

                <span
                  className={`operation ${flight.operation.toLowerCase()}`}
                >
                  {flight.operation}
                </span>
              </div>

              <div className="timeline-details">
                <span>
                  Runway: <strong>{flight.runway}</strong>
                </span>

                <span>
                  Aircraft:{" "}
                  <strong>
                    {flight.aircraft_type || "Unknown"}
                  </strong>
                </span>

                <span>
                  Occupancy:{" "}
                  <strong>
                    {Number(flight.occupancy_sec).toFixed(0)} s
                  </strong>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="queue-note">
        Showing the first 100 operations in chronological order.
      </p>
    </section>
  );
}

function AlertsPage({ flights }) {
  const alerts = [];

  flights.forEach((flight, index) => {
    const occupancy = Number(flight.occupancy_sec);

    // Very long runway occupancy
    if (occupancy >= 300) {
      alerts.push({
        id: `long-${flight.flight_id}-${index}`,
        level: occupancy >= 1800 ? "critical" : "warning",
        title:
          occupancy >= 1800
            ? "Extreme runway occupancy"
            : "Long runway occupancy",
        flight: flight.flt_id || flight.flight_id,
        details: `${occupancy.toLocaleString()} seconds on runway ${flight.runway}`,
        time: flight.entry_time,
      });
    }

    // Missing aircraft type
    if (!flight.aircraft_type) {
      alerts.push({
        id: `aircraft-${flight.flight_id}-${index}`,
        level: "info",
        title: "Aircraft type unavailable",
        flight: flight.flt_id || flight.flight_id,
        details: "Aircraft type is missing from the source data",
        time: flight.entry_time,
      });
    }
  });

  // Show most important alerts first
  const priority = {
    critical: 1,
    warning: 2,
    info: 3,
  };

  alerts.sort(
    (a, b) => priority[a.level] - priority[b.level]
  );

  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SYSTEM MONITORING</p>
          <h2>Alerts</h2>
        </div>

        <span className="live-badge">
          ● DATA ANALYSIS
        </span>
      </div>

      <div className="alert-summary">
        <div>
          <strong>
            {alerts.length.toLocaleString()}
          </strong>
          <span>detected conditions</span>
        </div>

        <div>
          <strong>
            {alerts.filter((a) => a.level === "critical").length}
          </strong>
          <span>critical</span>
        </div>

        <div>
          <strong>
            {alerts.filter((a) => a.level === "warning").length}
          </strong>
          <span>warning</span>
        </div>
      </div>

      <div className="alerts-list">
        {alerts.slice(0, 100).map((alert) => (
          <div
            className={`alert-card ${alert.level}`}
            key={alert.id}
          >
            <div className="alert-icon">
              {alert.level === "critical"
                ? "!"
                : alert.level === "warning"
                  ? "⚠"
                  : "i"}
            </div>

            <div className="alert-content">
              <div className="alert-header">
                <strong>{alert.title}</strong>

                <span>
                  {new Date(alert.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p>
                Flight: <strong>{alert.flight}</strong>
              </p>

              <small>{alert.details}</small>
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="info-card">
          <h3>No anomalies detected</h3>
          <p>
            No alert conditions were found in the historical
            workload.
          </p>
        </div>
      )}

      <p className="queue-note">
        Alerts are generated from observed historical runway data.
        They are not scheduler-generated alerts.
      </p>
    </section>
  );
}



function SchedulerComparison({ data }) {
  const results = data?.results;
  const fcfs = results?.fcfs;
  const priority = results?.priority;
  const dynamic = results?.dynamic;

  if (!fcfs || !priority || !dynamic) {
    return (
      <section className="scheduler-comparison">
        <div className="scheduler-heading">
          <div>
            <p className="section-eyebrow">SCHEDULER ENGINE</p>
            <h2>Scheduling Policy Comparison</h2>
          </div>
          <span className="scheduler-status">Awaiting results</span>
        </div>
        <p className="scheduler-note">
          Run the scheduler results script to load FCFS, Priority, and
          Dynamic Priority metrics.
        </p>
      </section>
    );
  }

  const policies = [
    { key: "fcfs", label: "FCFS", name: "First-Come, First-Served" },
    { key: "priority", label: "Priority", name: "Priority-based scheduling" },
    { key: "dynamic", label: "Dynamic Priority", name: "Priority with aging" },
  ];

  const emergencyReduction =
    fcfs.emergency_average_wait_sec > 0
      ? ((fcfs.emergency_average_wait_sec -
          priority.emergency_average_wait_sec) /
          fcfs.emergency_average_wait_sec) *
        100
      : 0;

  const metrics = [
    {
      label: "Average wait",
      key: "average_wait_sec",
      unit: "sec",
      lower: true,
    },
    {
      label: "Maximum wait",
      key: "maximum_wait_sec",
      unit: "sec",
      lower: true,
    },
    {
      label: "Throughput",
      key: "throughput_flights_per_hour",
      unit: "flights/hr",
      lower: false,
    },
    {
      label: "Runway utilization",
      key: "runway_utilization_percent",
      unit: "%",
      lower: false,
    },
  ];

  const formatNumber = (value) =>
    Number(value).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });

  return (
    <section className="scheduler-comparison">
      <div className="scheduler-heading">
        <div>
          <p className="section-eyebrow">SCHEDULER ENGINE</p>
          <h2>Scheduling Policy Comparison</h2>
          <p className="scheduler-subtitle">
            FCFS vs Priority vs Dynamic Priority
          </p>
        </div>
        <span className="scheduler-status">Simulation results</span>
      </div>

      <div className="scheduler-hero">
        <div className="scheduler-hero-copy">
          <span className="scheduler-hero-label">
            EMERGENCY AVERAGE WAIT REDUCTION
          </span>
          <div className="scheduler-hero-value">
            {formatNumber(emergencyReduction)}%
          </div>
          <p>
            {formatNumber(fcfs.emergency_average_wait_sec)} sec
            <span className="scheduler-arrow"> → </span>
            {formatNumber(priority.emergency_average_wait_sec)} sec
          </p>
          <small>FCFS compared with Priority</small>
        </div>
        <div className="scheduler-hero-side">
          <span>Emergency flights</span>
          <strong>{formatNumber(priority.emergency_count)}</strong>
          <small>in this test workload</small>
        </div>
      </div>

      <div className="scheduler-policy-grid">
        {policies.map((policy) => {
          const item = results[policy.key];

          return (
            <article
              className={`scheduler-policy-card ${policy.key}-card`}
              key={policy.key}
            >
              <div className="scheduler-policy-top">
                <span
                  className={`scheduler-policy-dot ${policy.key}-dot`}
                />
                <h3>{policy.label}</h3>
                <span className="scheduler-policy-tag">
                  {policy.key === "fcfs"
                    ? "Baseline"
                    : policy.key === "priority"
                    ? "Emergency-aware"
                    : "Aging"}
                </span>
              </div>
              <p>{policy.name}</p>
              <div className="scheduler-policy-number">
                {formatNumber(item.average_wait_sec)}
                <span> sec avg wait</span>
              </div>
              <div className="scheduler-policy-footer">
                <span>Throughput</span>
                <strong>
                  {formatNumber(item.throughput_flights_per_hour)} flights/hr
                </strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="scheduler-metrics">
        <h3>Performance breakdown</h3>
        {metrics.map((metric) => {
          const values = policies.map((policy) => ({
            ...policy,
            value: results[policy.key][metric.key],
          }));
          const maxValue = Math.max(...values.map((item) => item.value), 1);

          return (
            <div className="scheduler-metric" key={metric.label}>
              <div className="scheduler-metric-heading">
                <span>{metric.label}</span>
                <div>
                  {values.map((item) => (
                    <span key={item.key}>
                      {item.label}: {formatNumber(item.value)} {metric.unit}
                    </span>
                  ))}
                </div>
              </div>

              {values.map((item) => (
                <div className="scheduler-bar-row" key={item.key}>
                  <span className="scheduler-bar-label">{item.label}</span>
                  <div className="scheduler-bar-track">
                    <div
                      className={`scheduler-bar ${item.key}-bar`}
                      style={{
                        width: `${(item.value / maxValue) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="scheduler-insight">
        <strong>What this test shows</strong>
        <p>
          Priority and Dynamic Priority are compared with FCFS using the same
          congested synthetic workload. Dynamic Priority uses aging to increase
          waiting flights' effective priority. Review the measured values to
          determine whether aging changes the results for this workload.
        </p>
      </div>

      <p className="scheduler-disclaimer">
        Experimental simulation only — 500 requests clustered at one time.
        Results do not establish real-world airport safety or performance.
      </p>
    </section>
  );
}


function App() {
  const [data, setData] = useState(null);
  const [flights, setFlights] = useState([]);
  const [schedulerResults, setSchedulerResults] = useState(null);
  const [activePage, setActivePage] = useState("Overview");
  const [introSeen] = useState(
    () => sessionStorage.getItem("aerosched-intro") === "seen"
  );
  const [introPhase, setIntroPhase] = useState(introSeen ? "app" : "intro");

  const intro = introPhase !== "app" && (
    <Intro
      onReveal={() => setIntroPhase("reveal")}
      onDone={() => {
        sessionStorage.setItem("aerosched-intro", "seen");
        setIntroPhase("app");
      }}
    />
  );
  useEffect(() => {
    fetch("/dashboard_data.json")
      .then((response) => response.json())
      .then((json) => setData(json))
      .catch((error) =>
        console.error("Failed to load dashboard data:", error)
      );
    fetch("/aircraft_queue.json")
      .then((response) => response.json())
      .then((json) => setFlights(json))
      .catch((error) =>
        console.error("Failed to load aircraft data:", error)
      );
    fetch("/scheduler_results.json")
      .then((response) => {
        if (!response.ok) throw new Error("Scheduler results unavailable");
        return response.json();
      })
      .then((json) => setSchedulerResults(json))
      .catch((error) =>
        console.error("Failed to load scheduler results:", error)
      );
  }, []);

  if (!data) {
    return (
      <>
        <div className="loading">Loading AeroSched data...</div>
        {intro}
      </>
    );
  }

  return (
    <>
      <div className={`app ${!introSeen && introPhase !== "intro" ? "app-enter" : ""}`}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-mark">✈</div>
            <div>
              <h2>AeroSched</h2>
              <span>RUNWAY CONTROL</span>
            </div>
          </div>

          <nav>
            <button
              className={`nav-item ${activePage === "Overview" ? "active" : ""}`}
              onClick={() => setActivePage("Overview")}
            >
              <span>▦</span>
              Overview
            </button>

            <button
              className={`nav-item ${activePage === "Aircraft Queue" ? "active" : ""
                }`}
              onClick={() => setActivePage("Aircraft Queue")}
            >
              <span>✈</span>
              Aircraft Queue
            </button>

            <button
              className={`nav-item ${activePage === "Runways" ? "active" : ""}`}
              onClick={() => setActivePage("Runways")}
            >
              <span>▤</span>
              Runways
            </button>

            <button
              className={`nav-item ${activePage === "Timeline" ? "active" : ""}`}
              onClick={() => setActivePage("Timeline")}
            >
              <span>◷</span>
              Timeline
            </button>

            <button
              className={`nav-item ${activePage === "Alerts" ? "active" : ""}`}
              onClick={() => setActivePage("Alerts")}
            >
              <span>⚡</span>
              Alerts
            </button>
          </nav>

          <div className="sidebar-bottom">
            <div className="system-status">
              <span className="status-dot"></span>
              System Online
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <header className="topbar">
            <div>
              <p className="eyebrow">AIRPORT CONTROL CENTER</p>
              <h1>
                London Heathrow <span>EGLL</span>
              </h1>
            </div>

            <div className="header-right">
              <div className="traffic">
                <span className="traffic-dot"></span>
                NORMAL TRAFFIC
              </div>

              <div className="date">{data.period}</div>
            </div>
          </header>
          {activePage === "Overview" ? (
            <>
              {/* Statistics */}
              <section className="stats-grid">
                <StatCard
                  title="RUNWAY OPERATIONS"
                  value={data.operations.total.toLocaleString()}
                  subtitle="Recorded operations"
                />

                <StatCard
                  title="DEPARTURES"
                  value={data.operations.departures.toLocaleString()}
                  subtitle={`${(
                    (data.operations.departures / data.operations.total) *
                    100
                  ).toFixed(1)}% of operations`}
                />

                <StatCard
                  title="ARRIVALS"
                  value={data.operations.arrivals.toLocaleString()}
                  subtitle={`${(
                    (data.operations.arrivals / data.operations.total) *
                    100
                  ).toFixed(1)}% of operations`}
                />

                <StatCard
                  title="ACTIVE RUNWAYS"
                  value="2 / 2"
                  subtitle="All runways available"
                />
              </section>

              {/* Runways */}
              <section className="section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">RESOURCE STATUS</p>
                    <h2>Runway Status</h2>
                  </div>

                  <span className="live-badge">● LIVE DATA</span>
                </div>

                <div className="runway-grid">
                  <RunwayCard
                    runway="09R / 27L"
                    status="Available"
                    details={`${data.runways["09R/27L"].operations.toLocaleString()} recorded operations • ${data.runways[
                      "09R/27L"
                    ].utilization_percent.toFixed(2)}% utilization`}
                  />

                  <RunwayCard
                    runway="09L / 27R"
                    status="Available"
                    details={`${data.runways["09L/27R"].operations.toLocaleString()} recorded operations • ${data.runways[
                      "09L/27R"
                    ].utilization_percent.toFixed(2)}% utilization`}
                  />
                </div>
              </section>

              {/* Performance */}
              <section className="section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">PERFORMANCE</p>
                    <h2>Runway Metrics</h2>
                  </div>
                </div>

                <div className="metrics-grid">
                  <div className="metric-card">
                    <span>AVG. OCCUPANCY</span>
                    <strong>{data.occupancy.average_sec.toFixed(2)} s</strong>
                    <small>Observed runway occupancy</small>
                  </div>

                  <div className="metric-card">
                    <span>MAX. OCCUPANCY</span>
                    <strong>
                      {data.occupancy.maximum_sec.toLocaleString()} s
                    </strong>
                    <small>Longest observed operation</small>
                  </div>

                  <div className="metric-card">
                    <span>RUNWAY UTILIZATION</span>
                    <strong>{data.overall_utilization_percent.toFixed(2)}%</strong>
                    <small>Across both EGLL runways</small>
                  </div>

                  <div className="metric-card">
                    <span>OBSERVATION PERIOD</span>
                    <strong>31 Days</strong>
                    <small>{data.period}</small>
                  </div>
                </div>
              </section>

              {/* Bottom information */}
              <section className="bottom-grid">
                <div className="info-card">
                  <p className="eyebrow">DATASET</p>
                  <h3>OPDI — July 2026</h3>
                  <p>
                    Real flight and runway event data processed for
                    AeroSched scheduling experiments.
                  </p>
                </div>

                <div className="info-card">
                  <p className="eyebrow">SCHEDULER</p>
                  <h3>C++ scheduler integrated</h3>
                  <p>
                    FCFS and Priority scheduling compared using a congested synthetic workload.
                  </p>
                </div>
              </section>
              <SchedulerComparison data={schedulerResults} />

            </>
          ) : activePage === "Aircraft Queue" ? (
            <AircraftQueue />
          ) : activePage === "Runways" ? (
            <RunwaysPage data={data} flights={flights} />
          ) : activePage === "Timeline" ? (
            <TimelinePage flights={flights} />
          ) : activePage === "Alerts" ? (
            <AlertsPage flights={flights} />
          ) : (
            <section className="section">
              <div className="info-card">
                <h3>{activePage}</h3>
                <p>This section will be implemented next.</p>
              </div>
            </section>
          )}
        </main>
      </div>
      {intro}
    </>
  );
}

export default App;