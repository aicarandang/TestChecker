import React, { useState, useEffect } from 'react';
import styles from '../styles/results.module.css';

function Results() {
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load scan results from localStorage
    const loadResults = () => {
      try {
        const storedResults = localStorage.getItem('scanResults');
        if (storedResults) {
          const results = JSON.parse(storedResults);
          setScanResults(results);
        } else {
          setError('No scan results found. Please scan a bubble sheet first.');
        }
      } catch (err) {
        setError('Error loading scan results: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  // Calculate test results by comparing student answers with answer key
  const calculateResults = () => {
    if (!scanResults || !scanResults.bubbles || !scanResults.answerKey) {
      return null;
    }

    const { bubbles, answerKey, totalQuestions } = scanResults;
    
    // Create a map of student answers by question number
    const studentAnswers = {};
    bubbles.forEach(bubble => {
      if (bubble.isFilled && bubble.questionNum) {
        studentAnswers[bubble.questionNum] = bubble.choice;
      }
    });

    // Compare with answer key
    const results = [];
    let correctAnswers = 0;
    let totalAnswered = 0;

    for (let i = 1; i <= totalQuestions; i++) {
      const correctAnswer = answerKey[i - 1]; // Answer key is 0-indexed
      const studentAnswer = studentAnswers[i];
      const isCorrect = studentAnswer === correctAnswer;
      
      if (studentAnswer) {
        totalAnswered++;
        if (isCorrect) {
          correctAnswers++;
        }
      }

      results.push({
        questionNum: i,
        correctAnswer,
        studentAnswer,
        isCorrect,
        isAnswered: !!studentAnswer
      });
    }

    const score = totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0;
    const percentage = totalAnswered > 0 ? (totalAnswered / totalQuestions) * 100 : 0;

    return {
      results,
      correctAnswers,
      totalAnswered,
      totalQuestions,
      score: Math.round(score * 100) / 100,
      percentage: Math.round(percentage * 100) / 100
    };
  };

  const exportResults = () => {
    const testResults = calculateResults();
    if (!testResults) return;

    const csvContent = [
      'Question,Correct Answer,Student Answer,Status',
      ...testResults.results.map(result => {
        const status = result.isAnswered 
          ? (result.isCorrect ? 'Correct' : 'Incorrect')
          : 'Not Answered';
        return `${result.questionNum},${result.correctAnswer || 'N/A'},${result.studentAnswer || 'N/A'},${status}`;
      }),
      '',
      `Total Questions,${testResults.totalQuestions}`,
      `Answered,${testResults.totalAnswered}`,
      `Correct,${testResults.correctAnswers}`,
      `Score,${testResults.score}%`,
      `Completion,${testResults.percentage}%`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    localStorage.removeItem('scanResults');
    setScanResults(null);
    setError('Results cleared. Please scan a new bubble sheet.');
  };

  if (loading) {
    return (
      <div className={styles['results-container']}>
        <div className={styles['results-loading']}>
          <div className={styles['loading-spinner']}></div>
          <p>Loading test results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['results-container']}>
        <div className={styles['results-error']}>
          <h2>No Results Available</h2>
          <p>{error}</p>
          <button 
            className={styles['results-back-btn']}
            onClick={() => window.history.back()}
          >
            Go Back to Upload
          </button>
        </div>
      </div>
    );
  }

  const testResults = calculateResults();
  if (!testResults) {
    return (
      <div className={styles['results-container']}>
        <div className={styles['results-error']}>
          <h2>Invalid Results Data</h2>
          <p>Unable to process test results. Please scan a bubble sheet again.</p>
          <button 
            className={styles['results-back-btn']}
            onClick={() => window.history.back()}
          >
            Go Back to Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['results-container']}>
      <div className={styles['results-header']}>
        <h1>Test Results</h1>
        <p>Student Answer Sheet Analysis</p>
      </div>

      <div className={styles['results-actions']}>
        <button 
          className={styles['results-export-btn']}
          onClick={exportResults}
        >
          Export to CSV
        </button>
        <button 
          className={styles['results-clear-btn']}
          onClick={clearResults}
        >
          Clear Results
        </button>
      </div>

      <div className={styles['results-summary']}>
        <div className={styles['summary-card']}>
          <h3>Score</h3>
          <span className={styles['summary-score']}>{testResults.score}%</span>
        </div>
        <div className={styles['summary-card']}>
          <h3>Correct Answers</h3>
          <span className={styles['summary-number']}>
            {testResults.correctAnswers}/{testResults.totalAnswered}
          </span>
        </div>
        <div className={styles['summary-card']}>
          <h3>Completion</h3>
          <span className={styles['summary-number']}>
            {testResults.percentage}%
          </span>
        </div>
        <div className={styles['summary-card']}>
          <h3>Total Questions</h3>
          <span className={styles['summary-number']}>
            {testResults.totalQuestions}
          </span>
        </div>
      </div>

      <div className={styles['results-table-container']}>
        <h2>Question-by-Question Analysis</h2>
        <div className={styles['results-table']}>
          <div className={styles['table-header']}>
            <div className={styles['header-cell']}>Question</div>
            <div className={styles['header-cell']}>Correct Answer</div>
            <div className={styles['header-cell']}>Student Answer</div>
            <div className={styles['header-cell']}>Status</div>
          </div>
          {testResults.results.map((result) => (
            <div key={result.questionNum} className={styles['table-row']}>
              <div className={styles['table-cell']}>
                <span className={styles['question-num']}>{result.questionNum}</span>
              </div>
              <div className={styles['table-cell']}>
                <span className={styles['correct-answer']}>{result.correctAnswer}</span>
              </div>
              <div className={styles['table-cell']}>
                <span className={styles['student-answer']}>
                  {result.studentAnswer || 'Not Answered'}
                </span>
              </div>
              <div className={styles['table-cell']}>
                <span className={
                  result.isAnswered 
                    ? (result.isCorrect ? styles['status-correct'] : styles['status-incorrect'])
                    : styles['status-unanswered']
                }>
                  {result.isAnswered 
                    ? (result.isCorrect ? 'Correct' : 'Incorrect')
                    : 'Not Answered'
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles['results-breakdown']}>
        <h2>Performance Breakdown</h2>
        <div className={styles['breakdown-grid']}>
          <div className={styles['breakdown-item']}>
            <span className={styles['breakdown-label']}>Correct Answers</span>
            <span className={styles['breakdown-value correct']}>{testResults.correctAnswers}</span>
          </div>
          <div className={styles['breakdown-item']}>
            <span className={styles['breakdown-label']}>Incorrect Answers</span>
            <span className={styles['breakdown-value incorrect']}>
              {testResults.totalAnswered - testResults.correctAnswers}
            </span>
          </div>
          <div className={styles['breakdown-item']}>
            <span className={styles['breakdown-label']}>Unanswered</span>
            <span className={styles['breakdown-value unanswered']}>
              {testResults.totalQuestions - testResults.totalAnswered}
            </span>
          </div>
        </div>
      </div>

      {testResults.score >= 70 ? (
        <div className={styles['results-pass']}>
          <h3>🎉 Passed!</h3>
          <p>Congratulations! The student has passed the test with a score of {testResults.score}%.</p>
        </div>
      ) : (
        <div className={styles['results-fail']}>
          <h3>📝 Needs Improvement</h3>
          <p>The student scored {testResults.score}% and needs to improve their performance.</p>
        </div>
      )}
    </div>
  );
}

export default Results;