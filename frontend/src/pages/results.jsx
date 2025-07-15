import React, { useState, useEffect } from 'react';
import styles from '../styles/results.module.css';

function Results({ sheetId }) {
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!sheetId) return;
    const data = JSON.parse(localStorage.getItem(`scanResults_${sheetId}`) || '[]');
    setResults(data);
  }, [sheetId]);

  const handleViewDetails = (result) => {
    setSelected(result);
    setShowModal(true);
  };

  const handleRemoveResult = (idx) => {
    const updated = results.filter((_, i) => i !== idx);
    setResults(updated);
    localStorage.setItem(`scanResults_${sheetId}`, JSON.stringify(updated));
  };

  // Remove all zoom logic
  const handleHidePreview = () => setShowPreview((v) => !v);

  // Add handler to download image
  const handleDownloadImage = () => {
    if (selected && selected.annotated_image) {
      const a = document.createElement('a');
      a.href = selected.annotated_image;
      a.download = 'annotated_test_paper.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelected(null);
    setShowPreview(true);
  };

  return (
    <div className={styles['results-outer']}>
      {results.length === 0 ? (
        <div className={styles['results-empty']}>No checked test papers yet.</div>
      ) : (
        <div className={styles['results-table-container']}>
          <table className={styles['results-table']}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Course/Section</th>
                <th>Score</th>
                <th>Details</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.name || '-'}</td>
                  <td>{r.section || '-'}</td>
                  <td>{r.score != null ? r.score : '-'}</td>
                  <td>
                    {r.annotated_image ? (
                      <button onClick={() => handleViewDetails(r)} className={styles['results-view-btn']}>
                        View Details
                      </button>
                    ) : (
                      <span style={{ color: '#aaa' }}>N/A</span>
                    )}
                  </td>
                  <td>
                    <button onClick={() => handleRemoveResult(idx)} className={styles['results-remove-btn']}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && selected && (
        <div className={styles['results-modal-overlay']} onClick={handleCloseModal}>
          <div className={styles['results-modal']} onClick={e => e.stopPropagation()}>
            <div className={styles['results-modal-scrollable']}>
            <h3>Details for {selected.name || 'Student'}</h3>
            <div className={styles['results-modal-img-container']}>
              {showPreview && (
                <img
                  src={selected.annotated_image}
                  alt="Annotated Test Paper"
                  className={styles['results-modal-img'] + ' ' + styles['fullscreen']}
                  style={{
                    maxWidth: '100vw',
                    maxHeight: '80vh',
                    width: 'auto',
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto',
                    cursor: 'pointer',
                  }}
                  draggable={false}
                  onClick={handleDownloadImage}
                  title="Click to download image"
                />
              )}
              <button onClick={handleHidePreview} className={styles['results-modal-hide']}>{showPreview ? 'Hide Preview' : 'Show Preview'}</button>
            </div>
            {selected.item_results && (
              <ul className={styles['results-item-list'] + ' ' + styles['scrollable-list']}>
                {selected.item_results.map((item, i) => (
                  <li key={i}>
                    Item {item.number}: {item.correct ? '✅' : '❌'} (Your answer: {item.answer}, Correct: {item.correct_answer})
                  </li>
                ))}
              </ul>
            )}
            <button onClick={handleCloseModal} className={styles['results-modal-close']}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Results;