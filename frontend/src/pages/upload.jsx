import React, { useRef, useState } from 'react';
import styles from '../styles/upload.module.css';
import { useNavigate } from 'react-router-dom';
import { getUploads, setUploads, setScanResults, getAnswerKey } from '../utils/localStorage';

function UploadSheets({ sheetId }) {
  const [files, setFiles] = useState([]);
  const [statuses, setStatuses] = useState({}); // { filename: 'idle' | 'pending' | 'checked' | 'error' }
  const [message, setMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(f => 
      ['image/png', 'image/jpeg', 'application/pdf'].includes(f.type)
    );
    setFiles(prev => [...prev, ...selectedFiles]);
    // Set status to 'idle' for new files
    setStatuses(prev => ({ ...prev, ...Object.fromEntries(selectedFiles.map(f => [f.name, 'idle'])) }));
    setUploads(sheetId, selectedFiles.map(f => ({ name: f.name, type: f.type })));
  };

  const handleBrowseClick = (e) => {
    e.stopPropagation();
    fileInputRef.current.click();
  };

  const handleCheckAll = async () => {
    setMessage('');
    setIsChecking(true);
    // Get answer key for this sheet
    const answerKey = getAnswerKey(sheetId);
    if (!answerKey) {
      setMessage('Error: No answer key found for this sheet. Please add an answer key first.');
      setIsChecking(false);
      return;
    }
    for (const file of files) {
      setStatuses(prev => ({ ...prev, [file.name]: 'pending' }));
      try {
        // Get test info from localStorage (we need to get this from the sheet data)
        const sheets = JSON.parse(localStorage.getItem('answerSheets') || '[]');
        const currentSheet = sheets.find(s => s.id === sheetId);
        if (!currentSheet) {
          throw new Error('Sheet not found');
        }
        // Prepare test info for backend
        const testInfo = {
          num_items: parseInt(currentSheet.form.numItems) || 0,
          num_choices: parseInt(currentSheet.form.numChoices) || 4,
          exam_type: currentSheet.form.examType || '',
          subject_name: currentSheet.form.subjectName || '',
          academic_term: currentSheet.form.academicTerm || '',
          grid_start_y: currentSheet.form.gridStartY || null,
          grid_layout_params: currentSheet.form.gridLayoutParams || null
        };
        // Send to backend API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('test_info', JSON.stringify(testInfo));
        formData.append('answer_key', JSON.stringify(answerKey));
        const res = await fetch('http://localhost:5000/api/check', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Check failed: ${errorText}`);
        }
        const result = await res.json();
        // Save result in localStorage (append to scanResults for this sheet)
        try {
          const prevResults = JSON.parse(localStorage.getItem(`scanResults_${sheetId}`) || '[]');
          localStorage.setItem(`scanResults_${sheetId}`, JSON.stringify([...prevResults, result]));
          setStatuses(prev => ({ ...prev, [file.name]: 'checked' }));
        } catch (storageError) {
          if (storageError.name === 'QuotaExceededError') {
            // localStorage is full, clear old results and try again
            try {
              // Clear all scan results to free up space
              const keys = Object.keys(localStorage);
              keys.forEach(key => {
                if (key.startsWith('scanResults_')) {
                  localStorage.removeItem(key);
                }
              });
              // Try saving again
              localStorage.setItem(`scanResults_${sheetId}`, JSON.stringify([result]));
              setStatuses(prev => ({ ...prev, [file.name]: 'checked' }));
              setMessage('Storage was full. Old results cleared. Current result saved.');
            } catch (retryError) {
              console.error('Failed to save even after clearing storage:', retryError);
              setStatuses(prev => ({ ...prev, [file.name]: 'error' }));
              setMessage('Error: Storage is full and could not be cleared. Please clear some results manually.');
            }
          } else {
            throw storageError;
          }
        }
      } catch (err) {
        console.error('Error checking file:', err);
        setStatuses(prev => ({ ...prev, [file.name]: 'error' }));
        setMessage(`Error: ${err.message}`);
      }
    }
    setIsChecking(false);
    setMessage('All test papers have been checked! See results tab for scores.');
  };

  return (
    <div className={styles['upload-outer']}>
      <div className={styles['upload-dropzone']} onClick={handleBrowseClick}>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          multiple
        />
        <div className={styles['upload-icon']}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 34V14M24 14L16 22M24 14L32 22" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="8" y="38" width="32" height="4" rx="2" fill="#444" fillOpacity="0.12"/>
          </svg>
        </div>
        <div className={styles['upload-text']}>Drop or click to upload PNG/JPG/PDF test papers</div>
      </div>
      {files.length > 0 && (
        <div className={styles['upload-files-list']}>
          {files.map((f, idx) => (
            <div className={styles['upload-file-item']} key={f.name + idx}>
              <span className={styles['upload-file-name']}>{f.name}</span>
              <span className={styles['upload-file-type']}>
                {f.type === 'application/pdf' ? 'PDF' : f.type.replace('image/', '').toUpperCase()}
              </span>
              <span className={styles['upload-file-status']}>
                {statuses[f.name] === 'checked' && '✅ Checked'}
                {statuses[f.name] === 'pending' && '⏳ Pending'}
                {statuses[f.name] === 'error' && '❌ Error'}
                {statuses[f.name] === 'idle' && '🕓 Ready'}
              </span>
            </div>
          ))}
        </div>
      )}
      <button
        className={styles['upload-scan-btn']}
        onClick={handleCheckAll}
        disabled={files.length === 0 || isChecking}
      >
        {isChecking ? 'Checking...' : 'Check All Papers'}
      </button>
      {message && <div className={styles['upload-message']}>{message}</div>}
    </div>
  );
}

export default UploadSheets;