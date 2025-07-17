import os
import io
import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image
import pytesseract
import base64
import json
import fitz  # PyMuPDF

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Helper: Convert image to base64
def image_to_base64(img):
    _, buffer = cv2.imencode('.png', img)
    return 'data:image/png;base64,' + base64.b64encode(buffer).decode('utf-8')

# Helper: Convert PDF to image
def pdf_to_image(pdf_bytes, page_number=0):
    """Convert PDF page to OpenCV image format"""
    try:
        # Open PDF from bytes
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # Get the first page
        page = pdf_document[page_number]
        
        # Convert page to image with higher resolution
        mat = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))  # type: ignore
        
        # Convert to PIL Image
        pil_image = Image.frombytes("RGB", (mat.width, mat.height), mat.samples)  # type: ignore
        
        # Convert PIL image to OpenCV format
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Close the document
        pdf_document.close()
        
        return opencv_image
    except Exception as e:
        print(f"Error converting PDF to image: {e}")
        return None

# Helper: Detect black border rectangle
def detect_black_border(img):
    """Detect the black border rectangle and return its coordinates and dimensions"""
    try:
        print(f"Detecting border for image shape: {img.shape}")
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold to find dark regions
        _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        print(f"Found {len(contours)} contours")
        
        # Find the largest contour (should be the border)
        if not contours:
            print("No contours found")
            return None
        
        largest_contour = max(contours, key=cv2.contourArea)
        largest_area = cv2.contourArea(largest_contour)
        print(f"Largest contour area: {largest_area}")
        
        # Get bounding rectangle
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # Filter by size (should be large enough to be the main border)
        min_area = img.shape[0] * img.shape[1] * 0.3  # At least 30% of image
        print(f"Min area required: {min_area}, actual area: {w * h}")
        if w * h < min_area:
            print("Contour too small, not considered as border")
            return None
        
        print(f"Border detected: x={x}, y={y}, w={w}, h={h}")
        return (x, y, w, h)
    except Exception as e:
        print(f"Error detecting black border: {e}")
        import traceback
        traceback.print_exc()
        return None

# Helper: Extract text from a region
def ocr_region(img, x, y, w, h):
    # Ensure coordinates are within image bounds
    img_h, img_w = img.shape[:2]
    x = max(0, min(x, img_w - 1))
    y = max(0, min(y, img_h - 1))
    w = min(w, img_w - x)
    h = min(h, img_h - y)
    
    roi = img[y:y+h, x:x+w]
    
    # Check if ROI is valid
    if roi.size == 0 or w <= 0 or h <= 0:
        return ""
    
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    
    # Enhanced preprocessing for better OCR
    height, width = gray.shape
    scale_factor = max(2.0, 200.0 / width)  # Ensure minimum width of 200px
    if scale_factor > 1.0:
        gray = cv2.resize(gray, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(gray, (1, 1), 0)
    _, proc1 = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    proc2 = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    _, proc3 = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
    results = []
    for proc in [proc1, proc2, proc3]:
        kernel = np.ones((1,1), np.uint8)
        proc_clean = cv2.morphologyEx(proc, cv2.MORPH_CLOSE, kernel)
        pil_img = Image.fromarray(proc_clean)
        # Use correct Tesseract config for spaces and colons
        config = (
            '--psm 7 --oem 3 '
            '-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789: '
            '-c tessedit_preserve_interword_spaces=1'
        )
        text = pytesseract.image_to_string(pil_img, config=config).strip()
        # Only remove unwanted characters, keep spaces and colons
        import re
        text = re.sub(r'[^A-Za-z0-9\s:]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        if text:
            results.append(text)
    if results:
        return max(results, key=len)
    else:
        return ""

# Helper: Detect filled bubbles (simple thresholding + contour analysis)
def detect_bubbles(img, bubble_coords, threshold=0.5):
    answers = []
    for item_bubbles in bubble_coords:
        filled_bubbles = []
        for idx, (x, y, r) in enumerate(item_bubbles):
            mask = np.zeros(img.shape[:2], dtype=np.uint8)
            cv2.circle(mask, (x, y), r, 255, -1)
            mean_result = cv2.mean(img, mask=mask)
            mean = float(mean_result[0])  # type: ignore
            fill = 255 - mean  # Invert: filled = dark
            if fill > threshold * 255:
                filled_bubbles.append(idx)
        if len(filled_bubbles) == 1:
            answers.append(filled_bubbles[0])
        elif len(filled_bubbles) > 1:
            answers.append('Multiple Answers')
        else:
            answers.append(None)  # No answer
    return answers

@app.route('/api/check', methods=['POST'])
def check_sheet():
    try:
        print("=== Starting scan process ===")
        file = request.files['file']
        test_info = json.loads(request.form['test_info'])
        answer_key = json.loads(request.form['answer_key'])
        
        print(f"File received: {file.filename}")
        print(f"Test info: {test_info}")
        print(f"Answer key length: {len(answer_key)}")
        
        # Get file extension to determine if it's PDF or image
        filename = file.filename or ''
        is_pdf = filename.lower().endswith('.pdf')
        
        # Read file content
        file_content = file.read()
        
        # Process based on file type
        if is_pdf:
            # Convert PDF to image
            img = pdf_to_image(file_content)
            if img is None:
                return jsonify({'error': 'Failed to convert PDF to image'}), 400
        else:
            # Read image
            in_memory = np.frombuffer(file_content, np.uint8)
            img = cv2.imdecode(in_memory, cv2.IMREAD_COLOR)
            
            # Check if image was successfully decoded
            if img is None:
                return jsonify({'error': 'Failed to decode image'}), 400
        
        print(f"Image loaded successfully, shape: {img.shape}")
        
        # Detect black border
        border_info = detect_black_border(img)
        if border_info is None:
            return jsonify({'error': 'Could not detect black border in the image'}), 400
        
        border_x, border_y, border_w, border_h = border_info
        print(f"Border detected: x={border_x}, y={border_y}, w={border_w}, h={border_h}")
        
        # Crop image to border region
        cropped_img = img[border_y:border_y+border_h, border_x:border_x+border_w]
        
        # Use cropped image for all processing
        img = cropped_img
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # --- Reference dimensions (standard A4 proportions within border) ---
        ref_width = 595  # Reference width (PDF points)
        ref_height = 842  # Reference height (PDF points)
        
        # Calculate scaling factors based on detected border
        scale_x = border_w / ref_width
        scale_y = border_h / ref_height
        
        print(f"Scaling factors: scale_x={scale_x}, scale_y={scale_y}")

        # --- Layout parameters (from frontend) ---
        num_items = int(test_info['num_items'])
        num_choices = int(test_info['num_choices'])
        grid_params = test_info.get('grid_layout_params', {})
        if grid_params:
            items_per_column = grid_params.get('itemsPerColumn', 25)
            col_width_pdf = grid_params.get('colWidth', (ref_width - 120) / 2)
            col_x_pdf = grid_params.get('colX', [60, 60 + (ref_width - 120) / 2])
            row_h_pdf = grid_params.get('rowH', 22)
            col_w_pdf = grid_params.get('colW', 20)
            bubble_r_pdf = grid_params.get('bubbleR', 7)
            number_width_pdf = grid_params.get('numberWidth', 18)
            gap_pdf = grid_params.get('gap', 8)
            group_offset_pdf = grid_params.get('groupOffset', (col_width_pdf - (number_width_pdf + gap_pdf + num_choices * col_w_pdf)) / 2)
            # --- Move bubble grid down by 3 PDF points for even better alignment ---
            grid_start_y_pdf = grid_params.get('gridStartY', 0) + 3
            grid_start_y = int(grid_start_y_pdf * scale_y)
        else:
            items_per_column = 25
            col_width_pdf = (ref_width - 120) / 2
            col_x_pdf = [60, 60 + col_width_pdf]
            row_h_pdf = 22
            col_w_pdf = 20
            bubble_r_pdf = 7
            number_width_pdf = 18
            gap_pdf = 8
            group_offset_pdf = (col_width_pdf - (number_width_pdf + gap_pdf + num_choices * col_w_pdf)) / 2
            grid_start_y_pdf = int(test_info.get('grid_start_y', 120)) + 3
            grid_start_y = int(grid_start_y_pdf * scale_y)

        # Scale all coordinates to image pixels
        col_x = [int(x * scale_x) for x in col_x_pdf]
        col_width = col_width_pdf * scale_x
        row_h = int(row_h_pdf * scale_y)
        row_h = int(row_h * 1.04)
        col_w = int(col_w_pdf * scale_x)
        bubble_r = int(bubble_r_pdf * ((scale_x + scale_y) / 2))
        number_width = int(number_width_pdf * scale_x)
        gap = int(gap_pdf * scale_x)
        group_offset = int(group_offset_pdf * scale_x)

        # --- Name/Section box positions (PDF points, then scaled to image pixels) ---
        # Adjusted positions for better text capture - made boxes larger and moved slightly
        name_box_pdf = (45, 110, 240, 35)  # Made box larger and adjusted position
        section_box_pdf = (45, 135, 240, 35)  # Made box larger and adjusted position
        name_box = tuple(int(v * (scale_x if i % 2 == 0 else scale_y)) for i, v in enumerate(name_box_pdf))
        section_box = tuple(int(v * (scale_x if i % 2 == 0 else scale_y)) for i, v in enumerate(section_box_pdf))
        
        print(f"Name box: {name_box}")
        print(f"Section box: {section_box}")

        # --- OCR: Extract name and section ---
        name = ocr_region(img, *name_box)
        section = ocr_region(img, *section_box)
        
        # Remove 'NAME:' and 'COURSE/SECTION:' prefixes if present
        import re
        name = re.sub(r'^name:\s*', '', name, flags=re.IGNORECASE)
        # Normalize all whitespace to single spaces and trim
        name = re.sub(r'\s+', ' ', name).strip()
        # Robustly match 'COURSE/SECTION', 'COURSESECTION', and variations
        section = re.sub(r'^(course\s*[/:-]?\s*section|coursesection)\s*[:\-]?\s*', '', section, flags=re.IGNORECASE)
        # Normalize all whitespace to single spaces and trim
        section = re.sub(r'\s+', ' ', section).strip()
        
        # Ensure name and section are not None or empty
        if not name or name.strip() == "":
            name = "Unknown"
        if not section or section.strip() == "":
            section = "Unknown"
            
        print(f"Extracted name: '{name}'")
        print(f"Extracted section: '{section}'")

        # --- Calculate bubble coordinates (match frontend exactly, with fine-tuned vertical offset) ---
        bubble_coords = []
        for i in range(num_items):
            col = 0 if i < items_per_column else 1
            idx_in_col = i if col == 0 else i - items_per_column
            x = col_x[col]
            y = grid_start_y + idx_in_col * row_h
            for_bubbles = []
            for c in range(num_choices):
                bubble_x = x + group_offset + number_width + gap + c * col_w
                bubble_y = y + bubble_r + 7  # +7 for better alignment
                for_bubbles.append((int(round(bubble_x)), int(round(bubble_y)), int(round(bubble_r))))
            bubble_coords.append(for_bubbles)

        # --- OMR: Detect filled bubbles ---
        answers_idx = detect_bubbles(gray, bubble_coords)
        choice_labels = ['A', 'B', 'C', 'D', 'E', 'F'][:num_choices]
        answers = []
        for idx in answers_idx:
            if idx == 'Multiple Answers':
                answers.append('Multiple Answers')
            elif idx is not None:
                answers.append(choice_labels[idx])
            else:
                answers.append(None)

        # --- Scoring ---
        score = 0
        item_results = []
        for i, (ans, correct) in enumerate(zip(answers, answer_key)):
            correct_bool = (ans == correct)
            if correct_bool:
                score += 1
            item_results.append({
                'number': i+1,
                'answer': ans,
                'correct_answer': correct,
                'correct': correct_bool
            })

        # --- Annotate image ---
        annotated = img.copy()
        
        # Draw the detected border (for debugging)
        cv2.rectangle(annotated, (0, 0), (border_w, border_h), (255, 255, 0), 2)
        
        for i, item_bubbles in enumerate(bubble_coords):
            for c, (x, y, r) in enumerate(item_bubbles):
                color = (0, 255, 0) if answers_idx[i] == c and answers[i] == answer_key[i] else (0, 0, 255) if answers_idx[i] == c else (180, 180, 180)
                cv2.circle(annotated, (x, y), r, color, 2)
        # Draw name/section boxes
        cv2.rectangle(annotated, (name_box[0], name_box[1]), (name_box[0]+name_box[2], name_box[1]+name_box[3]), (255,0,0), 2)
        cv2.rectangle(annotated, (section_box[0], section_box[1]), (section_box[0]+section_box[2], section_box[1]+section_box[3]), (255,0,0), 2)

        # --- Encode annotated image ---
        annotated_b64 = image_to_base64(annotated)
        
        print(f"Scan completed successfully. Score: {score}/{len(answer_key)}")
        
        return jsonify({
            'name': name,
            'section': section,
            'score': score,
            'item_results': item_results,
            'annotated_image': annotated_b64
        })
    except Exception as e:
        print(f"Error in check_sheet: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Scanning failed: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 