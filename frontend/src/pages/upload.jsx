import React, { useRef, useState } from 'react';
import styles from '../styles/upload.module.css';
import { useNavigate } from 'react-router-dom';

function UploadSheets() {
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

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      const results = [
        { name: 'Name 1', section: 'Section', score: 'Score' },
        { name: 'Name 2', section: 'Section', score: 'Score' },
        { name: 'Name 3', section: 'Section', score: 'Score' },
      ];
      localStorage.setItem('scanResults', JSON.stringify(results));
      setScanning(false);
      navigate('/results');
    }, 1500);
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