import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchAnalyticsSummary, fetchTopSegments } from "../services/analyticsAPI";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";

import "./Analytics.css";

export default function Analytics({ onClose }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics data
  const [analytics, setAnalytics] = useState(null);
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const [topSegments, setTopSegments] = useState([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);

  // Fetch initial analytics summary
  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchAnalyticsSummary(token);
        setAnalytics(data);
        // Set default selected label (first one with annotations)
        if (data.labels && data.labels.length > 0) {
          setSelectedLabelId(data.labels[0].id);
        }
      } catch (err) {
        console.error("Error loading analytics:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Fetch top segments when selected label changes
  useEffect(() => {
    if (!token || !selectedLabelId || !analytics) return;

    (async () => {
      try {
        setSegmentsLoading(true);
        const data = await fetchTopSegments(selectedLabelId, 10, token);
        setTopSegments(data.topSegments || []);
      } catch (err) {
        console.error("Error loading segments:", err);
        setTopSegments([]);
      } finally {
        setSegmentsLoading(false);
      }
    })();
  }, [token, selectedLabelId, analytics]);

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <h1>Analytics & Statistics</h1>
          <button className="btn btn-secondary" onClick={onClose}>
            ← Back
          </button>
        </div>
        <div className="analytics-loading">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <h1>Analytics & Statistics</h1>
          <button className="btn btn-secondary" onClick={onClose}>
            ← Back
          </button>
        </div>
        <div className="analytics-error">Error: {error}</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <h1>Analytics & Statistics</h1>
          <button className="btn btn-secondary" onClick={onClose}>
            ← Back
          </button>
        </div>
        <div className="analytics-empty">No analytics data available</div>
      </div>
    );
  }

  // Prepare pie chart data
  const pieData = analytics.labels.map(label => ({
    name: label.name,
    value: label.count
  }));

  // Prepare bar chart data
  const barData = analytics.labels.slice(0, 10).map(label => ({
    name: label.name,
    annotations: label.count,
    avgLength: Math.round(label.averageLength)
  }));

  // Color palette for charts
  const COLORS = [
    "#2563eb", "#16a34a", "#dc2626", "#7c3aed",
    "#ea580c", "#0891b2", "#ca8a04", "#db2777",
    "#7c2d12", "#155e75"
  ];

  return (
    <div className="analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <h1>Analytics & Statistics</h1>
        <button className="btn btn-secondary" onClick={onClose}>
          ← Back
        </button>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card">
          <h3>Total Annotations</h3>
          <div className="summary-value">{analytics.totalAnnotations}</div>
        </div>
        <div className="summary-card">
          <h3>Total Labels</h3>
          <div className="summary-value">{analytics.totalLabels}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="analytics-charts">
        {/* Pie Chart */}
        <div className="chart-container">
          <h2>Label Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>No data to display</p>
          )}
        </div>

        {/* Bar Chart */}
        <div className="chart-container">
          <h2>Annotations per Label</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="annotations" fill="#2563eb" name="Annotation Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No data to display</p>
          )}
        </div>
      </div>

      {/* Segments Section */}
      <div className="analytics-segments">
        <h2>Top Segments by Label</h2>
        <div className="label-selector">
          <label htmlFor="label-select">Select Label:</label>
          <select
            id="label-select"
            value={selectedLabelId || ""}
            onChange={(e) => setSelectedLabelId(parseInt(e.target.value))}
            disabled={segmentsLoading}
          >
            <option value="">-- Choose a label --</option>
            {analytics.labels.map(label => (
              <option key={label.id} value={label.id}>
                {label.name} ({label.count} annotations)
              </option>
            ))}
          </select>
        </div>

        {segmentsLoading ? (
          <div className="segments-loading">Loading segments...</div>
        ) : topSegments.length > 0 ? (
          <div className="segments-list">
            <p className="segments-info">
              Showing top {topSegments.length} segments (500 characters each) with highest concentration of the selected label
            </p>
            {topSegments.map((segment, index) => (
              <div key={index} className="segment-card">
                <div className="segment-header">
                  <h4>Segment {segment.segmentIndex} (chars {segment.startChar}-{segment.endChar})</h4>
                  <span className="segment-badge">{segment.annotationCount} annotations</span>
                </div>
                <p className="segment-text">{segment.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="segments-empty">
            No segments found for this label. Select a different label or check your annotations.
          </div>
        )}
      </div>

      {/* Detailed Label Stats Table */}
      <div className="analytics-table">
        <h2>Detailed Label Statistics</h2>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Annotations</th>
              <th>Avg Length</th>
              <th>Total Length</th>
            </tr>
          </thead>
          <tbody>
            {analytics.labels.map(label => (
              <tr key={label.id}>
                <td>
                  <span
                    className="label-color-dot"
                    style={{ backgroundColor: label.color || "#999" }}
                  ></span>
                  {label.name}
                </td>
                <td>{label.count}</td>
                <td>{label.averageLength}</td>
                <td>{label.totalLength}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
