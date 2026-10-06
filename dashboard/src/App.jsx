import "./App.css";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch("/aircraft_queue.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load aircraft_queue.json: ${response.status}`
          );
        }

        return response.json();
      })
      .then((json) => {
        console.log("Aircraft queue loaded:", json.length, "records");
        setFlights(json);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Aircraft queue error:", error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="section">
        <div className="info-card">
          <h3>Loading Aircraft Queue...</h3>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section">
        <div className="info-card">
          <h3>Unable to load Aircraft Queue</h3>
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
          <h2>Aircraft Queue</h2>
        </div>

        <span className="live-badge">
          ● {flights.length.toLocaleString()} RECORDS
        </span>
      </div>

      <div className="info-card">
        <h3>Historical EGLL Operations</h3>
        <p>
          Real runway operations from the July 2026 OPDI dataset.
        </p>
      </div>

      <div className="queue-table-container">
        <table className="queue-table">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Aircraft</th>
              <th>Operation</th>
              <th>Runway</th>
              <th>Entry Time</th>
              <th>Occupancy</th>
            </tr>
          </thead>

          <tbody>
            {flights.slice(0, 100).map((flight, index) => (
              <tr key={`${flight.flight_id}-${index}`}>
                <td>{flight.flt_id || flight.flight_id}</td>

                <td>
                  {flight.aircraft_type || "Unknown"}
                </td>

                <td>
                  <span
                    className={`operation ${flight.operation.toLowerCase()}`}
                  >
                    {flight.operation}
                  </span>
                </td>

                <td>{flight.runway}</td>

                <td>
                  {new Date(flight.entry_time).toLocaleString()}
                </td>

                <td>
                  {Number(flight.occupancy_sec).toFixed(0)} s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="queue-note">
        Showing the first 100 records of{" "}
        {flights.length.toLocaleString()} historical runway operations.
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

function App() {
  const [data, setData] = useState(null);
  const [flights, setFlights] = useState([]);
  const [activePage, setActivePage] = useState("Overview");

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
  }, []);

  if (!data) {
    return <div className="loading">Loading AeroSched data...</div>;
  }

  return (
    <div className="app">
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
            className={`nav-item ${
              activePage === "Aircraft Queue" ? "active" : ""
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
            <h3>Awaiting Core Engine</h3>
            <p>
              FCFS, Priority, Aging and multi-runway scheduling
              will appear here after integration.
            </p>
          </div>
        </section>

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
  );
}

export default App;