import React, { useState } from 'react';

function Results() {
  const selectedSheetId = localStorage.getItem('selectedSheetId');
  const results = JSON.parse(localStorage.getItem(`scanResults_${selectedSheetId}`) || '[]');
  const [expandedIdx, setExpandedIdx] = useState(null);
  return (
    <div style={{ padding: '2rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.1rem' }}>
        <thead>
          <tr style={{ background: '#f7f0e6' }}>
            <th style={{ border: '1px solid #ccc', padding: '0.7rem', textAlign: 'left' }}>Name</th>
            <th style={{ border: '1px solid #ccc', padding: '0.7rem', textAlign: 'left' }}>Section</th>
            <th style={{ border: '1px solid #ccc', padding: '0.7rem', textAlign: 'left' }}>Score</th>
            <th style={{ border: '1px solid #ccc', padding: '0.7rem', textAlign: 'left' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {results.length > 0 && results.map((r, i) => (
            <React.Fragment key={i}>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '0.7rem' }}>{r.name}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.7rem' }}>{r.section}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.7rem' }}>{r.score}</td>
                <td style={{ border: '1px solid #ccc', padding: '0.7rem' }}>
                  <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} style={{ cursor: 'pointer' }}>
                    {expandedIdx === i ? 'Hide' : 'View'}
                  </button>
                </td>
              </tr>
              {expandedIdx === i && (
                <tr>
                  <td colSpan={4} style={{ background: '#faf7f2', padding: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Item</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Student Answer</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Correct Answer</th>
                          <th style={{ border: '1px solid #ccc', padding: '0.4rem' }}>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.breakdown.map((b, j) => (
                          <tr key={j}>
                            <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{b.item}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{b.student}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{b.correct}</td>
                            <td style={{ border: '1px solid #ccc', padding: '0.4rem', color: b.isCorrect ? 'green' : 'red', fontWeight: 600 }}>
                              {b.isCorrect ? '✔' : '✘'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Results;