import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/styles.css';

function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="dashboard-outer">
      <div className="dashboard-container">
        <aside className="sidebar">
          <h2>Dashboard</h2>
          <button className="new-answer-sheet-btn" disabled>+ New Answer Sheet</button>
        </aside>
        <main className="dashboard-content">
          <div className="dashboard-header">
            <h1 className="dashboard-title">TEST CHECKER</h1>
            <p className="dashboard-subtitle">Create sheets. Upload scans. Get results.</p>
          </div>
          <div className="dashboard-main">
            <button className="dashboard-create-btn" onClick={() => navigate('/answersheet')}>
              Create Answer Sheet
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
