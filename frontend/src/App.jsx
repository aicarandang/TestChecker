import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import AnswerSheet from './pages/sheet';
import GenerateSheet from './pages/generate';
import AnswerKey from './pages/answer';
import UploadSheets from './pages/upload';
import Results from './pages/results';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/answersheet" element={<AnswerSheet />} />
        <Route path="/generate" element={<GenerateSheet />} />
        <Route path="/answer" element={<AnswerKey />} />
        <Route path="/upload" element={<UploadSheets />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
