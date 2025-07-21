import React, { useState, useEffect } from 'react';
import styles from '../styles/answer.module.css';
import { getAnswerKey, setAnswerKey } from '../utils/localStorage';

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function AnswerKey({ sheetId, examData }) {
  const numItems = parseInt(examData?.numItems);
  const numChoices = parseInt(examData?.numChoices);
  const choices = CHOICE_LABELS.slice(0, numChoices);

  // Wait for examData to be available
  if (!examData || !numItems || !numChoices || numItems < 1 || numChoices < 1) return null;

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
    const saved = getAnswerKey(sheetId);
    if (Array.isArray(saved) && saved.length === numItems) return saved;
    return Array(numItems).fill(null);
  });
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState(() => {
    const saved = getAnswerKey(sheetId);
    if (Array.isArray(saved) && saved.length === numItems) return saved;
    return Array(numItems).fill(null);
  });
  const [editMode, setEditMode] = useState(false);

  // Reload answers and lastSaved when sheetId or numItems changes
  useEffect(() => {
    const saved = getAnswerKey(sheetId);
    if (Array.isArray(saved) && saved.length === numItems) {
      setAnswers(saved);
      setLastSaved(saved);
      setEditMode(false);
    } else if (Array.isArray(saved) && saved.length > numItems) {
      setAnswers(saved.slice(0, numItems));
      setLastSaved(saved.slice(0, numItems));
      setEditMode(false);
    } else if (Array.isArray(saved) && saved.length < numItems) {
      setAnswers([...saved, ...Array(numItems - saved.length).fill(null)]);
      setLastSaved([...saved, ...Array(numItems - saved.length).fill(null)]);
      setEditMode(false);
    } else {
      setAnswers(Array(numItems).fill(null));
      setLastSaved(Array(numItems).fill(null));
      setEditMode(false);
    }
  }, [sheetId, numItems]);

  const allAnswered = answers.length === numItems && answers.every(a => a !== null);
  const isEdited = !lastSaved.every((v, i) => v === answers[i]);

  const handleEdit = () => setEditMode(true);
  const handleCancel = () => {
    setAnswers(lastSaved);
    setEditMode(false);
  };
  const handleSave = () => {
    if (!allAnswered) return;
    setAnswerKey(sheetId, answers);
    setLastSaved(answers);
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 1200);
  };

  const handleSelect = (idx, choice) => {
    if (!editMode) return;
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
                      <span className={styles['answerkey-bubble'] + (!editMode ? ' ' + styles['answerkey-bubble-disabled'] : '')}>
                        <input
                          type="radio"
                          name={`item-${idx}`}
                          value={choice}
                          checked={answers[idx] === choice}
                          onChange={() => handleSelect(idx, choice)}
                          disabled={!editMode}
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
      {editMode ? (
        <button
          className={styles['answerkey-save-btn']}
          onClick={isEdited ? handleSave : handleCancel}
          disabled={isEdited && !allAnswered}
        >
          {isEdited ? (saved ? 'Saved!' : 'Save Answer Key') : 'Cancel'}
        </button>
      ) : (
        <button
          className={styles['answerkey-save-btn']}
          onClick={handleEdit}
        >
          Edit Answer Key
        </button>
      )}
      {!allAnswered && (
        <div className={styles['answerkey-warning']}>All items must have an answer before saving.</div>
      )}
    </div>
  );
}

export default AnswerKey;