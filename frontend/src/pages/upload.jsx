import React, { useRef, useState, useEffect } from 'react';
import styles from '../styles/upload.module.css';
import { useNavigate } from 'react-router-dom';

function UploadSheets() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [detectedBubbles, setDetectedBubbles] = useState([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [answerKey, setAnswerKey] = useState(null);
  const [opencvLoaded, setOpencvLoaded] = useState(false);
  const fileInputRef = useRef();
  const canvasRef = useRef();
  const navigate = useNavigate();

  // Load OpenCV script with better error handling
  useEffect(() => {
    const loadOpenCV = () => {
      // Check if OpenCV is already loaded
      if (typeof cv !== 'undefined') {
        setOpencvLoaded(true);
        return;
      }

      const script = document.createElement('script');
      // Try local file first, then fallback to CDN
      script.src = '/opencv.js';
      script.async = true;
      script.type = 'text/javascript';
      
      script.onload = () => {
        console.log('OpenCV loaded successfully from local file');
        // Wait a bit for OpenCV to fully initialize
        setTimeout(() => {
          if (typeof cv !== 'undefined' && cv.Mat && cv.imread) {
            setOpencvLoaded(true);
            console.log('OpenCV fully initialized');
          } else {
            console.log('OpenCV not fully initialized yet, waiting...');
            // Try again after a longer delay
            setTimeout(() => {
              if (typeof cv !== 'undefined' && cv.Mat && cv.imread) {
                setOpencvLoaded(true);
                console.log('OpenCV fully initialized after delay');
              }
            }, 2000);
          }
        }, 1000);
      };
      
      script.onerror = () => {
        console.log('Local OpenCV not found, trying CDN...');
        // Fallback to CDN
        const cdnScript = document.createElement('script');
        cdnScript.src = 'https://docs.opencv.org/4.x/opencv.js';
        cdnScript.async = true;
        cdnScript.type = 'text/javascript';
        
        cdnScript.onload = () => {
          console.log('OpenCV loaded successfully from CDN');
          // Wait a bit for OpenCV to fully initialize
          setTimeout(() => {
            if (typeof cv !== 'undefined' && cv.Mat && cv.imread) {
              setOpencvLoaded(true);
              console.log('OpenCV fully initialized from CDN');
            } else {
              console.log('OpenCV not fully initialized from CDN yet, waiting...');
              // Try again after a longer delay
              setTimeout(() => {
                if (typeof cv !== 'undefined' && cv.Mat && cv.imread) {
                  setOpencvLoaded(true);
                  console.log('OpenCV fully initialized from CDN after delay');
                }
              }, 2000);
            }
          }, 1000);
        };
        
        cdnScript.onerror = () => {
          console.error('Failed to load OpenCV from both local and CDN');
          setError('Failed to load OpenCV library. Please check your internet connection or ensure opencv.js is in the public folder.');
        };
        
        document.head.appendChild(cdnScript);
      };
      
      document.head.appendChild(script);
    };

    loadOpenCV();
  }, []);

  // Load answer key for comparison
  useEffect(() => {
    const loadAnswerKey = () => {
      try {
        // Try to get the most recent answer key
        const keys = Object.keys(localStorage);
        const answerKeys = keys.filter(key => key.startsWith('answerKey_'));
        if (answerKeys.length > 0) {
          const latestKey = answerKeys[answerKeys.length - 1];
          const savedKey = localStorage.getItem(latestKey);
          if (savedKey) {
            const parsedKey = JSON.parse(savedKey);
            setAnswerKey(parsedKey);
            console.log('Answer key loaded:', parsedKey.length, 'questions');
          }
        }
      } catch (err) {
        console.error('Error loading answer key:', err);
      }
    };
    loadAnswerKey();
  }, []);

  const handleFileChange = (e) => {
    console.log('File change event triggered');
    const selectedFiles = Array.from(e.target.files);
    console.log('Selected files:', selectedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    const validFiles = selectedFiles.filter(f => ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(f.type));
    console.log('Valid files:', validFiles.length);
    
    if (validFiles.length !== selectedFiles.length) {
      setError('Only PNG, JPEG, or PDF files are allowed.');
    } else {
      setError('');
    }
    setFiles(prev => [...prev, ...validFiles]);
    
    // Load first image for preview and scanning
    if (validFiles.length > 0 && validFiles[0].type.startsWith('image/')) {
      console.log('Loading image:', validFiles[0].name, validFiles[0].type);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        console.log('FileReader onload triggered');
        const result = event.target.result;
        console.log('Image data loaded, length:', result.length);
        setCurrentImage(result);
        console.log('Current image state updated');
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setError('Failed to read image file: ' + error.target.error);
      };
      
      reader.readAsDataURL(validFiles[0]);
    } else if (validFiles.length > 0) {
      console.log('PDF file selected, not loading as image');
      setError('PDF files are not supported for scanning. Please convert to PNG or JPEG.');
    }
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

  // Function to check if a bubble is filled by analyzing pixel density
  const isBubbleFilled = (ctx, x, y, radius) => {
    const sampleSize = Math.max(1, Math.floor(radius / 2));
    const centerX = Math.round(x);
    const centerY = Math.round(y);
    
    let darkPixels = 0;
    let totalPixels = 0;
    
    // Sample pixels within the bubble area
    for (let dx = -sampleSize; dx <= sampleSize; dx++) {
      for (let dy = -sampleSize; dy <= sampleSize; dy++) {
        const px = centerX + dx;
        const py = centerY + dy;
        
        // Check if pixel is within circle
        if ((dx * dx + dy * dy) <= sampleSize * sampleSize) {
          try {
            const pixelData = ctx.getImageData(px, py, 1, 1).data;
            const gray = (pixelData[0] + pixelData[1] + pixelData[2]) / 3;
            if (gray < 150) { // More lenient threshold
              darkPixels++;
            }
            totalPixels++;
          } catch (e) {
            // Skip pixels outside canvas bounds
          }
        }
      }
    }
    
    // Bubble is considered filled if more than 25% of pixels are dark
    return totalPixels > 0 && (darkPixels / totalPixels) > 0.25;
  };

  // Simplified bubble position detection
  const getBubblePosition = (x, y, numItems, numChoices) => {
    // For now, return a simple mapping based on position
    // This can be refined based on actual PDF layout
    const questionNum = Math.floor(y / 30) + 1; // Approximate row calculation
    const choiceIndex = Math.floor((x % 200) / 50); // Approximate column calculation
    
    if (questionNum >= 1 && questionNum <= numItems && choiceIndex >= 0 && choiceIndex < numChoices) {
      return {
        questionNum,
        choice: String.fromCharCode(65 + choiceIndex), // A, B, C, D, etc.
        choiceIndex
      };
    }
    
    return null;
  };

  const processImageWithOpenCV = () => {
    if (!canvasRef.current || !currentImage) {
      setError('No image loaded for processing.');
      return;
    }
    
    if (!opencvLoaded) {
      setError('OpenCV is not loaded yet. Please wait a moment and try again.');
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = currentImage;
    img.onload = () => {
      console.log('Processing image:', img.width, 'x', img.height);
      
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        // OpenCV processing
        const src = cv.imread(canvas);
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        // Apply Gaussian blur to reduce noise
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

        const circles = new cv.Mat();
        
        // Optimized parameters for bubble sheet circle detection
        cv.HoughCircles(
          blurred,
          circles,
          cv.HOUGH_GRADIENT,
          1,      // dp (inverse ratio of accumulator resolution)
          20,     // minDist (minimum distance between circles)
          50,     // param1 (edge detection threshold)
          20,     // param2 (accumulator threshold - balanced sensitivity)
          6,      // minRadius (smaller bubbles)
          30      // maxRadius (larger bubbles)
        );

        // Get the number of circles before processing
        const numCircles = circles.cols;
        console.log('Detected circles:', numCircles);
        
        // If we detected very few circles, try with more sensitive parameters
        if (numCircles < 5) {
          console.log('Detected very few circles, trying with more sensitive parameters...');
          circles.delete();
          
          const circles2 = new cv.Mat();
          cv.HoughCircles(
            blurred,
            circles2,
            cv.HOUGH_GRADIENT,
            1,
            15,     // reduced minDist
            50,
            15,     // more sensitive
            6,
            30
          );
          
          const numCircles2 = circles2.cols;
          console.log('Second attempt detected circles:', numCircles2);
          
          if (numCircles2 > numCircles) {
            circles.delete();
            circles = circles2;
            console.log('Using more sensitive detection results');
          } else {
            circles2.delete();
          }
        }

        let answers = [];
        const numItems = answerKey ? answerKey.length : 50;
        const numChoices = 4;
        
        for (let i = 0; i < numCircles; ++i) {
          const x = circles.data32F[i * 3];
          const y = circles.data32F[i * 3 + 1];
          const radius = circles.data32F[i * 3 + 2];
          
          console.log(`Circle ${i + 1}: (${x}, ${y}), radius: ${radius}`);
          
          // Check if bubble is filled
          const isFilled = isBubbleFilled(ctx, x, y, radius);
          
          // Determine bubble position in grid
          const position = getBubblePosition(x, y, numItems, numChoices);
          
          // Draw detected circles on canvas
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = isFilled ? 'red' : 'blue';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Add text label for debugging
          ctx.fillStyle = isFilled ? 'red' : 'blue';
          ctx.font = '12px Arial';
          ctx.fillText(`${i + 1}`, x + radius + 5, y);
          
          if (position) {
            answers.push({ 
              x: Math.round(x), 
              y: Math.round(y), 
              radius: Math.round(radius),
              id: i + 1,
              isFilled,
              questionNum: position.questionNum,
              choice: position.choice,
              choiceIndex: position.choiceIndex
            });
          }
        }

        // Clean up OpenCV objects
        src.delete(); 
        gray.delete(); 
        blurred.delete();
        circles.delete();
        
        console.log('Processed answers:', answers);
        setDetectedBubbles(answers);
        setShowCanvas(true);
        
        if (answers.length === 0) {
          setError('No bubbles detected. Please try adjusting the image or scan parameters.');
        }
        
        // Store results for navigation
        const results = {
          bubbles: answers,
          answerKey: answerKey,
          timestamp: new Date().toISOString(),
          totalQuestions: numItems,
          totalChoices: numChoices
        };
        
        localStorage.setItem('scanResults', JSON.stringify(results));
        
      } catch (err) {
        console.error('OpenCV processing error:', err);
        setError('Error processing image: ' + err.message);
      }
    };
    
    img.onerror = () => {
      setError('Failed to load image for processing.');
    };
  };

  // Simple fallback bubble detection without OpenCV
  const processImageSimple = () => {
    console.log('=== SIMPLE METHOD DEBUG ===');
    console.log('Canvas ref:', canvasRef.current);
    console.log('Current image:', currentImage ? 'Loaded (' + currentImage.length + ' chars)' : 'Not loaded');
    console.log('Files:', files.length);
    
    if (!canvasRef.current) {
      setError('Canvas not available. Please try again.');
      return;
    }
    
    if (!currentImage) {
      setError('No image loaded for processing. Please upload an image first.');
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = currentImage;
    
    img.onload = () => {
      console.log('Simple method - Image loaded:', img.width, 'x', img.height);
      
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        // Simple grid-based bubble detection
        const numItems = answerKey ? answerKey.length : 50;
        const numChoices = 4;
        const answers = [];
        
        // Create a simple grid pattern for testing
        const gridSize = 30;
        const startX = 100;
        const startY = 150;
        
        // Create a reasonable number of circles for testing
        const maxRows = Math.min(numItems, 25);
        
        for (let row = 0; row < maxRows; row++) {
          for (let col = 0; col < numChoices; col++) {
            const x = startX + col * gridSize;
            const y = startY + row * gridSize;
            const radius = 8;
            
            // Simple check for dark pixels in the area
            const isFilled = isBubbleFilled(ctx, x, y, radius);
            
            // Draw detected circles on canvas
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = isFilled ? 'red' : 'blue';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add text label
            ctx.fillStyle = isFilled ? 'red' : 'blue';
            ctx.font = '10px Arial';
            ctx.fillText(`${row + 1}${String.fromCharCode(65 + col)}`, x + radius + 2, y);
            
            answers.push({ 
              x: Math.round(x), 
              y: Math.round(y), 
              radius: radius,
              id: row * numChoices + col + 1,
              isFilled,
              questionNum: row + 1,
              choice: String.fromCharCode(65 + col),
              choiceIndex: col
            });
          }
        }
        
        console.log('Simple method processed answers:', answers);
        setDetectedBubbles(answers);
        setShowCanvas(true);
        
        // Store results for navigation
        const results = {
          bubbles: answers,
          answerKey: answerKey,
          timestamp: new Date().toISOString(),
          totalQuestions: numItems,
          totalChoices: numChoices
        };
        
        localStorage.setItem('scanResults', JSON.stringify(results));
        
      } catch (err) {
        console.error('Simple processing error:', err);
        setError('Error processing image: ' + err.message);
      }
    };
    
    img.onerror = (error) => {
      console.error('Simple method - Image load error:', error);
      setError('Failed to load image for processing.');
    };
  };

  const handleScan = () => {
    if (!currentImage) {
      setError('Please upload an image first.');
      return;
    }
    
    if (!answerKey) {
      setError('No answer key found. Please create an answer key first.');
      return;
    }
    
    setScanning(true);
    setError('');
    
    console.log('Starting scan process...');
    console.log('Current image:', currentImage ? 'Loaded' : 'Not loaded');
    console.log('OpenCV loaded:', opencvLoaded);
    console.log('Answer key:', answerKey ? `${answerKey.length} questions` : 'Not loaded');
    
    // Small delay to ensure everything is ready
    setTimeout(() => {
      if (opencvLoaded) {
        processImageWithOpenCV();
      } else {
        console.log('OpenCV not available, using simple method');
        processImageSimple();
      }
      setScanning(false);
    }, 500);
  };



  const handleViewResults = () => {
    navigate('/results');
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
              {f.type.startsWith('image/') && (
                <span className={styles['upload-file-status']}>
                  {currentImage ? '✓ Loaded' : '⏳ Loading...'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      
      {currentImage && (
        <div className={styles['upload-image-preview']}>
          <h4>Image Preview:</h4>
          <img 
            src={currentImage} 
            alt="Preview" 
            style={{ maxWidth: '200px', maxHeight: '150px', border: '1px solid #ccc' }}
          />
        </div>
      )}
      
      {answerKey && (
        <div className={styles['upload-answer-key-info']}>
          <span className={styles['upload-answer-key-status']}>✓ Answer Key Loaded</span>
          <span className={styles['upload-answer-key-details']}>
            {answerKey.length} questions configured
          </span>
        </div>
      )}
      
      {!answerKey && (
        <div className={styles['upload-no-answer-key']}>
          <span className={styles['upload-warning']}>⚠ No Answer Key Found</span>
          <span className={styles['upload-warning-text']}>
            Please create an answer key in the Answer Key tab first.
          </span>
        </div>
      )}
      
      {!opencvLoaded && (
        <div className={styles['upload-no-answer-key']}>
          <span className={styles['upload-warning']}>⏳ Loading OpenCV</span>
          <span className={styles['upload-warning-text']}>
            Please wait while OpenCV library loads...
          </span>
        </div>
      )}
      

      
      {error && <div className={styles['upload-error']}>{error}</div>}
      
      <div className={styles['upload-buttons']}>
        <button
          className={styles['upload-scan-btn']}
          onClick={handleScan}
          disabled={!currentImage || scanning || !answerKey}
        >
          {scanning ? 'Scanning...' : 'Check'}
        </button>
      </div>

      {showCanvas && (
        <div className={styles['upload-results']}>
          <h3>Detected Bubbles ({detectedBubbles.length})</h3>
          <div className={styles['upload-canvas-container']}>
            <canvas 
              ref={canvasRef} 
              className={styles['upload-canvas']}
              style={{ maxWidth: '100%', border: '1px solid #ccc', marginTop: '10px' }}
            />
            <div className={styles['upload-legend']}>
              <div className={styles['upload-legend-item']}>
                <span className={styles['upload-legend-red']}></span>
                <span>Filled Bubbles</span>
              </div>
              <div className={styles['upload-legend-item']}>
                <span className={styles['upload-legend-blue']}></span>
                <span>Empty Bubbles</span>
              </div>
            </div>
          </div>
          <div className={styles['upload-bubbles-list']}>
            {detectedBubbles.map((bubble) => (
              <div key={bubble.id} className={styles['upload-bubble-item']}>
                <span className={styles['bubble-info']}>
                  Q{bubble.questionNum} {bubble.choice}: 
                  <span className={bubble.isFilled ? styles['bubble-filled'] : styles['bubble-empty']}>
                    {bubble.isFilled ? ' Filled' : ' Empty'}
                  </span>
                </span>
                <span className={styles['bubble-coords']}>
                  ({bubble.x}, {bubble.y})
                </span>
              </div>
            ))}
          </div>
          {detectedBubbles.length > 0 && (
            <button
              className={styles['upload-view-results-btn']}
              onClick={handleViewResults}
            >
              View Test Results
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadSheets;