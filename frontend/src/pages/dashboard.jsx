import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/sidebar.css';
import '../styles/dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="dashboard-outer">
      <div className="dashboard-container">
        <aside className="sidebar">
          <h2>Dashboard</h2>
          <button className="new-answer-sheet-btn">+ New Answer Sheet</button>
        </aside>
        <div className="dashboard-main-container">
          <div className="dashboard-content">
            <h1 className="dashboard-title">TEST CHECKER</h1>
            <p className="dashboard-subtitle">Create sheets. Upload scans. Get results.</p>
            <button className="dashboard-create-btn" onClick={() => navigate('/answersheet')}>Create Answer Sheet</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;