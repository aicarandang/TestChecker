import React, { useState, useEffect } from 'react';
import styles from '../styles/answer.module.css';

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function AnswerKey({ examData }) {
  const numItems = parseInt(examData?.numItems);
  const numChoices = parseInt(examData?.numChoices);
  const choices = CHOICE_LABELS.slice(0, numChoices);
  const storageKey = examData?.id ? `answerKey_${examData.id}` : 'answerKey';

  if (!numItems || !numChoices || numItems < 1 || numChoices < 1) return null;

  let numCols = 3;
  if (numItems <= 10) numCols = 1;
  else if (numItems <= 20) numCols = 2;

  const baseRows = Math.floor(numItems / numCols);
  const extra = numItems % numCols;
  let start = 0;
  const columns = Array.from({ length: numCols }, (_, colIdx) => {
    const count = baseRows + (colIdx < extra ? 1 : 0);
    const col = Array.from({ length: count }, (_, i) => start + i);
    start += count;
    return col;
  });

  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === numItems) return parsed;
      } catch {}
    }
    return Array(numItems).fill(null);
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAnswers(prev => {
      if (prev.length === numItems) return prev;
      if (prev.length < numItems) return [...prev, ...Array(numItems - prev.length).fill(null)];
      return prev.slice(0, numItems);
    });
  }, [numItems]);

  const allAnswered = answers.length === numItems && answers.every(a => a !== null);

  const handleSave = () => {
    if (!allAnswered) return;
    localStorage.setItem(storageKey, JSON.stringify(answers));
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const handleSelect = (idx, choice) => {
    setAnswers(prev => {
      const next = [...prev];
      next[idx] = choice;
      return next;
    });
  };

  return (
    <div className={styles['answerkey-outer']}>
      <div
        className={styles['answerkey-grid']}
        style={{
          gridTemplateColumns: `repeat(${numCols}, auto)`,
          ['--col-count']: numCols
        }}
      >
        {columns.map((col, colIdx) => (
          <div className={styles['answerkey-col']} key={colIdx}>
            <div className={styles['answerkey-row']} style={{ fontWeight: 700, fontSize: '1.13rem', marginBottom: 0 }}>
              <span className={styles['answerkey-cell']} />
              {choices.map(choice => (
                <span className={styles['answerkey-cell']} key={choice}>
                  <span className={styles['answerkey-label-header']}>{choice}</span>
                </span>
              ))}
            </div>
            {col.map(idx => (
              <div className={styles['answerkey-row']} key={idx}>
                <span className={styles['answerkey-cell']}>
                  <span className={styles['answerkey-num']}>{idx + 1}.</span>
                </span>
                {choices.map(choice => (
                  <span className={styles['answerkey-cell']} key={choice}>
                    <label className={styles['answerkey-choice']}>
                      <span className={styles['answerkey-bubble']}>
                        <input
                          type="radio"
                          name={`item-${idx}`}
                          value={choice}
                          checked={answers[idx] === choice}
                          onChange={() => handleSelect(idx, choice)}
                        />
                        {answers[idx] === choice ? <span className={styles['answerkey-filled']} /> : null}
                      </span>
                    </label>
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <button
        className={styles['answerkey-save-btn']}
        onClick={handleSave}
        disabled={!allAnswered}
      >
        {saved ? 'Saved!' : 'Save Answer Key'}
      </button>
      {!allAnswered && (
        <div className={styles['answerkey-warning']}>All items must have an answer before saving.</div>
      )}
    </div>
  );
}

export default AnswerKey;