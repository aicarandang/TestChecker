// Utility functions for answer sheet image processing
// Uses OpenCV.js for bubble detection and Tesseract.js for OCR

import Tesseract from 'tesseract.js';

/**
 * Detect filled bubbles in an answer sheet image.
 * @param {HTMLImageElement|HTMLCanvasElement} image - The image to process.
 * @param {Object} sheetConfig - Configuration (number of items, choices, layout info).
 * @returns {Promise<Array>} - Array of detected answers (e.g., ['A', 'C', ...])
 */
export async function detectFilledBubbles(image, sheetConfig, debug = false) {
  return new Promise((resolve, reject) => {
    if (!window.cv) {
      reject(new Error('OpenCV.js is not loaded'));
      return;
    }
    try {
      let src = cv.imread(image);
      let warped = warpToA4(src, debug);
      if (!warped) warped = src;
      // Dynamically scale bubble positions
      const scaleX = warped.cols / 595;
      const scaleY = warped.rows / 842;
      const bubblePositions = getBubblePositions(sheetConfig).map(row =>
        row.map(b => ({
          x: Math.round(b.x * scaleX),
          y: Math.round(b.y * scaleY),
          r: Math.round(b.r * ((scaleX + scaleY) / 2)),
        }))
      );
      let gray = new cv.Mat();
      let thresh = new cv.Mat();
      cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 15, 10);
      let answers = [];
      for (let i = 0; i < bubblePositions.length; i++) {
        let row = bubblePositions[i];
        let maxFill = -Infinity;
        let filledIdx = -1;
        for (let j = 0; j < row.length; j++) {
          const { x, y, r } = row[j];
          let mask = cv.Mat.zeros(thresh.rows, thresh.cols, cv.CV_8UC1);
          cv.circle(mask, new cv.Point(x, y), r, new cv.Scalar(255), -1);
          let mean = cv.mean(thresh, mask)[0];
          mask.delete();
          if (mean > maxFill) {
            maxFill = mean;
            filledIdx = j;
          }
        }
        const choiceLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
        answers.push(choiceLabels[filledIdx] || null);
      }
      src.delete();
      if (warped !== src) warped.delete();
      gray.delete();
      thresh.delete();
      resolve(answers);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Extract text fields (e.g., name, section) from an answer sheet image.
 * @param {HTMLImageElement|HTMLCanvasElement} image - The image to process.
 * @param {Object} regions - Regions of interest for OCR (bounding boxes)
 * @returns {Promise<Object>} - Extracted fields, e.g., { name: 'John Doe', section: 'A' }
 */
export async function extractTextFields(image, regions, debug = false) {
  if (!regions) regions = getTextFieldRegions();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let src = cv.imread(image);
  let warped = warpToA4(src, debug);
  if (!warped) warped = src;
  let results = {};
  for (const [field, {x, y, w, h}] of Object.entries(regions)) {
    const margin = 8;
    // Dynamically scale regions if warped size is not A4
    const scaleX = warped.cols / 595;
    const scaleY = warped.rows / 842;
    const rx = Math.round((x - margin) * scaleX);
    const ry = Math.round((y - margin) * scaleY);
    const rw = Math.round((w + margin * 2) * scaleX);
    const rh = Math.round((h + margin * 2) * scaleY);
    const { x: cx, y: cy, w: cw, h: ch } = clampRect(rx, ry, rw, rh, warped.cols, warped.rows);
    canvas.width = cw;
    canvas.height = ch;
    let roi;
    try {
      roi = warped.roi(new cv.Rect(cx, cy, cw, ch));
    } catch {
      results[field] = '[unreadable]';
      continue;
    }
    cv.cvtColor(roi, roi, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(roi, roi, 128, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
    // Convert single-channel to RGBA for ImageData
    let rgba = new cv.Mat();
    cv.cvtColor(roi, rgba, cv.COLOR_GRAY2RGBA, 0);
    let imgData = new ImageData(new Uint8ClampedArray(rgba.data), rgba.cols, rgba.rows);
    canvas.getContext('2d').putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng', { logger: m => {} });
    results[field] = text.trim() || '[unreadable]';
    roi.delete();
    rgba.delete();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  src.delete();
  if (warped !== src) warped.delete();
  return results;
}

// PDF layout reference (from generate.jsx):
// Name box: x=48, y=header+22+18+line, w=boxWidth, h=24
// Section box: x=48, y=header+22+18+24+line, w=boxWidth, h=24
// Bubbles: start at y after header, then rowH=22, colW=20, bubbleR=7, etc.

// Helper to compute bubble positions based on sheetConfig
function getBubblePositions(sheetConfig) {
  // These values should match the PDF layout
  const numItems = parseInt(sheetConfig.numItems);
  const numChoices = parseInt(sheetConfig.numChoices);
  const itemsPerColumn = 25;
  const rowH = 22;
  const colW = 20;
  const bubbleR = 7;
  const numberWidth = 18;
  const gap = 8;
  const pageWidth = 595.28; // A4 width in pt
  const colWidth = (pageWidth - 120) / 2;
  const colX = [60, 60 + colWidth];
  const groupWidth = numberWidth + gap + numChoices * colW;
  const groupOffset = (colWidth - groupWidth) / 2;
  // Header height estimate (from PDF):
  let y = 48 + 22 + 18 + 24 + 24 + 36 + 14 + 13 * 2 + 14; // yStart + header + directions
  let positions = [];
  for (let i = 0; i < numItems; i++) {
    const col = Math.floor(i / itemsPerColumn);
    const row = i % itemsPerColumn;
    const baseX = colX[col] + groupOffset;
    const baseY = y + row * rowH;
    let rowBubbles = [];
    for (let c = 0; c < numChoices; c++) {
      rowBubbles.push({
        x: baseX + numberWidth + gap + c * colW,
        y: baseY + bubbleR + 9,
        r: bubbleR
      });
    }
    positions.push(rowBubbles);
  }
  return positions;
}

// Helper to get name/section box positions
function getTextFieldRegions() {
  // These should match the PDF layout
  return {
    name: { x: 48, y: 48 + 22 + 18, w: 200, h: 24 },
    section: { x: 48, y: 48 + 22 + 18 + 24, w: 200, h: 24 },
  };
}

// Helper: warp image to A4 using largest rectangle (sheet) detection
function warpToA4(srcMat, debug = false) {
  const A4_WIDTH = 595; // px (pt)
  const A4_HEIGHT = 842; // px (pt)
  let gray = new cv.Mat();
  cv.cvtColor(srcMat, gray, cv.COLOR_RGBA2GRAY, 0);
  let blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  let edged = new cv.Mat();
  cv.Canny(blurred, edged, 75, 200);
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  let maxArea = 0;
  let pageContour = null;
  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);
    let peri = cv.arcLength(cnt, true);
    let approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
    if (approx.rows === 4) {
      let area = cv.contourArea(cnt);
      if (area > maxArea) {
        maxArea = area;
        pageContour = approx;
      } else {
        approx.delete();
      }
    } else {
      approx.delete();
    }
    cnt.delete();
  }
  let warped = null;
  if (pageContour) {
    // Order points: top-left, top-right, bottom-right, bottom-left
    let pts = [];
    for (let i = 0; i < 4; i++) {
      pts.push({ x: pageContour.intPtr(i, 0)[0], y: pageContour.intPtr(i, 0)[1] });
    }
    pts.sort((a, b) => a.y - b.y);
    let [tl, tr] = pts[0].x < pts[1].x ? [pts[0], pts[1]] : [pts[1], pts[0]];
    let [bl, br] = pts[2].x < pts[3].x ? [pts[2], pts[3]] : [pts[3], pts[2]];
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, A4_WIDTH, 0, A4_WIDTH, A4_HEIGHT, 0, A4_HEIGHT]);
    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    warped = new cv.Mat();
    cv.warpPerspective(srcMat, warped, M, new cv.Size(A4_WIDTH, A4_HEIGHT));
    srcTri.delete(); dstTri.delete(); M.delete();
    if (debug) {
      // Return the warped image for visualization
      pageContour.delete();
      gray.delete(); blurred.delete(); edged.delete(); contours.delete(); hierarchy.delete();
      return warped;
    }
  }
  if (pageContour) pageContour.delete();
  gray.delete(); blurred.delete(); edged.delete(); contours.delete(); hierarchy.delete();
  return warped;
}

function clampRect(x, y, w, h, maxW, maxH) {
  // Clamp rectangle to image bounds
  const nx = Math.max(0, x);
  const ny = Math.max(0, y);
  const nw = Math.max(1, Math.min(w, maxW - nx));
  const nh = Math.max(1, Math.min(h, maxH - ny));
  return { x: nx, y: ny, w: nw, h: nh };
} 