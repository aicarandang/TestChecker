import React, { useState, useEffect } from 'react';
import styles from '../styles/results.module.css';

function stripPrefix(value, prefix) {
  if (!value) return '';
  if (value.toUpperCase().startsWith(prefix)) {
    return value.slice(prefix.length).trim().replace(/^[:\s]+/, '');
  }
  return value;
}

function Results({ sheetId, sheetName }) {
  const [results, setResults] = useState([]);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!sheetId) return;
    const data = JSON.parse(localStorage.getItem(`scanResults_${sheetId}`) || '[]');
    setResults(data);
    setExpanded({});
  }, [sheetId]);

  const handleSaveCSV = () => {
    if (results.length === 0) {
      alert('No results to export');
      return;
    }
    const csvData = results.map((result, index) => ({
      'Name': stripPrefix(result.name, 'NAME'),
      'Section': stripPrefix(result.section, 'COURSE/SECTION'),
      'Score': result.score != null ? result.score : ''
    }));
    const headers = ['Name', 'Section', 'Score'];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    // Use the answer sheet name for the CSV filename
    const safeSheetName = (sheetName || 'results').replace(/[^a-zA-Z0-9-_ ]/g, '_');
    link.setAttribute('download', `${safeSheetName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to get annotated file name
  const getAnnotatedFileName = (originalName) => {
    if (!originalName) return 'annotated_paper_results';
    const dotIdx = originalName.lastIndexOf('.');
    if (dotIdx === -1) return originalName + ' results';
    return originalName.slice(0, dotIdx) + ' results' + originalName.slice(dotIdx);
  };

  const handleToggleExpand = idx => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleDownloadImage = (imgUrl, originalName) => {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = getAnnotatedFileName(originalName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteRow = idx => {
    const updated = results.filter((_, i) => i !== idx);
    setResults(updated);
    localStorage.setItem(`scanResults_${sheetId}`, JSON.stringify(updated));
    setExpanded(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  return (
    <div className={styles['results-outer']}>
      {results.length === 0 ? (
        <div className={styles['results-empty']}>No checked test papers yet.</div>
      ) : (
        <>
          <div className={styles['results-table-container'] + ' ' + styles['page-content-top']}>
            <table className={styles['results-table']}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Section</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => (
                  <React.Fragment key={idx}>
                    <tr>
                      <td>{stripPrefix(r.name, 'NAME')}</td>
                      <td>{stripPrefix(r.section, 'COURSE/SECTION')}</td>
                      <td className={styles['score-cell']}>
                        <span>{r.score != null ? r.score : ''}</span>
                        <div className={styles['score-actions']}>
                          {r.annotated_image && (
                            <button
                              className={styles['results-eye-btn']}
                              onClick={() => handleToggleExpand(idx)}
                              title={expanded[idx] ? 'Hide Details' : 'Show Details'}
                              type="button"
                            >
                              {expanded[idx] ? (
                                // Feather Icons eye-off (eye with slash)
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-5 0-9.27-3.11-11-8a10.05 10.05 0 0 1 5.17-5.46" />
                                  <path d="M1 1l22 22" />
                                  <path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5c1.93 0 3.5-1.57 3.5-3.5 0-.47-.09-.92-.24-1.33" />
                                  <path d="M14.47 14.47A3.5 3.5 0 0 1 12 8.5c-.47 0-.92.09-1.33.24" />
                                  <path d="M22.54 12.11A10.05 10.05 0 0 0 12 4c-1.61 0-3.13.31-4.5.87" />
                                </svg>
                              ) : (
                                // Feather Icons eye (show)
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                              )}
                            </button>
                          )}
                          <button
                            className={styles['results-delete-btn']}
                            onClick={() => handleDeleteRow(idx)}
                            title="Delete row"
                            type="button"
                          >
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="5" x2="15" y2="15" />
                              <line x1="15" y1="5" x2="5" y2="15" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded[idx] && r.annotated_image && (
                      <tr className={styles['results-details-row']}>
                        <td colSpan={3} style={{ background: '#f9f9f9', padding: 0 }}>
                          <div className={styles['results-preview-container']}>
                            <img
                              src={r.annotated_image}
                              alt="Annotated Test Paper"
                              className={styles['results-preview-img']}
                              draggable={false}
                            />
                            <button
                              className={styles['results-download-btn']}
                              title="Download annotated test paper"
                              onClick={() => handleDownloadImage(r.annotated_image, r.file_name)}
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4v12m0 0l-4-4m4 4l4-4" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <rect x="4" y="20" width="16" height="2" rx="1" fill="#333"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles['results-actions']}>
            <button onClick={handleSaveCSV} className={styles['results-save-csv-btn']}>
              Save CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Results;