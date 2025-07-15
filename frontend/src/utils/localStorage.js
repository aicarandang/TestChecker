// Utility functions for SnapCheck localStorage management

export const getAnswerSheets = () => JSON.parse(localStorage.getItem('answerSheets') || '[]');
export const setAnswerSheets = (sheets) => localStorage.setItem('answerSheets', JSON.stringify(sheets));
export const getSelectedSheetId = () => localStorage.getItem('selectedSheetId');
export const setSelectedSheetId = (id) => localStorage.setItem('selectedSheetId', id);

export const getAnswerKey = (sheetId) => JSON.parse(localStorage.getItem(`answerKey_${sheetId}`) || 'null');
export const setAnswerKey = (sheetId, key) => localStorage.setItem(`answerKey_${sheetId}`, JSON.stringify(key));
export const removeAnswerKey = (sheetId) => localStorage.removeItem(`answerKey_${sheetId}`);

export const getScanResults = (sheetId) => JSON.parse(localStorage.getItem(`scanResults_${sheetId}`) || '[]');
export const setScanResults = (sheetId, results) => localStorage.setItem(`scanResults_${sheetId}`, JSON.stringify(results));
export const removeScanResults = (sheetId) => localStorage.removeItem(`scanResults_${sheetId}`);

export const getUploads = (sheetId) => JSON.parse(localStorage.getItem(`uploads_${sheetId}`) || '[]');
export const setUploads = (sheetId, uploads) => localStorage.setItem(`uploads_${sheetId}`, JSON.stringify(uploads));
export const removeUploads = (sheetId) => localStorage.removeItem(`uploads_${sheetId}`);

export const getTestDirectionsHeight = (sheetId) => localStorage.getItem(`testDirectionsHeight_${sheetId}`);
export const setTestDirectionsHeight = (sheetId, height) => localStorage.setItem(`testDirectionsHeight_${sheetId}`, height);
export const removeTestDirectionsHeight = (sheetId) => localStorage.removeItem(`testDirectionsHeight_${sheetId}`); 