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

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Helper: Convert image to base64
def image_to_base64(img):
    _, buffer = cv2.imencode('.png', img)
    return 'data:image/png;base64,' + base64.b64encode(buffer).decode('utf-8')

# Helper: Extract text from a region
def ocr_region(img, x, y, w, h):
    roi = img[y:y+h, x:x+w]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    # Adaptive thresholding for handwriting
    proc = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 10)
    kernel = np.ones((2,2), np.uint8)
    proc = cv2.dilate(proc, kernel, iterations=1)
    pil_img = Image.fromarray(proc)
    config = '--psm 7 --oem 1'
    text = pytesseract.image_to_string(pil_img, config=config).strip()
    return text

# Helper: Detect filled bubbles (simple thresholding + contour analysis)
def detect_bubbles(img, bubble_coords, threshold=0.5):
    answers = []
    for item_bubbles in bubble_coords:
        filled = None
        max_fill = 0
        for idx, (x, y, r) in enumerate(item_bubbles):
            mask = np.zeros(img.shape[:2], dtype=np.uint8)
            cv2.circle(mask, (x, y), r, 255, -1)
            mean = cv2.mean(img, mask=mask)[0]
            fill = 255 - mean  # Invert: filled = dark
            if fill > max_fill and fill > threshold * 255:
                max_fill = fill
                filled = idx
        answers.append(filled)
    return answers

@app.route('/api/check', methods=['POST'])
def check_sheet():
    file = request.files['file']
    test_info = json.loads(request.form['test_info'])
    answer_key = json.loads(request.form['answer_key'])

    # Read image
    in_memory = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(in_memory, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # --- PDF and image scaling ---
    pdf_page_width = 595
    pdf_page_height = 842
    image_height, image_width = img.shape[:2]
    scale_x = image_width / pdf_page_width
    scale_y = image_height / pdf_page_height

    # --- Layout parameters (from frontend) ---
    num_items = int(test_info['num_items'])
    num_choices = int(test_info['num_choices'])
    grid_params = test_info.get('grid_layout_params', {})
    if grid_params:
        items_per_column = grid_params.get('itemsPerColumn', 25)
        col_width_pdf = grid_params.get('colWidth', (pdf_page_width - 120) / 2)
        col_x_pdf = grid_params.get('colX', [60, 60 + (pdf_page_width - 120) / 2])
        row_h_pdf = grid_params.get('rowH', 22)
        col_w_pdf = grid_params.get('colW', 20)
        bubble_r_pdf = grid_params.get('bubbleR', 10)
        number_width_pdf = grid_params.get('numberWidth', 18)
        gap_pdf = grid_params.get('gap', 8)
        group_offset_pdf = grid_params.get('groupOffset', (col_width_pdf - (number_width_pdf + gap_pdf + num_choices * col_w_pdf)) / 2)
        # --- Move bubble grid down by 3 PDF points for even better alignment ---
        grid_start_y_pdf = grid_params.get('gridStartY', 0) + 3
        grid_start_y = int(grid_start_y_pdf * scale_y)
    else:
        items_per_column = 25
        col_width_pdf = (pdf_page_width - 120) / 2
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
    row_h = int(row_h * 1.04)  # Increase vertical gap by 10%
    col_w = int(col_w_pdf * scale_x)
    bubble_r = int(bubble_r_pdf * ((scale_x + scale_y) / 2))
    number_width = int(number_width_pdf * scale_x)
    gap = int(gap_pdf * scale_x)
    group_offset = int(group_offset_pdf * scale_x)

    # --- Name/Section box positions (PDF points, then scaled to image pixels) ---
    # Move boxes down by 1 PDF point for better alignment
    name_box_pdf = (48, 115, 226, 24)  # y increased by 1
    section_box_pdf = (48, 139, 226, 24)  # y increased by 1
    name_box = tuple(int(v * (scale_x if i % 2 == 0 else scale_y)) for i, v in enumerate(name_box_pdf))
    section_box = tuple(int(v * (scale_x if i % 2 == 0 else scale_y)) for i, v in enumerate(section_box_pdf))

    # --- OCR: Extract name and section ---
    name = ocr_region(img, *name_box)
    section = ocr_region(img, *section_box)

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
    answers = [choice_labels[idx] if idx is not None else None for idx in answers_idx]

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
    for i, item_bubbles in enumerate(bubble_coords):
        for c, (x, y, r) in enumerate(item_bubbles):
            color = (0, 255, 0) if answers_idx[i] == c and answers[i] == answer_key[i] else (0, 0, 255) if answers_idx[i] == c else (180, 180, 180)
            cv2.circle(annotated, (x, y), r, color, 2)
    # Draw name/section boxes
    cv2.rectangle(annotated, (name_box[0], name_box[1]), (name_box[0]+name_box[2], name_box[1]+name_box[3]), (255,0,0), 2)
    cv2.rectangle(annotated, (section_box[0], section_box[1]), (section_box[0]+section_box[2], section_box[1]+section_box[3]), (255,0,0), 2)

    # --- Encode annotated image ---
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