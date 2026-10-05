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

function App() {
  const [data, setData] = useState(null);

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
          <button className="nav-item active">
            <span>▦</span>
            Overview
          </button>

          <button className="nav-item">
            <span>✈</span>
            Aircraft Queue
          </button>

          <button className="nav-item">
            <span>▤</span>
            Runways
          </button>

          <button className="nav-item">
            <span>◷</span>
            Timeline
          </button>

          <button className="nav-item">
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
      </main>
    </div>
  );
}

export default App;