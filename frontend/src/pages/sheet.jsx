import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/styles.css';

function AnswerSheet() {
  const [examType, setExamType] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [academicTerm, setAcademicTerm] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [testDirections, setTestDirections] = useState('');
  const [numItems, setNumItems] = useState('');
  const [numChoices, setNumChoices] = useState('');
  const navigate = useNavigate();
  
  const examOptions = ['MIDTERM EXAMINATION', 'FINAL EXAMINATION', 'SHORT QUIZ', 'LONG QUIZ'];
  
  const handleExamTypeSelect = (value) => {
    setExamType(value);
    setShowDropdown(false);
  };
  
  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };
  
  const handleTextareaResize = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/generate', {
      state: {
        examType,
        academicTerm,
        subjectName,
        testDirections,
        numItems,
        numChoices,
      }
    });
  };

  return (
    <div className="answer-sheet-outer">
      <div className="answer-sheet-container">
        <aside className="sidebar">
          <h2>Dashboard</h2>
          <button className="new-answer-sheet-btn">+ New Answer Sheet</button>
        </aside>
        <main className="answer-sheet-content">
          <h2 className="answer-sheet-title">Create Answer Sheet</h2>
          <form className="answer-sheet-form" onSubmit={handleSubmit}>
            <div className="answer-sheet-row">
              <div className="answer-sheet-col">
                <label htmlFor="examType">Exam Type <span className="required">*</span></label>
                <div className="custom-select-container">
                  <input 
                    className="input custom-select-input" 
                    id="examType" 
                    type="text" 
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    placeholder="MIDTERM EXAMINATION"
                    required 
                  />
                  <button type="button" className="custom-select-arrow" onClick={handleDropdownToggle}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path stroke="#6b7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                    </svg>
                  </button>
                  {showDropdown && (
                    <div className="custom-select-dropdown">
                      {examOptions.map((option) => (
                        <div key={option} className="custom-select-option" onClick={() => handleExamTypeSelect(option)}>
                          {option}
                        </div>))}
                    </div>)}
                </div>
              </div>
              <div className="answer-sheet-col">
                <label htmlFor="academicTerm">Academic Term</label>
                <input className="input" id="academicTerm" type="text" placeholder="1ST SEM, S.Y. 20XX - 20XX" value={academicTerm} onChange={e => setAcademicTerm(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="subjectName">Subject Name <span className="required">*</span></label>
              <input className="input" id="subjectName" type="text" required value={subjectName} onChange={e => setSubjectName(e.target.value)} />
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
                rows={2} 
                onInput={handleTextareaResize}
                placeholder="Enter test directions..."
                value={testDirections}
                onChange={e => setTestDirections(e.target.value)}
              />
            </div>  
            <div className="answer-sheet-row">
              <div className="answer-sheet-col">
                <label htmlFor="numItems">Number of Items <span className="required">*</span></label>
                <input 
                  className="input" 
                  id="numItems" 
                  type="number" 
                  min="1" 
                  max="300"
                  placeholder="50"
                  required 
                  value={numItems}
                  onChange={e => setNumItems(e.target.value)}
                />
              </div>
              <div className="answer-sheet-col">
                <label htmlFor="numChoices">Number of Choices <span className="required">*</span></label>
                <select className="input" id="numChoices" required value={numChoices} onChange={e => setNumChoices(e.target.value)}>
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
              <button className="answer-sheet-create-btn" type="submit">Create Answer Sheet</button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default AnswerSheet;