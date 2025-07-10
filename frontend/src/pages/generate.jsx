import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/sidebar.css';
import styles from '../styles/generate.module.css';
import AnswerKey from './answer';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import UploadSheets from './upload';

const NAV_TABS = [
  { key: 'generate', label: 'Generate Sheet' },
  { key: 'answer', label: 'Add Answer Key' },
  { key: 'upload', label: 'Upload Sheets' },
  { key: 'results', label: 'Results' },
];

function GenerateSheet() {
  const location = useLocation();
  const initialData = location.state || {};
  const [activeTab, setActiveTab] = useState('generate');
  const [sheetName, setSheetName] = useState('Answer Sheet 1');
  const [editingName, setEditingName] = useState(false);
  const [form, setForm] = useState({
    examType: initialData.examType || '',
    academicTerm: initialData.academicTerm || '',
    subjectName: initialData.subjectName || '',
    testDirections: initialData.testDirections || '',
    numItems: initialData.numItems || '',
    numChoices: initialData.numChoices || '',
  });
  const [showExamDropdown, setShowExamDropdown] = useState(false);
  const [showChoicesDropdown, setShowChoicesDropdown] = useState(false);
  const examOptions = ['MIDTERM EXAMINATION', 'FINAL EXAMINATION', 'SHORT QUIZ', 'LONG QUIZ'];
  const numChoicesOptions = [
    '2 (A, B)',
    '3 (A, B, C)',
    '4 (A, B, C, D)',
    '5 (A, B, C, D, E)',
    '6 (A, B, C, D, E, F)'
  ];
  const examDropdownRef = React.useRef(null);
  const choicesDropdownRef = React.useRef(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const testDirectionsRef = useRef(null);

  // Helper to get minimum height for 2 rows
  const getMinHeight = () => {
    // Create a temporary textarea to measure 2 rows
    const temp = document.createElement('textarea');
    temp.rows = 2;
    temp.style.visibility = 'hidden';
    temp.style.position = 'absolute';
    temp.style.height = 'auto';
    temp.style.padding = '0';
    temp.style.border = 'none';
    temp.style.font = 'inherit';
    document.body.appendChild(temp);
    const minHeight = temp.scrollHeight;
    document.body.removeChild(temp);
    return minHeight;
  };

  // Restore height from localStorage if available on initial mount
  useEffect(() => {
    if (testDirectionsRef.current) {
      const savedHeight = localStorage.getItem('testDirectionsHeight');
      if (savedHeight) {
        testDirectionsRef.current.style.height = savedHeight + 'px';
      } else {
        // Set to min height for 2 rows
        const minHeight = getMinHeight();
        testDirectionsRef.current.style.height = minHeight + 'px';
      }
    }
  }, []);

  // Restore height every time the generate tab becomes active
  useEffect(() => {
    if (activeTab === 'generate' && testDirectionsRef.current) {
      const savedHeight = localStorage.getItem('testDirectionsHeight');
      if (savedHeight) {
        testDirectionsRef.current.style.height = savedHeight + 'px';
      } else {
        const minHeight = getMinHeight();
        testDirectionsRef.current.style.height = minHeight + 'px';
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (testDirectionsRef.current) {
      // Always auto-resize to fit content, but never less than 2 rows
      testDirectionsRef.current.style.height = 'auto';
      const minHeight = getMinHeight();
      const newHeight = Math.max(testDirectionsRef.current.scrollHeight, minHeight);
      testDirectionsRef.current.style.height = newHeight + 'px';
    }
  }, [form.testDirections]);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (showExamDropdown && examDropdownRef.current && !examDropdownRef.current.contains(event.target)) {
        setShowExamDropdown(false);
      }
      if (showChoicesDropdown && choicesDropdownRef.current && !choicesDropdownRef.current.contains(event.target)) {
        setShowChoicesDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExamDropdown, showChoicesDropdown]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'testDirections') {
      handleTextareaResize(e);
    }
  };

  const handleNameEdit = () => setEditingName(true);
  const handleNameChange = (e) => setSheetName(e.target.value);
  const handleNameBlur = () => setEditingName(false);

  const handleExamTypeSelect = (option) => {
    setForm((prev) => ({ ...prev, examType: option }));
    setShowExamDropdown(false);
  };

  const handleNumChoicesSelect = (option) => {
    setForm((prev) => ({ ...prev, numChoices: option.split(' ')[0] }));
    setShowChoicesDropdown(false);
  };
  const handleChoicesDropdownToggle = () => {
    setShowChoicesDropdown((v) => !v);
  };

  const handleTextareaResize = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    const minHeight = getMinHeight();
    const newHeight = Math.max(textarea.scrollHeight, minHeight);
    textarea.style.height = newHeight + 'px';
    // Persist height
    localStorage.setItem('testDirectionsHeight', newHeight);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!form.examType || !form.subjectName || !form.testDirections || !form.numItems || !form.numChoices) {
      return;
    }
    handleGeneratePDF();
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageMargin = 8;
    const yStart = 48;
    const maxItemsPerPage = 50;
    const itemsPerColumn = 25;
    const groupGap = 32;
    const bubbleR = 7;
    const rowH = 22;
    const colW = 20;
    const numW = 20;
    const gridTopGap = 10;
    const gridBottomGap = 10;
    const directionsGap = 14;

    const numItems = parseInt(form.numItems) || 50;
    const numChoices = parseInt(form.numChoices) || 4;
    const choiceLabels = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, numChoices);
    const testDirectionsText = form.testDirections || 'Test I: Shade the circle that correspond to the letter of your chosen answer. Any kind of erasure or overwriting will invalidate your answer.';

    // Helper to render header and directions, returns new y after rendering
    function renderHeaderAndDirections(doc, y) {
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      doc.text(form.examType || 'EXAMINATION', pageWidth / 2, y, { align: 'center' });
      y += 22;
      doc.setFontSize(13);
      doc.text(form.subjectName || 'Subject Name', pageWidth / 2, y, { align: 'center' });
      y += 18;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.text(form.academicTerm || 'TERM, S.Y. 20XX - 20XX', pageWidth / 2, y, { align: 'center' });
      y += 28;
      const boxWidth = (pageWidth - 96) / 2;
      doc.setFontSize(11);
      doc.setLineWidth(1);
      doc.rect(48, y, boxWidth, 24);
      doc.text('NAME:', 54, y + 16);
      doc.rect(48 + boxWidth, y, boxWidth, 24);
      doc.text('DATE:', 54 + boxWidth, y + 16);
      y += 24;
      doc.rect(48, y, boxWidth, 24);
      doc.text('COURSE/SECTION:', 54, y + 16);
      doc.rect(48 + boxWidth, y, boxWidth, 24);
      doc.text('SCORE:', 54 + boxWidth, y + 16);
      y += 36;
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      y += directionsGap;
      const wrapped = doc.splitTextToSize(testDirectionsText, pageWidth - 96);
      doc.text(wrapped, 48, y, { maxWidth: pageWidth - 96 });
      const lineHeight = doc.getTextDimensions('Test')["h"] || 13;
      const textHeight = wrapped.length * lineHeight;
      y += textHeight;
      y += directionsGap;
      return y;
    }

    function renderBorder(doc) {
      doc.setLineWidth(2);
      doc.rect(pageMargin, pageMargin, pageWidth - 2 * pageMargin, pageHeight - 2 * pageMargin);
    }

    function renderAnswerGrid(doc, y, startNum, endNum) {
      const col1Start = startNum;
      const col1End = Math.min(startNum + itemsPerColumn - 1, endNum);
      const col2Start = col1End + 1;
      const col2End = endNum;
      const colWidth = (pageWidth - 120) / 2; // 120 = 2*60 margin
      const colX = [60, 60 + colWidth];
      let maxY = y;
      const numberWidth = 18;
      const gap = 8;
      const groupWidth = numberWidth + gap + numChoices * colW;
      const groupOffset = (colWidth - groupWidth) / 2;
      
      [
        [col1Start, col1End, colX[0]],
        [col2Start, col2End, colX[1]]
      ].forEach(([from, to, x]) => {
        if (from <= to) {
          // Draw letter labels above the first row of this column only if there are answer numbers
          for (let cidx = 0; cidx < numChoices; cidx++) {
            doc.setFont('times', 'bold');
            doc.setFontSize(10);
            doc.text(choiceLabels[cidx], x + groupOffset + numberWidth + gap + cidx * colW, y - 5, { align: 'center' });
          }
        }
        for (let i = from; i <= to; i++) {
          const yRow = y + (i - from) * rowH;
          doc.setFont('times', 'normal');
          doc.setFontSize(11);
          // Number left-aligned, with a small gap to the first bubble
          doc.text(`${i}.`, x + groupOffset, yRow + bubbleR + 13, { align: 'left' });
          for (let cidx = 0; cidx < numChoices; cidx++) {
            doc.setLineWidth(1);
            doc.circle(x + groupOffset + numberWidth + gap + cidx * colW, yRow + bubbleR + 9, bubbleR, 'S');
          }
          maxY = Math.max(maxY, yRow + bubbleR * 2 + 9);
        }
      });
      return maxY + gridBottomGap;
    }

    let page = 0;
    let itemNum = 1;
    while (itemNum <= numItems) {
      if (page > 0) doc.addPage();
      renderBorder(doc);
      let y = renderHeaderAndDirections(doc, yStart);
      if (y + rowH + gridBottomGap > pageHeight - pageMargin) {
        doc.addPage();
        renderBorder(doc);
        y = renderHeaderAndDirections(doc, yStart);
      }
      let pageEnd = Math.min(itemNum + maxItemsPerPage - 1, numItems);
      let gridHeight = (Math.min(pageEnd, itemNum + itemsPerColumn - 1) - itemNum + 1) * rowH;
      if (pageEnd > itemNum + itemsPerColumn - 1) {
        gridHeight = Math.max(gridHeight, (pageEnd - (itemNum + itemsPerColumn) + 1) * rowH);
      }
      if (y + gridHeight + gridBottomGap > pageHeight - pageMargin) {
        doc.addPage();
        renderBorder(doc);
        y = renderHeaderAndDirections(doc, yStart);
      }
      const yAfterGrid = renderAnswerGrid(doc, y, itemNum, pageEnd);
      itemNum = pageEnd + 1;
      page++;
    }
    doc.save('answer-sheet.pdf');
  };

  const handleNewAnswerSheet = () => {
    setSheetName('Answer Sheet 1');
    setEditingName(false);
    setForm({
      examType: '',
      academicTerm: '',
      subjectName: '',
      testDirections: '',
      numItems: '',
      numChoices: '',
    });
    setShowExamDropdown(false);
    setShowChoicesDropdown(false);
    if (location.pathname !== '/generate') {
      setActiveTab('generate');
      window.history.replaceState({}, '', '/generate');
    } else {
      setActiveTab('generate');
    }
  };

  return (
    <div className={styles['generate-sheet-outer']}>
      <div className={styles['generate-sheet-container']}>
        <aside className="sidebar">
          <h2>Dashboard</h2>
          <button className="new-answer-sheet-btn">+ New Answer Sheet</button>
          <div className="sidebar-answer-list">
            <div className="sidebar-answer-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {editingName ? (
                <input
                  className="sidebar-answer-edit-input"
                  value={sheetName}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  autoFocus
                />
              ) : (
                <>
                  <span className="sidebar-answer-title">{sheetName}</span>
                  <button className="sidebar-edit-btn" onClick={handleNameEdit} title="Rename">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14.06 6.44a1.5 1.5 0 0 0 0-2.12l-1.38-1.38a1.5 1.5 0 0 0-2.12 0l-1.06 1.06 3.5 3.5 1.06-1.06z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
        <main className={styles['generate-sheet-content']}>
          <h2 className={styles['generate-sheet-title']}>{sheetName}</h2>
          <nav className={styles['generate-sheet-navbar']}>
            {NAV_TABS.map((tab) => (
              <button
                key={tab.key}
                className={
                  styles['generate-sheet-nav-btn'] + (activeTab === tab.key ? ' ' + styles['active'] : '')
                }
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-current={activeTab === tab.key ? 'page' : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className={styles['generate-sheet-scrollable']}>
          {activeTab === 'generate' && (
              <form className={styles['generate-sheet-form']} autoComplete="off" onSubmit={handleFormSubmit}>
                <div className={styles['generate-sheet-row']}>
                  <div className={styles['generate-sheet-col']}>
                    <label htmlFor="examType">Exam Type <span className={styles['required']}>*</span></label>
                    <div className={styles['custom-select-container']} ref={examDropdownRef}>
                  <input
                        className={`${styles['input']} ${styles['custom-select-input']}`}
                    id="examType"
                    name="examType"
                    type="text"
                    value={form.examType}
                    onChange={handleFormChange}
                        autoComplete="off"
                        onClick={() => setShowExamDropdown(true)}
                      />
                      {submitAttempted && !form.examType && (
                        <div style={{ color: '#dc3545', fontSize: '0.97rem', marginTop: 2 }}>Exam Type is required.</div>
                      )}
                      <button type="button" className={styles['custom-select-arrow']} onClick={() => setShowExamDropdown((v) => !v)}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path stroke="#6b7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                        </svg>
                      </button>
                      {showExamDropdown && (
                        <div className={styles['custom-select-dropdown']}>
                          {examOptions.map((option) => (
                            <div key={option} className={styles['custom-select-option']} onClick={() => handleExamTypeSelect(option)}>
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
                  <div className={styles['generate-sheet-col']}>
                  <label htmlFor="academicTerm">Academic Term</label>
                  <input
                      className={styles['input']}
                    id="academicTerm"
                    name="academicTerm"
                    type="text"
                    value={form.academicTerm}
                    onChange={handleFormChange}
                      autoComplete="off"
                  />
                </div>
              </div>
                <div className={styles['generate-sheet-row']}>
                  <div className={styles['generate-sheet-col']} style={{ width: '100%' }}>
                    <label htmlFor="subjectName">Subject Name <span className={styles['required']}>*</span></label>
                <input
                      className={styles['input']}
                  id="subjectName"
                  name="subjectName"
                  type="text"
                  value={form.subjectName}
                  onChange={handleFormChange}
                      autoComplete="off"
                    />
                    {submitAttempted && !form.subjectName && (
                      <div style={{ color: '#dc3545', fontSize: '0.97rem', marginTop: 2 }}>Subject Name is required.</div>
                    )}
                  </div>
                </div>
                <div className={styles['form-group']}>
                  <label>Display</label>
                  <div className={styles['generate-sheet-row']}>
                    <div className={styles['generate-sheet-col']}>
                      <input className={styles['input']} type="text" placeholder="Name:" disabled />
                    </div>
                    <div className={styles['generate-sheet-col']}>
                      <input className={styles['input']} type="text" placeholder="Date:" disabled />
                    </div>
                  </div>
                  <div className={styles['generate-sheet-row']}>
                    <div className={styles['generate-sheet-col']}>
                      <input className={styles['input']} type="text" placeholder="Course/Section:" disabled />
                    </div>
                    <div className={styles['generate-sheet-col']}>
                      <input className={styles['input']} type="text" placeholder="Score:" disabled />
                    </div>
                  </div>
                </div>
                <div className={styles['form-group']}>
                  <label htmlFor="testDirections">Test Directions <span className={styles['required']}>*</span></label>
                <textarea
                    className={styles['input']}
                  id="testDirections"
                  name="testDirections"
                  rows={2}
                    onInput={handleTextareaResize}
                    onChange={handleFormChange}
                  value={form.testDirections}
                    autoComplete="off"
                    style={{overflow: 'hidden', resize: 'none'}}
                    ref={testDirectionsRef}
                  />
                  {submitAttempted && !form.testDirections && (
                    <div style={{ color: '#dc3545', fontSize: '0.97rem', marginTop: 2 }}>Test Directions are required.</div>
                  )}
              </div>
                <div className={styles['generate-sheet-row']}>
                  <div className={styles['generate-sheet-col']}>
                    <label htmlFor="numItems">Number of Items <span className={styles['required']}>*</span></label>
                  <input
                      className={styles['input']}
                    id="numItems"
                    name="numItems"
                    type="number"
                    min="1"
                    max="300"
                    value={form.numItems}
                    onChange={handleFormChange}
                      autoComplete="off"
                  />
                    {submitAttempted && !form.numItems && (
                      <div style={{ color: '#dc3545', fontSize: '0.97rem', marginTop: 2 }}>Number of Items is required.</div>
                    )}
                  </div>
                  <div className={styles['generate-sheet-col']}>
                    <label htmlFor="numChoices">Number of Choices <span className={styles['required']}>*</span></label>
                    <div className={styles['custom-select-container']} ref={choicesDropdownRef}>
                      <input
                        className={`${styles['input']} ${styles['custom-select-input']}`}
                        id="numChoices"
                        name="numChoices"
                        type="text"
                        value={(() => {
                          if (!form.numChoices) return '';
                          const labels = ['A','B','C','D','E','F'].slice(0, Number(form.numChoices));
                          return labels.length ? `${form.numChoices} (${labels.join(', ')})` : form.numChoices;
                        })()}
                        onChange={() => {}}
                        readOnly
                        onClick={handleChoicesDropdownToggle}
                        style={{ cursor: 'pointer' }}
                        autoComplete="off"
                      />
                      {submitAttempted && !form.numChoices && (
                        <div style={{ color: '#dc3545', fontSize: '0.97rem', marginTop: 2 }}>Number of Choices is required.</div>
                      )}
                      <button type="button" className={styles['custom-select-arrow']} onClick={handleChoicesDropdownToggle}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <path stroke="#6b7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                        </svg>
                      </button>
                      {showChoicesDropdown && (
                        <div className={styles['customSelectDropdownUp']}>
                          {numChoicesOptions.map((option) => (
                            <div key={option} className={styles['custom-select-option']} onClick={() => handleNumChoicesSelect(option)}>
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles['generate-sheet-btn-row']}>
                  <button className={styles['generate-sheet-create-btn']} type="submit"
                    disabled={
                      !form.examType ||
                      !form.subjectName ||
                      !form.testDirections ||
                      !form.numItems ||
                      !form.numChoices
                    }
                  >
                    Generate Answer Sheet
                </button>
              </div>
            </form>
          )}
          {activeTab === 'answer' && (
            <AnswerKey examData={form} />
          )}
          {activeTab === 'upload' && (
            <UploadSheets />
          )}
          {activeTab === 'results' && (
            <ResultsTab />
          )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ResultsTab component for Results tab
function ResultsTab() {
  const [allResults, setAllResults] = useState([]);
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('allOmrResults');
      if (saved) setAllResults(JSON.parse(saved));
    } catch {}
  }, []);
  if (!allResults.length) return <div>No results available. Please scan a sheet first.</div>;
  const current = allResults[selected];
  return (
    <div>
      <h2>Scanned Sheets Results</h2>
      <div style={{ margin: '12px 0' }}>
        <strong>Checked Sheets:</strong>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {allResults.map((r, idx) => (
            <li key={r.id} style={{ marginBottom: 6 }}>
              <button
                style={{ fontWeight: idx === selected ? 700 : 400, marginRight: 8 }}
                onClick={() => setSelected(idx)}
              >
                {r.fileName} ({r.checkedAt})
              </button>
              <span>Score: {r.score} / {r.total}</span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ fontSize: '1.2rem', margin: '12px 0' }}>
        <strong>Score:</strong> {current.score} / {current.total}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #bbb', padding: 4 }}>#</th>
            <th style={{ border: '1px solid #bbb', padding: 4 }}>Detected</th>
            <th style={{ border: '1px solid #bbb', padding: 4 }}>Correct</th>
            <th style={{ border: '1px solid #bbb', padding: 4 }}>Result</th>
          </tr>
        </thead>
        <tbody>
          {current.results.map(r => (
            <tr key={r.number}>
              <td style={{ border: '1px solid #bbb', padding: 4 }}>{r.number}</td>
              <td style={{ border: '1px solid #bbb', padding: 4 }}>{r.detected}</td>
              <td style={{ border: '1px solid #bbb', padding: 4 }}>{r.correct}</td>
              <td style={{ border: '1px solid #bbb', padding: 4 }}>
                {r.isCorrect === undefined ? '-' : r.isCorrect ? '✔️' : '❌'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GenerateSheet; 