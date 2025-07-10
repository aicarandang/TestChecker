import React from 'react';
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
          GlobalWorkerOptions.workerSrc = 'pdf.worker.js';
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
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
    // Try to find the most recent answer key
    const keys = Object.keys(localStorage).filter(key => key.startsWith('answerKey_'));
    if (keys.length === 0) {
      console.warn('No answer key found in localStorage');
      return {};
    }
    
    // Get the most recent answer key
    const latestKey = keys[keys.length - 1];
    const saved = localStorage.getItem(latestKey);
    console.log('Loading answer key from:', latestKey);
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
    console.log('[Test Checker] Processing file:', fileToCheck.name, fileToCheck.type);
    
    // If image, process directly
    if (fileToCheck.type && fileToCheck.type.startsWith('image/')) {
      console.log('[Test Checker] Processing image file...');
      const reader = new FileReader();
      reader.onload = ev => {
        console.log('[Test Checker] Image loaded successfully');
        setOmrImage(ev.target.result);
      };
      reader.onerror = err => {
        alert('Failed to read image file. Please try again.');
        console.error('[Test Checker] Image read error:', err);
        setIsProcessing(false);
      };
      reader.readAsDataURL(fileToCheck);
    } else if (
      (fileToCheck.type && fileToCheck.type.toLowerCase().includes('pdf')) ||
      (fileToCheck.name && fileToCheck.name.toLowerCase().endsWith('.pdf'))
    ) {
      console.log('[Test Checker] Processing PDF file...');
      pdfToImage(fileToCheck)
        .then(dataUrl => {
          console.log('[Test Checker] PDF converted successfully');
          setOmrImage(dataUrl);
        })
        .catch(err => {
          alert('Failed to process PDF. Please ensure it\'s a valid PDF file.');
          console.error('[Test Checker] PDF processing error:', err);
          setIsProcessing(false);
        });
    } else {
      alert('Unsupported file type. Please upload an image or PDF file.');
      console.error('[Test Checker] Unsupported file type:', fileToCheck);
      setIsProcessing(false);
    }
  }, [omrReady, fileToCheck]);

  // OMR processing logic for test checking
  useEffect(() => {
    if (!omrImage) return;
    
    console.log('[Test Checker] Starting OMR analysis...');
    
    if (!window.cv) {
      alert('OpenCV is not loaded. Please refresh the page and try again.');
      console.error('[Test Checker] OpenCV not available');
      setIsProcessing(false);
      return;
    }

    if (typeof omrImage !== 'string' || !omrImage.startsWith('data:image/')) {
      alert('Invalid image format. Please try again.');
      console.error('[Test Checker] Invalid image format');
      setIsProcessing(false);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        alert('Canvas not available for processing.');
        console.error('[Test Checker] Canvas not found');
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
          // Heuristic: bubbles are roughly square and not too small/large
          if (rect.width > 15 && rect.width < 50 && Math.abs(rect.width - rect.height) < 10) {
            bubbles.push(rect);
          }
        }

        // Sort bubbles top-to-bottom, then left-to-right
        bubbles.sort((a, b) => (a.y - b.y) || (a.x - b.x));

        // Group bubbles by rows (questions)
        const numQuestions = 50; // Default, can be made configurable
        const numChoices = 4; // Default A-D, can be made configurable
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

        // Only keep rows with the right number of choices
        rows = rows.filter(r => r.length === numChoices);

        // For each row, find the filled bubble (darkest mean pixel)
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

        // Compare to answer key
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

        // Save results to localStorage for the Results tab
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
        } catch (e) {
          console.warn('Error loading existing results:', e);
        }
        
        allResults.unshift(newResult); // Add newest first
        localStorage.setItem('allOmrResults', JSON.stringify(allResults));

        setOmrResults(results);
        setIsProcessing(false);
        
        console.log('[Test Checker] Analysis complete. Score:', correctCount, '/', totalQuestions);
        
        // Clean up OpenCV objects
        src.delete(); 
        dst.delete(); 
        contours.delete(); 
        hierarchy.delete();

      } catch (error) {
        console.error('[Test Checker] OMR processing error:', error);
        alert('Error processing the answer sheet. Please ensure the image is clear and try again.');
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      alert('Failed to load image for processing.');
      console.error('[Test Checker] Image load error');
      setIsProcessing(false);
    };
    
    img.src = omrImage;
  }, [omrImage, currentFile]);

  const checkFile = (file) => {
    setFileToCheck(file);
    setOmrReady(true);
  };

  return (
    <div className="tab-placeholder">[Placeholder] Upload scanned sheets here.</div>
  );
}

export default UploadSheets;