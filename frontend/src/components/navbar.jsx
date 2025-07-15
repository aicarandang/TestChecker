import React from 'react';
import styles from '../styles/navbar.module.css';

const Navbar = ({ tabs, activeTab, onTabChange }) => (
  <nav className={styles.navbar}>
    {tabs.map(tab => (
      <button
        key={tab.key}
        className={`${styles.navBtn} ${activeTab === tab.key ? styles.active : ''}`}
        type="button"
        onClick={() => onTabChange(tab.key)}
        aria-current={activeTab === tab.key ? 'page' : undefined}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);

export default Navbar;
