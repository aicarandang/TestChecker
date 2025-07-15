import React, { useState } from 'react';
import styles from '../styles/sidebar.module.css';

/**
 * Sidebar component for answer sheets
 * Props:
 * - title: string (sidebar title)
 * - sheets: array (list of answer sheets)
 * - selectedSheetId: string (currently selected sheet id)
 * - onSelectSheet: function (id) => void
 * - onEditSheetName: function (id, newName) => void
 * - onDeleteSheet: function (id) => void
 * - onNewSheet: function () => void
 */
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
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14.06 6.44a1.5 1.5 0 0 0 0-2.12l-1.38-1.38a1.5 1.5 0 0 0-2.12 0l-1.06 1.06 3.5 3.5 1.06-1.06z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    className={styles['sidebar-delete-btn']}
                    onClick={e => { e.stopPropagation(); onDeleteSheet(sheet.id); }}
                    title="Delete"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M6 8l1 8h6l1-8" stroke="#c00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 6h12M9 6V4a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2" stroke="#c00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
