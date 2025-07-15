import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import styles from '../styles/dashboard.module.css';

function Dashboard() {
  const navigate = useNavigate();

  const handleCreate = () => {
    const saved = localStorage.getItem('answerSheets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          navigate('/generate');
          return;
        }
      } catch {}
    }
    navigate('/answersheet');
  };

  return (
    <div className={styles['dashboard-outer']}>
      <div className={styles['dashboard-container']}>
        <Sidebar title="Dashboard" onNewSheet={handleCreate} />
        <div className={styles['dashboard-main-container']}>
          <div className={styles['dashboard-content']}>
            <h1 className={styles['dashboard-title']}>SNAPCHECK</h1>
            <p className={styles['dashboard-subtitle']}>Create sheets. Upload scans. Get results.</p>
            <button className={styles['dashboard-create-btn']} onClick={handleCreate}>
              Create Answer Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;