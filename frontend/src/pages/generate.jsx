import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/styles.css';
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNameEdit = () => setEditingName(true);
  const handleNameChange = (e) => setSheetName(e.target.value);
  const handleNameBlur = () => setEditingName(false);

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

    // Helper to render header, info boxes, and instructions
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
      // Info boxes
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
      // Instructions
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text(
        'Test I: Shade the circle that correspond to the letter of your chosen answer. Any kind of erasure or overwriting will invalidate your answer.',
        48,
        y,
        { maxWidth: pageWidth - 96 }
      );
      y += 48;
      return y;
    }

    // --- Scantron Grid ---
    const numItems = parseInt(form.numItems) || 50;
    const numChoices = parseInt(form.numChoices) || 4;
    const choiceLabels = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, numChoices);
    // Group logic (same as answer key)
    let groupSize = 20;
    if (numItems <= 30) groupSize = 10;
    else if (numItems <= 60) groupSize = 20;
    else if (numItems <= 100) groupSize = 25;
    else groupSize = 30;
    const groupGap = 32; // px between groups
    const bubbleR = 7; // px radius (smaller)
    const rowH = 22; // px row height (smaller)
    const colW = 20; // px per bubble (smaller)
    const numW = 20; // px for number (smaller)
    // Split questions into pages of 50
    let pageStart = 1;
    let page = 0;
    const pageMargin = 8;
    while (pageStart <= numItems) {
      if (page > 0) doc.addPage();
      let y = renderHeader(yStart);
      const pageEnd = Math.min(pageStart + 50 - 1, numItems);
      const pageQuestions = pageEnd - pageStart + 1;
      // Determine groups for this page
      let localGroupSize = groupSize;
      if (pageQuestions <= 30) localGroupSize = 10;
      else if (pageQuestions <= 60) localGroupSize = 20;
      else if (pageQuestions <= 100) localGroupSize = 25;
      else localGroupSize = 30;
      const numGroups = Math.ceil(pageQuestions / localGroupSize);
      const groupWidth = numW + numChoices * colW;
      const gridWidth = numGroups * groupWidth + (numGroups - 1) * groupGap;
      const gridStartX = (pageWidth - gridWidth) / 2;
      // Header row
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
      // Rows
      for (let i = 0; i < localGroupSize; i++) {
        for (let g = 0; g < numGroups; g++) {
          const qNum = pageStart + g * localGroupSize + i;
          if (qNum > pageEnd) continue;
          let x = gridStartX + g * (groupWidth + groupGap);
          let yRow = yGrid + i * rowH;
          doc.setFont('times', 'normal');
          doc.setFontSize(11);
          // Center number horizontally and align it lower, closer to the bottom of the circles
          const cx = x + numW / 2;
          const cy = yRow + bubbleR + 5;
          doc.text(`${qNum}.`, cx, cy + bubbleR - 1, { align: 'center' });
          // Only draw circles for the answer choices
          for (let cidx = 0; cidx < numChoices; cidx++) {
            doc.setLineWidth(1);
            doc.circle(x + numW + cidx * colW + colW / 2, yRow + bubbleR + 5, bubbleR, 'S');
          }
        }
      }
      // Outer border fills nearly the whole page
      doc.setLineWidth(2);
      doc.rect(pageMargin, pageMargin, pageWidth - 2 * pageMargin, pageHeight - 2 * pageMargin);
      pageStart += 50;
      page++;
    }
    doc.save('answer-sheet.pdf');
  };

  return (
    <div className="answer-sheet-outer">
      <div className="answer-sheet-container">
        <aside className="sidebar">
          <h2>Dashboard</h2>
          <button className="new-answer-sheet-btn">+ New Answer Set</button>
          <div className="sidebar-answer-list">
            <div className="sidebar-answer-item">
              {editingName ? (
                <input
                  className="sidebar-answer-edit-input"
                  value={sheetName}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  autoFocus
                />
              ) : (
                <span className="sidebar-answer-title">
                  {sheetName}
                  <button className="sidebar-edit-btn" onClick={handleNameEdit} title="Rename">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14.06 6.44a1.5 1.5 0 0 0 0-2.12l-1.38-1.38a1.5 1.5 0 0 0-2.12 0l-1.06 1.06 3.5 3.5 1.06-1.06z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </span>
              )}
            </div>
          </div>
        </aside>
        <main className="answer-sheet-content">
          <h2 className="answer-sheet-title">{sheetName}</h2>
          <nav className="answer-sheet-navbar">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`answer-sheet-nav-btn${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          {activeTab === 'generate' && (
            <form className="answer-sheet-form">
              <div className="answer-sheet-row">
                <div className="answer-sheet-col">
                  <label htmlFor="examType">Exam Type <span className="required">*</span></label>
                  <input
                    className="input custom-select-input"
                    id="examType"
                    name="examType"
                    type="text"
                    value={form.examType}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="answer-sheet-col">
                  <label htmlFor="academicTerm">Academic Term</label>
                  <input
                    className="input"
                    id="academicTerm"
                    name="academicTerm"
                    type="text"
                    value={form.academicTerm}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="subjectName">Subject Name <span className="required">*</span></label>
                <input
                  className="input"
                  id="subjectName"
                  name="subjectName"
                  type="text"
                  required
                  value={form.subjectName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label>Display</label>
                <div className="answer-sheet-row">
                  <div className="answer-sheet-col">
                    <input className="input" type="text" placeholder="Name:" disabled />
                  </div>
                  <div className="answer-sheet-col">
                    <input className="input" type="text" placeholder="Date:" disabled />
                  </div>
                </div>
                <div className="answer-sheet-row">
                  <div className="answer-sheet-col">
                    <input className="input" type="text" placeholder="Course/Section:" disabled />
                  </div>
                  <div className="answer-sheet-col">
                    <input className="input" type="text" placeholder="Score:" disabled />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="testDirections">Test Directions</label>
                <textarea
                  className="input"
                  id="testDirections"
                  name="testDirections"
                  rows={2}
                  value={form.testDirections}
                  onChange={handleFormChange}
                  onInput={handleTextareaResize}
                  placeholder="Enter test directions..."
                />
              </div>
              <div className="answer-sheet-row">
                <div className="answer-sheet-col">
                  <label htmlFor="numItems">Number of Items <span className="required">*</span></label>
                  <input
                    className="input"
                    id="numItems"
                    name="numItems"
                    type="number"
                    min="1"
                    max="300"
                    required
                    value={form.numItems}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="answer-sheet-col">
                  <label htmlFor="numChoices">Number of Choices <span className="required">*</span></label>
                  <select
                    className="input"
                    id="numChoices"
                    name="numChoices"
                    required
                    value={form.numChoices}
                    onChange={handleFormChange}
                  >
                    <option value="">Select number of choices</option>
                    <option value="2">2 (A, B)</option>
                    <option value="3">3 (A, B, C)</option>
                    <option value="4">4 (A, B, C, D)</option>
                    <option value="5">5 (A, B, C, D, E)</option>
                    <option value="6">6 (A, B, C, D, E, F)</option>
                  </select>
                </div>
              </div>
              <div className="answer-sheet-btn-row">
                <button className="answer-sheet-create-btn" type="button" onClick={handleGeneratePDF}>
                  Generate Answer Sheet PDF
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
        </main>
      </div>
    </div>
  );
}

export default GenerateSheet; 