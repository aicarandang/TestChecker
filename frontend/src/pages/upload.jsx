import React, { useRef, useState } from 'react';
import styles from '../styles/upload.module.css';
import { useNavigate } from 'react-router-dom';
import { detectFilledBubbles, extractTextFields } from '../utils/imageProcessing';

function UploadSheets({ onScanComplete }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(f => ['image/png', 'image/jpeg', 'application/pdf'].includes(f.type));
    if (validFiles.length !== selectedFiles.length) {
      setError('Only PNG, JPEG, or PDF files are allowed.');
    } else {
      setError('');
    }
    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleBrowseClick = (e) => {
    e.stopPropagation();
    fileInputRef.current.click();
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const sheets = JSON.parse(localStorage.getItem('answerSheets') || '[]');
      const selectedSheetId = localStorage.getItem('selectedSheetId');
      const sheet = sheets.find(s => s.id === selectedSheetId);
      const sheetConfig = sheet?.form || {};
      const answerKey = JSON.parse(localStorage.getItem(`answerKey_${selectedSheetId}`) || '[]');
      const ocrRegions = {
        name: { x: 48, y: 110, w: 200, h: 24 },
        section: { x: 48, y: 134, w: 200, h: 24 },
      };
      const results = [];
      for (const file of files) {
        const img = await new Promise((resolve, reject) => {
          const image = new window.Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = URL.createObjectURL(file);
        });
        const detectedAnswers = await detectFilledBubbles(img, sheetConfig);
        const fields = await extractTextFields(img, ocrRegions);
        let score = 0;
        let breakdown = [];
        for (let i = 0; i < answerKey.length; i++) {
          const studentAns = detectedAnswers[i] || '-';
          const correctAns = answerKey[i] || '-';
          const isCorrect = studentAns === correctAns;
          if (isCorrect) score++;
          breakdown.push({
            item: i + 1,
            student: studentAns,
            correct: correctAns,
            isCorrect,
          });
        }
        results.push({
          name: fields.name || 'Unknown',
          section: fields.section || 'Unknown',
          score: `${score} / ${answerKey.length}`,
          breakdown,
        });
      }
      localStorage.setItem(`scanResults_${selectedSheetId}`, JSON.stringify(results));
      setScanning(false);
      if (onScanComplete) onScanComplete();
    } catch (err) {
      setError('Error during scanning: ' + err.message);
      setScanning(false);
    }
  };

  return (
    <div className={styles['upload-outer']}>
      <div
        className={styles['upload-dropzone']}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
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
        <div className={styles['upload-text']}>Drop a file here to upload, or</div>
        <div className={styles['upload-browse']} onClick={handleBrowseClick}>click here to browse</div>
      </div>
      {files.length > 0 && (
        <div className={styles['upload-files-list']}>
          {files.map((f, idx) => (
            <div className={styles['upload-file-item']} key={f.name + idx}>
              <span className={styles['upload-file-name']}>{f.name}</span>
              <span className={styles['upload-file-type']}>{f.type.replace('image/', '').replace('application/', '').toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
      {error && <div className={styles['upload-error']}>{error}</div>}
      <button
        className={styles['upload-scan-btn']}
        onClick={handleScan}
        disabled={files.length === 0 || scanning}
      >
        {scanning ? 'Scanning...' : 'Scan & Check'}
      </button>
    </div>
  );
}

export default UploadSheets;