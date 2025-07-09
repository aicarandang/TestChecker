import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/sidebar.css';
import '../styles/answer.css';

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
  }, [propExamData, location.state]);

  const choiceLabels = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, numChoices);

  let groupSize = 20;
  if (numItems <= 30) groupSize = 10;
  else if (numItems <= 60) groupSize = 20;
  else if (numItems <= 100) groupSize = 25;
  else groupSize = 30;
  const numGroups = Math.ceil(numItems / groupSize);

  const gridRows = [];
  for (let g = 0; g < numGroups; g++) {
    gridRows.push(<span className="scantron-header-number" key={`hnum${g}`}></span>);
    choiceLabels.forEach((choice, cidx) => {
      gridRows.push(
        <span className="scantron-header-choice" key={`h${g}-${choice}`}>{choice}</span>
      );
    });
    if (g < numGroups - 1) {
      gridRows.push(<span className="scantron-spacer" key={`hspacer${g}`}></span>);
    }
  }
  for (let i = 0; i < groupSize; i++) {
    for (let g = 0; g < numGroups; g++) {
      const qNum = g * groupSize + i + 1;
      if (qNum > numItems) {
        gridRows.push(<span className="scantron-qnum-empty" key={`empty${g}-${i}`}></span>);
        choiceLabels.forEach((choice, cidx) => {
          gridRows.push(<span className="scantron-bubble-empty" key={`empty${g}-${i}-${choice}`}></span>);
        });
      } else {
        gridRows.push(
          <span className="scantron-qnum" key={`qnum${qNum}`}>{qNum}.</span>
        );
        choiceLabels.forEach((choice, cidx) => {
          gridRows.push(
            <button
              key={`b${qNum}-${choice}`}
              className={`scantron-choice-btn${answerKey[qNum] === choice ? ' selected' : ''}`}
              onClick={() => handleAnswerSelect(qNum, choice)}
              type="button"
              aria-label={`Set answer for question ${qNum} to ${choice}`}
            >
              <span className="scantron-choice-circle"></span>
            </button>
          );
        });
      }
      if (g < numGroups - 1) {
        gridRows.push(<span className="scantron-spacer" key={`spacer${g}-${i}`}></span>);
      }
    }
  }

  const groupColumns = [`minmax(28px,32px)`, ...Array(numChoices).fill('24px')].join(' ');
  const gridTemplateColumns = Array(numGroups)
    .fill(groupColumns)
    .join(' 32px ');

  const handleAnswerSelect = (questionNumber, choice) => {
    setAnswerKey(prev => ({ ...prev, [questionNumber]: choice }));
  };

  const saveAnswerKey = () => {
    alert('Answer key saved!');
  };

  return (
    <div className="scantron-sheet-outer">
      <div
        className="scantron-sheet-grid"
        style={{
          display: 'grid',
          gridTemplateColumns,
          rowGap: '8px',
          columnGap: '0',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {gridRows}
      </div>
      <div className="scantron-sheet-footer">
        <button className="bubble-save-btn" onClick={saveAnswerKey}>Save Answer Key</button>
      </div>
    </div>
  );
}

export default AnswerKey; 