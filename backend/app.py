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
import fitz

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

def image_to_base64(img):
    _, buffer = cv2.imencode('.png', img)
    return 'data:image/png;base64,' + base64.b64encode(buffer).decode('utf-8')

def pdf_to_image(pdf_bytes, page_number=0):
    """Convert PDF page to OpenCV image format"""
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")

        page = pdf_document[page_number]

        mat = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))

        pil_image = Image.frombytes("RGB", (mat.width, mat.height), mat.samples)

        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

        pdf_document.close()
        
        return opencv_image
    except Exception as e:
        print(f"Error converting PDF to image: {e}")
        return None

def detect_black_border(img):
    """Detect the black border rectangle and return its coordinates and dimensions"""
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)

        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return None
        
        largest_contour = max(contours, key=cv2.contourArea)

        x, y, w, h = cv2.boundingRect(largest_contour)
        
        min_area = img.shape[0] * img.shape[1] * 0.3
        if w * h < min_area:
            return None
        
        return (x, y, w, h)
    except Exception as e:
        print(f"Error detecting black border: {e}")
        return None

def ocr_region(img, x, y, w, h):
    roi = img[y:y+h, x:x+w]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    proc = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 10)
    kernel = np.ones((2,2), np.uint8)
    proc = cv2.dilate(proc, kernel, iterations=1)
    pil_img = Image.fromarray(proc)
    config = '--psm 7 --oem 1'
    text = pytesseract.image_to_string(pil_img, config=config).strip()
    return text

def detect_bubbles(img, bubble_coords, threshold=0.5):
    answers = []
    for item_bubbles in bubble_coords:
        filled_bubbles = []
        for idx, (x, y, r) in enumerate(item_bubbles):
            mask = np.zeros(img.shape[:2], dtype=np.uint8)
            cv2.circle(mask, (x, y), r, 255, -1)
            mean_result = cv2.mean(img, mask=mask)
            mean = float(mean_result[0])
            fill = 255 - mean
            if fill > threshold * 255:
                filled_bubbles.append(idx)
        if len(filled_bubbles) == 1:
            answers.append(filled_bubbles[0])
        elif len(filled_bubbles) > 1:
            answers.append('Multiple Answers')
        else:
            answers.append(None)
    return answers

@app.route('/api/check', methods=['POST'])
def check_sheet():
    file = request.files['file']
    test_info = json.loads(request.form['test_info'])
    answer_key = json.loads(request.form['answer_key'])
    
    filename = file.filename or ''
    is_pdf = filename.lower().endswith('.pdf')
    
    file_content = file.read()
    
    if is_pdf:
        img = pdf_to_image(file_content)
        if img is None:
            return jsonify({'error': 'Failed to convert PDF to image'}), 400
    else:
        in_memory = np.frombuffer(file_content, np.uint8)
        img = cv2.imdecode(in_memory, cv2.IMREAD_COLOR)

        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400

    border_info = detect_black_border(img)
    if border_info is None:
        return jsonify({'error': 'Could not detect black border in the image'}), 400
    
    border_x, border_y, border_w, border_h = border_info

    cropped_img = img[border_y:border_y+border_h, border_x:border_x+border_w]

    img = cropped_img
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    ref_width = 595
    ref_height = 842
    
    scale_x = border_w / ref_width
    scale_y = border_h / ref_height

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

    col_x = [int(x * scale_x) for x in col_x_pdf]
    col_width = col_width_pdf * scale_x
    row_h = int(row_h_pdf * scale_y)
    row_h = int(row_h * 1.04)
    col_w = int(col_w_pdf * scale_x)
    bubble_r = int(bubble_r_pdf * ((scale_x + scale_y) / 2))
    number_width = int(number_width_pdf * scale_x)
    gap = int(gap_pdf * scale_x)
    group_offset = int(group_offset_pdf * scale_x)

    name_box_pdf = (48, 115, 226, 24) 
    section_box_pdf = (48, 139, 226, 24)  
    name_box = tuple(int(v * (scale_x if i % 2 == 0 else scale_y)) for i, v in enumerate(name_box_pdf))
    section_box = tuple(int(v * (scale_x if i % 2 == 0 else scale_y)) for i, v in enumerate(section_box_pdf))

    name = ocr_region(img, *name_box)
    section = ocr_region(img, *section_box)

    bubble_coords = []
    for i in range(num_items):
        col = 0 if i < items_per_column else 1
        idx_in_col = i if col == 0 else i - items_per_column
        x = col_x[col]
        y = grid_start_y + idx_in_col * row_h
        for_bubbles = []
        for c in range(num_choices):
            bubble_x = x + group_offset + number_width + gap + c * col_w
            bubble_y = y + bubble_r + 7
            for_bubbles.append((int(round(bubble_x)), int(round(bubble_y)), int(round(bubble_r))))
        bubble_coords.append(for_bubbles)

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

    annotated = img.copy()

    cv2.rectangle(annotated, (0, 0), (border_w, border_h), (255, 255, 0), 2)
    
    for i, item_bubbles in enumerate(bubble_coords):
        for c, (x, y, r) in enumerate(item_bubbles):
            color = (0, 255, 0) if answers_idx[i] == c and answers[i] == answer_key[i] else (0, 0, 255) if answers_idx[i] == c else (180, 180, 180)
            cv2.circle(annotated, (x, y), r, color, 2)

    cv2.rectangle(annotated, (name_box[0], name_box[1]), (name_box[0]+name_box[2], name_box[1]+name_box[3]), (255,0,0), 2)
    cv2.rectangle(annotated, (section_box[0], section_box[1]), (section_box[0]+section_box[2], section_box[1]+section_box[3]), (255,0,0), 2)

    annotated_b64 = image_to_base64(annotated)

    return jsonify({
        'name': name,
        'section': section,
        'score': score,
        'item_results': item_results,
        'annotated_image': annotated_b64
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 