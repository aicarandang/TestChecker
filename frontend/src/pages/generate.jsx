import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/styles.css';

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
                <button className="answer-sheet-create-btn" type="button">Generate Answer Sheet</button>
              </div>
            </form>
          )}
          {activeTab === 'answer' && (
            <div className="tab-placeholder">[Placeholder] Define the answer key here.</div>
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