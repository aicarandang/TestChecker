import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from '../styles/generate.module.css';
import AnswerKey from './answer';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import UploadSheets from './upload';
import Results from './results';
import Sidebar from '../components/sidebar';
import Navbar from '../components/navbar';
import {
  getAnswerSheets,
  setAnswerSheets,
  getSelectedSheetId,
  setSelectedSheetId,
  removeAnswerKey,
  removeScanResults,
  removeUploads,
  getTestDirectionsHeight,
  setTestDirectionsHeight,
  removeTestDirectionsHeight
} from '../utils/localStorage';

const NAV_TABS = [
  { key: 'generate', label: 'Generate Sheet' },
  { key: 'answer', label: 'Add Answer Key' },
  { key: 'upload', label: 'Upload Sheets' },
  { key: 'results', label: 'Results' },
];

const DEFAULT_SHEET = () => ({
  id: Date.now().toString(),
  name: 'Answer Sheet 1',
  form: {
    examType: '',
    academicTerm: '',
    subjectName: '',
    testDirections: '',
    numItems: '',
    numChoices: '',
  }
});

const getInitialSheets = () => {
  const saved = getAnswerSheets();
  if (Array.isArray(saved) && saved.length > 0) return saved;
  return [];
};

const getInitialSelectedId = (sheets) => {
  const saved = getSelectedSheetId();
  if (saved && sheets.some(s => s.id === saved)) return saved;
  return sheets[0]?.id || null;
};

function GenerateSheet() {
  const location = useLocation();
  const initialData = location.state || {};
  const [activeTab, setActiveTab] = useState('generate');
  const [sheets, setSheets] = useState(getInitialSheets);
  const [selectedSheetId, setSelectedSheetId] = useState(() => getInitialSelectedId(getInitialSheets()));
  const [editingName, setEditingName] = useState(false);
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
  const testDirectionsRef = useRef(null);

  useEffect(() => {
    setAnswerSheets(sheets);
    setSelectedSheetId(selectedSheetId);
  }, [sheets, selectedSheetId]);

  useEffect(() => {
  if (sheets.length === 0 && location.state && Object.values(location.state).some(v => v)) {
    const newSheet = {
      id: location.state.id || Date.now().toString(),
      name: location.state.name || 'Answer Sheet 1',
      form: { ...location.state }
    };
    setSheets([newSheet]);
    setSelectedSheetId(newSheet.id);
    setActiveTab('generate');
  }
}, []);

  const getMinHeight = () => {
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

  useEffect(() => {
    if (testDirectionsRef.current) {
      const savedHeight = getTestDirectionsHeight(selectedSheetId);
      if (savedHeight) {
        testDirectionsRef.current.style.height = savedHeight + 'px';
      } else {
        const minHeight = getMinHeight();
        testDirectionsRef.current.style.height = minHeight + 'px';
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'generate' && testDirectionsRef.current) {
      const savedHeight = getTestDirectionsHeight(selectedSheetId);
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
      testDirectionsRef.current.style.height = 'auto';
      const minHeight = getMinHeight();
      const newHeight = Math.max(testDirectionsRef.current.scrollHeight, minHeight);
      setTestDirectionsHeight(selectedSheetId, newHeight);
    }
  }, [sheets.find(s => s.id === selectedSheetId)?.form.testDirections]);

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
    setSheets(sheets.map(s =>
      s.id === selectedSheetId
        ? { ...s, form: { ...s.form, [name]: value } }
        : s
    ));
    if (name === 'testDirections' && testDirectionsRef.current) {
      handleTextareaResize(e);
    }
  };

  const handleNameEdit = () => setEditingName(true);
  const handleNameBlur = () => setEditingName(false);

  const handleExamTypeSelect = (option) => {
    setSheets(sheets.map(s =>
      s.id === selectedSheetId
        ? { ...s, form: { ...s.form, examType: option } }
        : s
    ));
    setShowExamDropdown(false);
  };

  const handleNumChoicesSelect = (option) => {
    setSheets(sheets.map(s =>
      s.id === selectedSheetId
        ? { ...s, form: { ...s.form, numChoices: option.split(' ')[0] } }
        : s
    ));
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
    setTestDirectionsHeight(selectedSheetId, newHeight);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!sheets.find(s => s.id === selectedSheetId)?.form.examType || !sheets.find(s => s.id === selectedSheetId)?.form.subjectName || !sheets.find(s => s.id === selectedSheetId)?.form.testDirections || !sheets.find(s => s.id === selectedSheetId)?.form.numItems || !sheets.find(s => s.id === selectedSheetId)?.form.numChoices) {
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
    const numberWidth = 18;
    const gap = 8;

    const numItems = parseInt(sheets.find(s => s.id === selectedSheetId)?.form.numItems) || 50;
    const numChoices = parseInt(sheets.find(s => s.id === selectedSheetId)?.form.numChoices) || 4;
    const choiceLabels = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, numChoices);
    const testDirectionsText = sheets.find(s => s.id === selectedSheetId)?.form.testDirections || 'Test I: Shade the circle that correspond to the letter of your chosen answer. Any kind of erasure or overwriting will invalidate your answer.';

    function renderHeaderAndDirections(doc, y) {
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      doc.text(sheets.find(s => s.id === selectedSheetId)?.form.examType || 'EXAMINATION', pageWidth / 2, y, { align: 'center' });
      y += 22;
      doc.setFontSize(13);
      doc.text(sheets.find(s => s.id === selectedSheetId)?.form.subjectName || 'Subject Name', pageWidth / 2, y, { align: 'center' });
      y += 18;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      if (sheets.find(s => s.id === selectedSheetId)?.form.academicTerm) {
        doc.text(sheets.find(s => s.id === selectedSheetId)?.form.academicTerm, pageWidth / 2, y, { align: 'center' });
        y += 28;
      } else {
      }
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
      const colWidth = (pageWidth - 120) / 2; 
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
    // Store the grid start Y position for the first page
    let gridStartY = null;
    // Save grid layout params for backend
    const gridLayoutParams = {
      itemsPerColumn,
      colWidth: (pageWidth - 120) / 2,
      colX: [60, 60 + (pageWidth - 120) / 2],
      rowH,
      colW,
      bubbleR,
      numberWidth,
      gap,
      groupOffset: ((pageWidth - 120) / 2 - (numberWidth + gap + numChoices * colW)) / 2,
      gridStartY: null, // will set below
      numItems,
      numChoices
    };
    while (itemNum <= numItems) {
      if (page > 0) doc.addPage();
      renderBorder(doc);
      let y = renderHeaderAndDirections(doc, yStart);
      if (gridStartY === null) gridStartY = y; // Save the Y position after header/directions for the first page
      if (gridLayoutParams.gridStartY === null) gridLayoutParams.gridStartY = y;
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
    // Save gridStartY and gridLayoutParams in the selected sheet's form for backend use
    setSheets(sheets => sheets.map(s => s.id === selectedSheetId ? { ...s, form: { ...s.form, gridStartY, gridLayoutParams } } : s));
    const selectedSheet = sheets.find(s => s.id === selectedSheetId);
    let filename = selectedSheet?.name && selectedSheet.name.trim() ? selectedSheet.name.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_') + '.pdf' : 'answer-sheet.pdf';
    doc.save(filename);
  };

  const handleNewAnswerSheet = (e) => {
    if (e) e.preventDefault();
    const base = 'Answer Sheet ';
    let maxNum = 0;
    sheets.forEach(s => {
      const match = s.name.match(/^Answer Sheet (\d+)$/);
      if (match) {
        maxNum = Math.max(maxNum, parseInt(match[1], 10));
      }
    });
    const newNum = maxNum + 1;
    const newSheet = {
      id: Date.now().toString(),
      name: `${base}${newNum}`,
      form: {
        examType: '',
        academicTerm: '',
        subjectName: '',
        testDirections: '',
        numItems: '',
        numChoices: '',
      }
    };
    setSheets([...sheets, newSheet]);
    setSelectedSheetId(newSheet.id);
    setEditingName(false);
    setShowExamDropdown(false);
    setShowChoicesDropdown(false);
    setActiveTab('generate');
  };

  // Handler for editing sheet name
  const handleEditSheetName = (id, newName) => {
    setSheets(sheets.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  // Handler for deleting a sheet and its data
  const handleDeleteSheet = (id) => {
    removeAnswerKey(id);
    removeScanResults(id);
    removeUploads(id);
    removeTestDirectionsHeight(id);
    const idx = sheets.findIndex(s => s.id === id);
    const newSheets = sheets.filter(s => s.id !== id);
    setSheets(newSheets);
    if (id === selectedSheetId) {
      if (newSheets.length === 0) {
        setSelectedSheetId(null);
      } else {
        const nextIdx = idx < newSheets.length ? idx : newSheets.length - 1;
        setSelectedSheetId(newSheets[nextIdx].id);
      }
    }
  };

  if (sheets.length === 0) {
    return (
      <div className={styles['generate-sheet-outer']}>
        <div className={styles['generate-sheet-container']}>
          <Sidebar
            title="Dashboard"
            sheets={sheets}
            selectedSheetId={selectedSheetId}
            onSelectSheet={setSelectedSheetId}
            onEditSheetName={handleEditSheetName}
            onDeleteSheet={handleDeleteSheet}
            onNewSheet={handleNewAnswerSheet}
          />
          <main className={styles['generate-sheet-content']}>
            <div className={styles['generate-empty-state']}>
              <div className={styles['generate-empty-state__text']}>
                No sheets. Click <b>+ New Answer Sheet</b> to create one.
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['generate-sheet-outer']}>
      <div className={styles['generate-sheet-container']}>
        <Sidebar
          title="Dashboard"
          sheets={sheets}
          selectedSheetId={selectedSheetId}
          onSelectSheet={setSelectedSheetId}
          onEditSheetName={handleEditSheetName}
          onDeleteSheet={handleDeleteSheet}
          onNewSheet={handleNewAnswerSheet}
        />
        <main className={styles['generate-sheet-content']}>
          <h2 className={styles['generate-sheet-title']}>{sheets.find(s => s.id === selectedSheetId)?.name}</h2>
          <Navbar
            tabs={NAV_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
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
                        value={sheets.find(s => s.id === selectedSheetId)?.form.examType || ''}
                        onChange={handleFormChange}
                        autoComplete="off"
                        onClick={() => setShowExamDropdown(true)}
                        required
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
                    value={sheets.find(s => s.id === selectedSheetId)?.form.academicTerm || ''}
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
                  value={sheets.find(s => s.id === selectedSheetId)?.form.subjectName || ''}
                  onChange={handleFormChange}
                      autoComplete="off"
                    required
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
                    onChange={handleFormChange}
                  value={sheets.find(s => s.id === selectedSheetId)?.form.testDirections || ''}
                    autoComplete="off"
                    style={{overflow: 'hidden', resize: 'none'}}
                    ref={testDirectionsRef}
                    required
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
                    value={sheets.find(s => s.id === selectedSheetId)?.form.numItems || ''}
                    onChange={handleFormChange}
                      autoComplete="off"
                    required
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
                        value={(() => {
                          if (!sheets.find(s => s.id === selectedSheetId)?.form.numChoices) return '';
                          const labels = ['A','B','C','D','E','F'].slice(0, Number(sheets.find(s => s.id === selectedSheetId)?.form.numChoices));
                          return labels.length ? `${sheets.find(s => s.id === selectedSheetId)?.form.numChoices} (${labels.join(', ')})` : sheets.find(s => s.id === selectedSheetId)?.form.numChoices;
                        })()}
                        onChange={() => {}}
                        readOnly
                        onClick={handleChoicesDropdownToggle}
                        style={{ cursor: 'pointer' }}
                        autoComplete="off"
                        required
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
                  <button className={styles['generate-sheet-create-btn']} type="submit">
                    Generate Answer Sheet
                  </button>
                </div>
              </form>
          )}
          {activeTab === 'answer' && (
            <AnswerKey sheetId={selectedSheetId} examData={sheets.find(s => s.id === selectedSheetId)?.form} />
          )}
          {activeTab === 'upload' && (
            <UploadSheets sheetId={selectedSheetId} />
          )}
          {activeTab === 'results' && (
            <Results sheetId={selectedSheetId} />
          )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default GenerateSheet; 