import React, { useState } from 'react';
import styles from '../styles/sidebar.module.css';

const Sidebar = ({
  title,
  sheets = [],
  selectedSheetId,
  onSelectSheet,
  onEditSheetName,
  onDeleteSheet,
  onNewSheet,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (id, name) => {
    setEditingId(id);
    setEditValue(name);
  };

  const finishEdit = (id) => {
    if (editValue.trim() && editValue !== sheets.find(s => s.id === id)?.name) {
      onEditSheetName(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  return (
    <aside className={styles.sidebar}>
      {title && <h2 className={styles.sidebarTitle}>{title}</h2>}
      {onNewSheet && (
        <button className={styles.sidebarActionBtn} onClick={onNewSheet}>+ New Answer Sheet</button>
      )}
      <div className={styles.sidebarList}>
        {sheets.map(sheet => (
          <div
            key={sheet.id}
            className={
              `${styles['sidebar-answer-item']} ${sheet.id === selectedSheetId ? styles['active'] : ''}`
            }
            onClick={() => onSelectSheet(sheet.id)}
          >
            {editingId === sheet.id ? (
              <input
                className={styles['sidebar-answer-edit-input']}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => finishEdit(sheet.id)}
                autoFocus
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter') finishEdit(sheet.id);
                  if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
                }}
              />
            ) : (
              <>
                <span className={styles['sidebar-answer-title']}>{sheet.name}</span>
                <div className={styles['sidebar-answer-actions']}>
                  <button
                    className={styles['sidebar-edit-btn']}
                    onClick={e => { e.stopPropagation(); startEdit(sheet.id, sheet.name); }}
                    title="Rename"
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    className={styles['sidebar-delete-btn']}
                    onClick={e => { e.stopPropagation(); onDeleteSheet(sheet.id); }}
                    title="Delete"
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
