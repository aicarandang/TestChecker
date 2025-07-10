import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/sidebar.css';
import styles from '../styles/sheet.module.css';

function AnswerSheet() {
  const [examType, setExamType] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [academicTerm, setAcademicTerm] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [testDirections, setTestDirections] = useState('');
  const [numItems, setNumItems] = useState('');
  const [numChoices, setNumChoices] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
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

  const numChoicesOptions = [
    '2 (A, B)',
    '3 (A, B, C)',
    '4 (A, B, C, D)',
    '5 (A, B, C, D, E)',
    '6 (A, B, C, D, E, F)'
  ];
  const [showChoicesDropdown, setShowChoicesDropdown] = useState(false);

  const handleNumChoicesSelect = (value) => {
    setNumChoices(value);
    setShowChoicesDropdown(false);
  };
  const handleChoicesDropdownToggle = () => {
    setShowChoicesDropdown(!showChoicesDropdown);
  };

  const handleNewAnswerSheet = () => {
    setExamType('');
    setShowDropdown(false);
    setAcademicTerm('');
    setSubjectName('');
    setTestDirections('');
    setNumItems('');
    setNumChoices('');
    setShowChoicesDropdown(false);
    if (location.pathname !== '/answersheet') {
      navigate('/answersheet');
    }
  };

  const examDropdownRef = useRef(null);
  const choicesDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (showDropdown && examDropdownRef.current && !examDropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (showChoicesDropdown && choicesDropdownRef.current && !choicesDropdownRef.current.contains(event.target)) {
        setShowChoicesDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showChoicesDropdown]);

  return (
    <div className={styles['answer-sheet-outer']}>
      <div className={styles['answer-sheet-container']}>
        <aside className="sidebar">
          <h2>Dashboard</h2>
          <button className="new-answer-sheet-btn" onClick={handleNewAnswerSheet}>+ New Answer Sheet</button>
        </aside>
        <main className={styles['answer-sheet-content']}>
          <h2 className={styles['answer-sheet-title']}>Create Answer Sheet</h2>
          <div className={styles['answer-sheet-scrollable']}>
            <form className={styles['answer-sheet-form']} onSubmit={handleSubmit} autoComplete="off">
              <div className={styles['answer-sheet-row']}>
                <div className={styles['answer-sheet-col']}>
                  <label htmlFor="examType">Exam Type <span className={styles['required']}>*</span></label>
                  <div className={styles['custom-select-container']} ref={examDropdownRef}>
                  <input 
                      className={`${styles['input']} ${styles['custom-select-input']}`}
                    id="examType" 
                    type="text" 
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    placeholder="MIDTERM EXAMINATION"
                    required 
                      autoComplete="off"
                  />
                    <button type="button" className={styles['custom-select-arrow']} onClick={handleDropdownToggle}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path stroke="#6b7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                    </svg>
                  </button>
                  {showDropdown && (
                      <div className={styles['custom-select-dropdown']}>
                      {examOptions.map((option) => (
                          <div key={option} className={styles['custom-select-option']} onClick={() => handleExamTypeSelect(option)}>
                          {option}
                        </div>))}
                    </div>)}
                </div>
              </div>
                <div className={styles['answer-sheet-col']}>
                <label htmlFor="academicTerm">Academic Term</label>
                  <input className={styles['input']} id="academicTerm" type="text" placeholder="1ST SEM, S.Y. 20XX - 20XX" value={academicTerm} onChange={e => setAcademicTerm(e.target.value)} autoComplete="off" />
                </div>
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="subjectName">Subject Name <span className={styles['required']}>*</span></label>
                <input className={styles['input']} id="subjectName" type="text" required value={subjectName} onChange={e => setSubjectName(e.target.value)} autoComplete="off" />
              </div>
              <div className={styles['form-group']}>
                <label>Display</label>
                <div className={styles['answer-sheet-row']}>
                  <div className={styles['answer-sheet-col']}>
                    <input className={styles['input']} type="text" placeholder="Name:" disabled />
                  </div>
                  <div className={styles['answer-sheet-col']}>
                    <input className={styles['input']} type="text" placeholder="Date:" disabled />
                  </div>
                </div>
                <div className={styles['answer-sheet-row']}>
                  <div className={styles['answer-sheet-col']}>
                    <input className={styles['input']} type="text" placeholder="Course/Section:" disabled />
                  </div>
                  <div className={styles['answer-sheet-col']}>
                    <input className={styles['input']} type="text" placeholder="Score:" disabled />
                  </div>
                </div>
              </div>
              <div className={styles['form-group']}>
              <label htmlFor="testDirections">Test Directions</label>
              <textarea 
                  className={styles['input']} 
                id="testDirections" 
                  rows={3} 
                onInput={handleTextareaResize}
                placeholder="Enter test directions..."
                value={testDirections}
                onChange={e => setTestDirections(e.target.value)}
                  autoComplete="off"
              />
            </div>  
              <div className={styles['answer-sheet-row']}>
                <div className={styles['answer-sheet-col']}>
                  <label htmlFor="numItems">Number of Items <span className={styles['required']}>*</span></label>
                <input 
                    className={styles['input']} 
                  id="numItems" 
                  type="number" 
                  min="1" 
                  max="300"
                  placeholder="50"
                  required 
                  value={numItems}
                  onChange={e => setNumItems(e.target.value)}
                    autoComplete="off"
                />
                </div>
                <div className={styles['answer-sheet-col']}>
                  <label htmlFor="numChoices">Number of Choices <span className={styles['required']}>*</span></label>
                  <div className={styles['custom-select-container']} ref={choicesDropdownRef}>
                    <input
                      className={`${styles['input']} ${styles['custom-select-input']}`}
                      id="numChoices"
                      type="text"
                      value={numChoices}
                      onChange={(e) => setNumChoices(e.target.value)}
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
              <div className={styles['answer-sheet-btn-row']}>
                <button className={styles['answer-sheet-create-btn']} type="submit">Create Answer Sheet</button>
              </div>
            </form>
            </div>
        </main>
      </div>
    </div>
  );
}

export default AnswerSheet;