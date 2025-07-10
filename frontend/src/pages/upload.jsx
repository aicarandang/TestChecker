import React, { useState, useRef, useEffect } from 'react';
import '../styles/sidebar.css';
import styles from '../styles/upload.module.css';

function UploadSheets() {
  // Upload/OMR logic for test checking
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [omrImage, setOmrImage] = useState(null);
  const [omrResults, setOmrResults] = useState(null);
  const [omrReady, setOmrReady] = useState(false);
  const [fileToCheck, setFileToCheck] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const canvasRef = useRef(null);

  // Helper: Convert PDF file to image (returns Promise with dataURL)
  async function pdfToImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(ev) {
        try {
          const typedarray = new Uint8Array(ev.target.result);
          // You may need to set the workerSrc here if using PDF.js
          const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // Helper: Load answer key from localStorage
  function loadAnswerKey() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('answerKey_'));
    if (keys.length === 0) {
      console.warn('No answer key found in localStorage');
      return {};
    }
    const latestKey = keys[keys.length - 1];
    const saved = localStorage.getItem(latestKey);
    return saved ? JSON.parse(saved) : {};
  }

  // Drag-and-drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    );
    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Only images and PDFs are supported.');
    }
    setUploadedFiles((prev) => [...prev, ...validFiles]);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    );
    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Only images and PDFs are supported.');
    }
    setUploadedFiles((prev) => [...prev, ...validFiles]);
  };
  const handleClickDropZone = () => {
    fileInputRef.current?.click();
  };
  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  const clearAllFiles = () => {
    setUploadedFiles([]);
    setOmrResults(null);
    setCurrentFile(null);
  };

  // When omrReady and fileToCheck are set, process the file
  useEffect(() => {
    if (!omrReady || !fileToCheck) return;
    setIsProcessing(true);
    setCurrentFile(fileToCheck);
    // If image, process directly
    if (fileToCheck.type && fileToCheck.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => {
        setOmrImage(ev.target.result);
      };
      reader.onerror = err => {
        alert('Failed to read image file. Please try again.');
        setIsProcessing(false);
      };
      reader.readAsDataURL(fileToCheck);
    } else if (
      (fileToCheck.type && fileToCheck.type.toLowerCase().includes('pdf')) ||
      (fileToCheck.name && fileToCheck.name.toLowerCase().endsWith('.pdf'))
    ) {
      pdfToImage(fileToCheck)
        .then(dataUrl => {
          setOmrImage(dataUrl);
        })
        .catch(err => {
          alert('Failed to process PDF. Please ensure it\'s a valid PDF file.');
          setIsProcessing(false);
        });
    } else {
      alert('Unsupported file type. Please upload an image or PDF file.');
      setIsProcessing(false);
    }
  }, [omrReady, fileToCheck]);

  // OMR processing logic for test checking
  useEffect(() => {
    if (!omrImage) return;
    if (!window.cv) {
      alert('OpenCV is not loaded. Please refresh the page and try again.');
      setIsProcessing(false);
      return;
    }
    if (typeof omrImage !== 'string' || !omrImage.startsWith('data:image/')) {
      alert('Invalid image format. Please try again.');
      setIsProcessing(false);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        alert('Canvas not available for processing.');
        setIsProcessing(false);
        return;
      }
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      try {
        // OMR processing with opencv.js
        const src = new window.cv.Mat();
        const dst = new window.cv.Mat();
        window.cv.imread(canvas, src);
        window.cv.cvtColor(src, dst, window.cv.COLOR_RGBA2GRAY, 0);
        window.cv.threshold(dst, dst, 0, 255, window.cv.THRESH_BINARY_INV + window.cv.THRESH_OTSU);
        // Find contours (bubbles)
        const contours = new window.cv.MatVector();
        const hierarchy = new window.cv.Mat();
        window.cv.findContours(dst, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE);
        // Filter and sort contours by size and position
        let bubbles = [];
        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);
          const rect = window.cv.boundingRect(cnt);
          if (rect.width > 15 && rect.width < 50 && Math.abs(rect.width - rect.height) < 10) {
            bubbles.push(rect);
          }
        }
        bubbles.sort((a, b) => (a.y - b.y) || (a.x - b.x));
        const numQuestions = 50;
        const numChoices = 4;
        let rows = [];
        let rowY = null;
        let currentRow = [];
        for (let i = 0; i < bubbles.length; i++) {
          const rect = bubbles[i];
          if (rowY === null || Math.abs(rect.y - rowY) < 20) {
            currentRow.push(rect);
            rowY = rect.y;
          } else {
            rows.push(currentRow);
            currentRow = [rect];
            rowY = rect.y;
          }
        }
        if (currentRow.length) rows.push(currentRow);
        rows = rows.filter(r => r.length === numChoices);
        let detectedAnswers = {};
        for (let q = 0; q < Math.min(numQuestions, rows.length); q++) {
          let minMean = 255;
          let markedIdx = -1;
          for (let c = 0; c < numChoices; c++) {
            const rect = rows[q][c];
            const roi = dst.roi(rect);
            const mean = window.cv.mean(roi)[0];
            if (mean < minMean) {
              minMean = mean;
              markedIdx = c;
            }
            roi.delete();
          }
          detectedAnswers[q + 1] = ['A','B','C','D','E','F'][markedIdx];
        }
        const answerKey = loadAnswerKey();
        let results = [];
        let correctCount = 0;
        let totalQuestions = 0;
        for (let i = 1; i <= numQuestions; i++) {
          const detected = detectedAnswers[i] || '-';
          const correct = answerKey[i] || '-';
          const isCorrect = detected !== '-' && correct !== '-' && detected === correct;
          if (detected !== '-' || correct !== '-') {
            totalQuestions++;
            if (isCorrect) correctCount++;
          }
          results.push({
            number: i,
            detected: detected,
            correct: correct,
            isCorrect: isCorrect
          });
        }
        const fileName = currentFile ? currentFile.name : `Test_${Date.now()}`;
        const newResult = {
          id: Date.now(),
          fileName: fileName,
          results: results,
          score: correctCount,
          total: totalQuestions,
          percentage: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
          checkedAt: new Date().toLocaleString()
        };
        let allResults = [];
        try {
          allResults = JSON.parse(localStorage.getItem('allOmrResults')) || [];
        } catch (e) {}
        allResults.unshift(newResult);
        localStorage.setItem('allOmrResults', JSON.stringify(allResults));
        setOmrResults(results);
        setIsProcessing(false);
        src.delete(); 
        dst.delete(); 
        contours.delete(); 
        hierarchy.delete();
      } catch (error) {
        alert('Error processing the answer sheet. Please ensure the image is clear and try again.');
        setIsProcessing(false);
      }
    };
    img.onerror = () => {
      alert('Failed to load image for processing.');
      setIsProcessing(false);
    };
    img.src = omrImage;
  }, [omrImage, currentFile]);

  const checkFile = (file) => {
    setFileToCheck(file);
    setOmrReady(true);
  };

  return (
    <div className={styles.uploadContainer}>
      <div className={styles.uploadHeader}>
        <h2>Test Answer Sheet Checker</h2>
        <p>Upload scanned answer sheets (images or PDFs) to automatically check them against the answer key.</p>
      </div>
      <div className={styles.uploadSection}>
        <div
          className={
            styles.uploadDropZone + (isDragActive ? ' ' + styles.uploadDropZoneActive : '')
          }
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClickDropZone}
        >
          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*,.pdf"
            onChange={handleFileChange}
          />
          <div className={styles.uploadContent}>
            <div className={styles.uploadIcon}>📄</div>
            <h3>Upload Answer Sheets</h3>
            <p>Drag and drop files here, or click to browse</p>
            <p className={styles.uploadHint}>Supports: JPG, PNG, PDF</p>
          </div>
        </div>
        {uploadedFiles.length > 0 && (
          <div className={styles.fileManagement}>
            <div className={styles.fileHeader}>
              <h4>Uploaded Files ({uploadedFiles.length})</h4>
              <button 
                className={styles.clearButton}
                onClick={clearAllFiles}
              >
                Clear All
              </button>
            </div>
            <div className={styles.fileList}>
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className={styles.fileItem}>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileIcon}>
                      {file.type && file.type.startsWith('image/') ? '🖼️' : '📄'}
                    </span>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <div className={styles.fileActions}>
                    <button
                      className={styles.checkButton}
                      onClick={() => checkFile(file)}
                      disabled={isProcessing}
                    >
                      {isProcessing && currentFile === file ? 'Processing...' : 'Check'}
                    </button>
                    <button
                      className={styles.removeButton}
                      onClick={() => removeFile(idx)}
                      disabled={isProcessing}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {omrResults && currentFile && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <h3>Test Results: {currentFile.name}</h3>
            <div className={styles.scoreSummary}>
              {(() => {
                const correct = omrResults.filter(r => r.isCorrect).length;
                const total = omrResults.filter(r => r.detected !== '-' || r.correct !== '-').length;
                const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
                return (
                  <>
                    <span className={styles.score}>Score: {correct}/{total}</span>
                    <span className={styles.percentage}>({percentage}%)</span>
                  </>
                );
              })()}
            </div>
          </div>
          {(!omrResults.length || omrResults.every(r => r.detected === '-' && r.correct === '-')) && (
            <div className={styles.noResults}>
              <p>⚠️ No answers detected. Please check:</p>
              <ul>
                <li>Image quality and clarity</li>
                <li>Answer key is properly saved</li>
                <li>Bubbles are clearly marked</li>
              </ul>
            </div>
          )}
          <div className={styles.resultsTable}>
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Student Answer</th>
                  <th>Correct Answer</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {omrResults.map(r => (
                  <tr key={r.number} className={r.isCorrect ? styles.correct : styles.incorrect}>
                    <td>{r.number}</td>
                    <td>{r.detected}</td>
                    <td>{r.correct}</td>
                    <td>
                      {r.isCorrect === undefined ? '-' : r.isCorrect ? '✓' : '✗'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {isProcessing && (
        <div className={styles.processingOverlay}>
          <div className={styles.processingContent}>
            <div className={styles.spinner}></div>
            <p>Processing answer sheet...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadSheets;