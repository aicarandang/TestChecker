import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/sidebar.css';
import styles from '../styles/answer.module.css';

function AnswerKey({ examData: propExamData }) {
  const location = useLocation();
  const [answerKey, setAnswerKey] = useState({});
  const [numItems, setNumItems] = useState(50);
  const [numChoices, setNumChoices] = useState(4);
  const [examData, setExamData] = useState({});

  useEffect(() => {
    if (propExamData) {
      setExamData(propExamData);
      setNumItems(parseInt(propExamData.numItems) || 50);
      setNumChoices(parseInt(propExamData.numChoices) || 4);
    } else if (location.state) {
      setExamData(location.state);
      setNumItems(parseInt(location.state.numItems) || 50);
      setNumChoices(parseInt(location.state.numChoices) || 4);
    }
    // Load saved answer key if exists
    const keyParts = [
      (propExamData?.examType || location.state?.examType || 'exam'),
      (propExamData?.subjectName || location.state?.subjectName || 'subject'),
      (propExamData?.numItems || location.state?.numItems || 50)
    ];
    const storageKey = `answerKey_${keyParts.join('_')}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setAnswerKey(JSON.parse(saved));
    }
  }, [propExamData, location.state]);

  const choiceLabels = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, numChoices);

  // Split questions into two columns
  const splitPoint = Math.ceil(numItems / 2);
  const leftQuestions = Array.from({ length: splitPoint }, (_, i) => i + 1);
  const rightQuestions = Array.from({ length: numItems - splitPoint }, (_, i) => splitPoint + i + 1);

  function renderColumn(questions) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: gridTemplateColumns, rowGap: '8px', marginRight: 32 }}>
        <>
          <span className={styles.scantronHeaderNumber}></span>
          {choiceLabels.map((choice, cidx) => (
            <span className={styles.scantronHeaderChoice} key={`h-${choice}`}>{choice}</span>
          ))}
        </>
        {questions.map(i => [
          <span className={styles.scantronQnum} key={`qnum${i}`}>{i}.</span>,
          <span key={`radiogroup-${i}`} role="radiogroup" aria-label={`Choices for question ${i}`} style={{ display: 'contents' }}>
            {choiceLabels.map((choice, cidx) => (
              <button
                key={`b${i}-${choice}`}
                className={
                  styles.scantronChoiceBtn + (answerKey[i] === choice ? ' ' + styles.selected : '')
                }
                onClick={() => handleAnswerSelect(i, choice)}
                type="button"
                role="radio"
                aria-checked={answerKey[i] === choice}
                aria-label={`Set answer for question ${i} to ${choice}`}
                tabIndex={answerKey[i] === choice ? 0 : -1}
              >
                <span className={styles.scantronChoiceCircle}></span>
              </button>
            ))}
          </span>
        ])}
      </div>
    );
  }

  // Adjust grid columns for single vertical list
  const gridTemplateColumns = `minmax(38px,42px) repeat(${numChoices}, 32px)`;

  const handleAnswerSelect = (questionNumber, choice) => {
    setAnswerKey(prev => ({ ...prev, [questionNumber]: choice }));
  };

  const saveAnswerKey = () => {
    // Create a unique key for this answer sheet
    const keyParts = [
      examData.examType || 'exam',
      examData.subjectName || 'subject',
      numItems
    ];
    const storageKey = `answerKey_${keyParts.join('_')}`;
    localStorage.setItem(storageKey, JSON.stringify(answerKey));
    alert('Answer key saved!');
  };

  return (
    <div className={styles.scantronSheetOuter}>
      <div className={styles.scantronScrollContainer}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 0 }}>
          {renderColumn(leftQuestions)}
          {renderColumn(rightQuestions)}
        </div>
      </div>
      <div className={styles.scantronSheetFooter}>
        <button className={styles.bubbleSaveBtn} onClick={saveAnswerKey}>Save Answer Key</button>
      </div>
    </div>
  );
}

export default AnswerKey; 