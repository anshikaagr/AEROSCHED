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

function App() {
  const [data, setData] = useState(null);
  const [activePage, setActivePage] = useState("Overview");

  useEffect(() => {
    fetch("/dashboard_data.json")
      .then((response) => response.json())
      .then((json) => setData(json))
      .catch((error) =>
        console.error("Failed to load dashboard data:", error)
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