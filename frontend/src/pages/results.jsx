import React, { useState, useEffect } from 'react';
import styles from '../styles/results.module.css';
import * as XLSX from 'xlsx';

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

  // Add Excel export functionality
  const handleExportToExcel = () => {
    if (results.length === 0) {
      alert('No results to export');
      return;
    }

    // Prepare data for Excel
    const excelData = results.map((result, index) => {
      const row = {
        'No.': index + 1,
        'Name': result.name || '-',
        'Course/Section': result.section || '-',
        'Score': result.score != null ? result.score : '-',
        'Total Items': result.item_results ? result.item_results.length : 0,
        'Correct Answers': result.item_results ? result.item_results.filter(item => item.correct).length : 0,
        'Percentage': result.item_results && result.item_results.length > 0 
          ? `${((result.score / result.item_results.length) * 100).toFixed(2)}%` 
          : '-'
      };

      // Add individual item results
      if (result.item_results) {
        result.item_results.forEach((item, itemIndex) => {
          row[`Item ${item.number} Answer`] = item.answer || '-';
          row[`Item ${item.number} Correct Answer`] = item.correct_answer || '-';
          row[`Item ${item.number} Status`] = item.correct ? 'Correct' : 'Incorrect';
        });
      }

      return row;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const colWidths = [];
    excelData.forEach(row => {
      Object.keys(row).forEach((key, index) => {
        const length = Math.max(key.length, String(row[key]).length);
        colWidths[index] = Math.max(colWidths[index] || 0, length);
      });
    });

    ws['!cols'] = colWidths.map(width => ({ width: Math.min(width + 2, 50) }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Test Results');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `test_results_${timestamp}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
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
        <>
          <div className={styles['results-header']}>
            <h2>Test Results</h2>
            <button 
              onClick={handleExportToExcel} 
              className={styles['results-export-btn']}
              title="Export all results to Excel file"
            >
              📊 Export to Excel
            </button>
          </div>
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
        </>
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