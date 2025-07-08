import React from 'react';

function Dashboard() {
  return (
    <div className="dashboard-outer">
      <div className="dashboard-container">
        <aside className="sidebar">
          <h2>Dashboard</h2>
          <button className="new-answer-sheet-btn" disabled>+ New Answer Sheet</button>
        </aside>
        <main className="dashboard-content">
          <h1 className="title">TEST CHECKER</h1>
          <p className="subtitle">Create sheets. Upload scans. Get results.</p>
          <button className="create-answer-sheet-btn">Create Answer Sheet</button>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
