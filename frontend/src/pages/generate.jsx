import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/sidebar.css';
import styles from '../styles/generate.module.css';
import AnswerKey from './answer';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const examOptions = ['MIDTERM EXAMINATION', 'FINAL EXAMINATION', 'QUIZ', 'LAB EXERCISE', 'HOMEWORK'];
  const numChoicesOptions = [
    '2 (A, B)',
    '3 (A, B, C)',
    '4 (A, B, C, D)',
    '5 (A, B, C, D, E)',
    '6 (A, B, C, D, E, F)'
  ];
  const examDropdownRef = React.useRef(null);
  const choicesDropdownRef = React.useRef(null);

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
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yStart = 48;

    function renderHeader(y) {
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
      doc.text(
        form.testDirections || 'Test I: Shade the circle that correspond to the letter of your chosen answer. Any kind of erasure or overwriting will invalidate your answer.',
        48,
        y,
        { maxWidth: pageWidth - 96 }
      );
      y += 48;
      return y;
    }

    const numItems = parseInt(form.numItems) || 50;
    const numChoices = parseInt(form.numChoices) || 4;
    const choiceLabels = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, numChoices);
    let groupSize = 20;
    if (numItems <= 30) groupSize = 10;
    else if (numItems <= 60) groupSize = 20;
    else if (numItems <= 100) groupSize = 25;
    else groupSize = 30;
    const groupGap = 32; 
    const bubbleR = 7; 
    const rowH = 22; 
    const colW = 20; 
    const numW = 20; 
    let pageStart = 1;
    let page = 0;
    const pageMargin = 8;
    while (pageStart <= numItems) {
      if (page > 0) doc.addPage();
      let y = renderHeader(yStart);
      const pageEnd = Math.min(pageStart + 50 - 1, numItems);
      const pageQuestions = pageEnd - pageStart + 1;
      let localGroupSize = groupSize;
      if (pageQuestions <= 30) localGroupSize = 10;
      else if (pageQuestions <= 60) localGroupSize = 20;
      else if (pageQuestions <= 100) localGroupSize = 25;
      else localGroupSize = 30;
      const numGroups = Math.ceil(pageQuestions / localGroupSize);
      const groupWidth = numW + numChoices * colW;
      const gridWidth = numGroups * groupWidth + (numGroups - 1) * groupGap;
      const gridStartX = (pageWidth - gridWidth) / 2;
      let yGrid = y;
      for (let g = 0; g < numGroups; g++) {
        let x = gridStartX + g * (groupWidth + groupGap);
        choiceLabels.forEach((label, cidx) => {
          doc.setFont('times', 'bold');
          doc.setFontSize(13);
          doc.text(label, x + numW + cidx * colW + colW / 2, yGrid, { align: 'center' });
        });
      }
      yGrid += 10;
      for (let i = 0; i < localGroupSize; i++) {
        for (let g = 0; g < numGroups; g++) {
          const qNum = pageStart + g * localGroupSize + i;
          if (qNum > pageEnd) continue;
          let x = gridStartX + g * (groupWidth + groupGap);
          let yRow = yGrid + i * rowH;
          doc.setFont('times', 'normal');
          doc.setFontSize(11);
          const cx = x + numW / 2;
          const cy = yRow + bubbleR + 5;
          doc.text(`${qNum}.`, cx, cy + bubbleR - 1, { align: 'center' });
          for (let cidx = 0; cidx < numChoices; cidx++) {
            doc.setLineWidth(1);
            doc.circle(x + numW + cidx * colW + colW / 2, yRow + bubbleR + 5, bubbleR, 'S');
          }
        }
      }
      doc.setLineWidth(2);
      doc.rect(pageMargin, pageMargin, pageWidth - 2 * pageMargin, pageHeight - 2 * pageMargin);
      pageStart += 50;
      page++;
    }
    doc.save('answer-sheet.pdf');
  };

  return (
    <div className={styles['generate-sheet-outer']}>
      <div className={styles['generate-sheet-container']}>
        <aside className="sidebar">
          <h2>Dashboard</h2>
          <button className="new-answer-sheet-btn">+ New Answer Set</button>
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
              <form className={styles['generate-sheet-form']} autoComplete="off">
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
                        placeholder="MIDTERM EXAMINATION"
                        required
                        autoComplete="off"
                        onClick={() => setShowExamDropdown(true)}
                      />
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
                      placeholder="1ST SEM, S.Y. 20XX - 20XX"
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
                      placeholder="ACC 310 - Auditing and Assurance Principles..."
                      required
                      autoComplete="off"
                    />
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
                    placeholder="Test I: Shade the circle that correspond to the letter of your chosen answer. Any kind of erasure or overwriting will invalidate your answer."
                    value={form.testDirections}
                    onChange={handleFormChange}
                    required
                    autoComplete="off"
                  />
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
                      placeholder="50"
                      required
                      value={form.numItems}
                      onChange={handleFormChange}
                      autoComplete="off"
                    />
                  </div>
                  <div className={styles['generate-sheet-col']}>
                    <label htmlFor="numChoices">Number of Choices <span className={styles['required']}>*</span></label>
                    <div className={styles['custom-select-container']} ref={choicesDropdownRef}>
                      <input
                        className={`${styles['input']} ${styles['custom-select-input']}`}
                        id="numChoices"
                        name="numChoices"
                        type="text"
                        value={form.numChoices ? `${form.numChoices} (${['A','B','C','D','E','F'].slice(0, Number(form.numChoices)).join(', ')})` : ''}
                        onChange={() => {}}
                        placeholder="Select number of choices"
                        required
                        readOnly
                        onClick={handleChoicesDropdownToggle}
                        style={{ cursor: 'pointer' }}
                        autoComplete="off"
                      />
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
                  <button className={styles['generate-sheet-create-btn']} type="button" onClick={handleGeneratePDF}>
                    Generate Answer Sheet
                  </button>
                </div>
              </form>
            )}
            {activeTab === 'answer' && (
              <AnswerKey examData={form} />
            )}
            {activeTab === 'upload' && (
              <div className="tab-placeholder">[Placeholder] Upload scanned sheets here.</div>
            )}
            {activeTab === 'results' && (
              <div className="tab-placeholder">[Placeholder] View results here.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default GenerateSheet; 