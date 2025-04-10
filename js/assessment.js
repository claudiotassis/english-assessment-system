document.addEventListener('DOMContentLoaded', function() {
    // Check if student is logged in
    const studentEmail = sessionStorage.getItem('studentEmail');
    const studentName = sessionStorage.getItem('studentName');
    const studentClass = sessionStorage.getItem('studentClass');
    
    if (!studentEmail || !studentName || !studentClass) {
        // Redirect to login if no student info
        window.location.href = 'index.html';
        return;
    }
    
    // Display student info
    document.getElementById('student-name').textContent = studentName;
    document.getElementById('student-class').textContent = studentClass;
    
    // Timer functionality
    let timeLeft = 45 * 60; // 45 minutes in seconds
    const timerDisplay = document.getElementById('time-remaining');
    
    const timer = setInterval(function() {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            submitAssessment();
        }
    }, 1000);
    
    // Word counter for writing section
    const writingTextarea = document.querySelector('textarea[name="writing-response"]');
    const wordCountDisplay = document.getElementById('word-count');
    
    if (writingTextarea) {
        writingTextarea.addEventListener('input', function() {
            const text = this.value;
            const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
            wordCountDisplay.textContent = wordCount;
        });
    }
    
    // Assessment form submission
    const assessmentForm = document.getElementById('assessment-form');
    
    if (assessmentForm) {
        assessmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitAssessment();
        });
    }
    
    // Submit assessment function
    function submitAssessment() {
        clearInterval(timer); // Stop the timer
        
        // Hide assessment form
        document.getElementById('assessment-container').classList.add('hidden');
        
        // Show loading indicator
        showLoading();
        
        // Collect all form data
        const formData = new FormData(assessmentForm);
        const assessmentData = {
            studentEmail,
            studentName,
            studentClass,
            submissionDate: new Date(),
            answers: {},
            scores: {
                part1: 0,
                part2: 0,
                part3: 0,
                part4: 0,
                total: 0
            },
            feedback: {}
        };
        
        // Process form data
        for (const [key, value] of formData.entries()) {
            assessmentData.answers[key] = value;
        }
        
        // Grade the assessment
        gradeAssessment(assessmentData)
            .then((gradedData) => {
                // Save to Firebase
                return db.collection('assessments').add(gradedData);
            })
            .then(() => {
                // Hide loading indicator
                hideLoading();
                
                // Show results
                displayResults(assessmentData);
            })
            .catch((error) => {
                console.error("Error submitting assessment:", error);
                hideLoading();
                showAlert('An error occurred while submitting your assessment. Please try again.', 'error');
            });
    }
    
    // Grade the assessment
    async function gradeAssessment(data) {
        // Grade Part 1: Theoretical questions
        gradeTheoretical(data);
        
        // Grade Part 2: Completing sentences
        gradeSentenceCompletion(data);
        
        // Grade Part 3: Error identification
        gradeErrorIdentification(data);
        
        // Grade Part 4: Writing production
        gradeWriting(data);
        
        // Calculate total score
        data.scores.total = (
            data.scores.part1 + 
            data.scores.part2 + 
            data.scores.part3 + 
            data.scores.part4
        ).toFixed(2);
        
        return data;
    }
    
    // Grade Part 1: Theoretical questions
    function gradeTheoretical(data) {
        const q1aAnswer = data.answers.q1a.toLowerCase();
        const q1bAnswer = data.answers.q1b.toLowerCase();
        
        let q1aScore = 0;
        let q1bScore = 0;
        let q1aFeedback = "";
        let q1bFeedback = "";
        
        // Check for keywords in q1a
        const q1aKeywords = assessmentConfig.part1Keywords.q1a;
        const presentSimpleKeywords = q1aKeywords.slice(0, 6);
        const presentContinuousKeywords = q1aKeywords.slice(6);
        
        let presentSimpleCount = 0;
        let presentContinuousCount = 0;
        
        presentSimpleKeywords.forEach(keyword => {
            if (q1aAnswer.includes(keyword)) {
                presentSimpleCount++;
            }
        });
        
        presentContinuousKeywords.forEach(keyword => {
            if (q1aAnswer.includes(keyword)) {
                presentContinuousCount++;
            }
        });
        
        // At least 2 keywords from each category for full marks
        if (presentSimpleCount >= 2 && presentContinuousCount >= 2) {
            q1aScore = 0.25;
            q1aFeedback = "Excellent explanation of both Present Simple and Present Continuous.";
        } else if (presentSimpleCount >= 1 && presentContinuousCount >= 1) {
            q1aScore = 0.2;
            q1aFeedback = "Good explanation but could include more details about the uses of each tense.";
        } else if (presentSimpleCount >= 1 || presentContinuousCount >= 1) {
            q1aScore = 0.1;
            q1aFeedback = "Partial explanation. Remember to explain both tenses and their different uses.";
        } else {
            q1aFeedback = "Your explanation doesn't include key information about the tenses. Review the differences between Present Simple (habits, routines, facts) and Present Continuous (actions in progress).";
        }
        
        // Check for keywords in q1b
        const q1bKeywords = assessmentConfig.part1Keywords.q1b;
        let q1bKeywordCount = 0;
        
        q1bKeywords.forEach(keyword => {
            if (q1bAnswer.includes(keyword)) {
                q1bKeywordCount++;
            }
        });
        
        // At least 3 keywords for full marks
        if (q1bKeywordCount >= 3) {
            q1bScore = 0.25;
            q1bFeedback = "Excellent explanation of why perception and feeling verbs are not used in continuous form.";
        } else if (q1bKeywordCount >= 2) {
            q1bScore = 0.2;
            q1bFeedback = "Good explanation but could be more detailed.";
        } else if (q1bKeywordCount >= 1) {
            q1bScore = 0.1;
            q1bFeedback = "Partial explanation. Remember to explain why these verbs describe states rather than actions.";
        } else {
            q1bFeedback = "Your explanation doesn't include key information. Remember that perception and feeling verbs express states rather than actions.";
        }
        
        // Set scores and feedback
        data.scores.part1 = (q1aScore + q1bScore).toFixed(2);
        data.feedback.q1a = q1aFeedback;
        data.feedback.q1b = q1bFeedback;
    }
    
    // Grade Part 2: Completing sentences
    function gradeSentenceCompletion(data) {
        const part2Answers = assessmentConfig.part2Answers;
        let correctCount = 0;
        
        for (const [question, correctAnswer] of Object.entries(part2Answers)) {
            const studentAnswer = data.answers[question]?.trim().toLowerCase();
            const isCorrect = studentAnswer === correctAnswer.toLowerCase();
            
            if (isCorrect) {
                correctCount++;
            }
            
            // Add feedback for each answer
            data.feedback[question] = isCorrect ? 
                "Correct!" : 
                `Incorrect. The correct answer is: "${correctAnswer}"`;
        }
        
        // Calculate score - each correct answer is worth 0.05 points (12 blanks total)
        data.scores.part2 = ((correctCount / 12) * 0.6).toFixed(2);
    }
    
    // Grade Part 3: Error identification
    function gradeErrorIdentification(data) {
        const part3Answers = assessmentConfig.part3Answers;
        let correctCount = 0;
        
        for (const [question, correctAnswer] of Object.entries(part3Answers)) {
            // Normalize student answer
            let studentAnswer = data.answers[question]?.trim();
            
            // Remove ending punctuation if present
            if (studentAnswer?.endsWith('.')) {
                studentAnswer = studentAnswer.slice(0, -1);
            }
            
            // Normalize correct answer
            let normalizedCorrect = correctAnswer;
            if (normalizedCorrect.endsWith('.')) {
                normalizedCorrect = normalizedCorrect.slice(0, -1);
            }
            
            // Case-insensitive comparison
            const isCorrect = studentAnswer?.toLowerCase() === normalizedCorrect.toLowerCase();
            
            if (isCorrect) {
                correctCount++;
            }
            
            // Add feedback for each answer
            data.feedback[question] = isCorrect ? 
                "Correct!" : 
                `Incorrect. The correct answer is: "${correctAnswer}"`;
        }
        
        // Calculate score - each correct answer is worth 0.05 points (8 questions total)
        data.scores.part3 = ((correctCount / 8) * 0.4).toFixed(2);
    }
    
    // Grade Part 4: Writing production
    function gradeWriting(data) {
        const writingOption = data.answers['writing-option'];
        const writingResponse = data.answers['writing-response'];
        
        // Count words
        const wordCount = writingResponse.trim() === '' ? 0 : writingResponse.trim().split(/\s+/).length;
        
        // Initialize score components
        let lengthScore = 0;
        let presentSimpleScore = 0;
        let presentContinuousScore = 0;
        let perceptionVerbsScore = 0;
        let feelingVerbsScore = 0;
        let grammarScore = 0;
        
        // 1. Length score (0.2 points)
        if (wordCount >= 100) {
            lengthScore = 0.2;
        } else if (wordCount >= 80) {
            lengthScore = 0.15;
        } else if (wordCount >= 60) {
            lengthScore = 0.1;
        } else if (wordCount >= 40) {
            lengthScore = 0.05;
        }
        
        // 2. Check for presence of Present Simple (0.3 points)
        const presentSimpleKeywords = assessmentConfig.part4Keywords.presentSimple;
        let presentSimpleCount = 0;
        
        presentSimpleKeywords.forEach(keyword => {
            if (writingResponse.toLowerCase().includes(keyword)) {
                presentSimpleCount++;
            }
        });
        
        // Count common Present Simple verb endings
        const simpleVerbRegex = /\b(work|eat|go|live|study|do|play|read|write|watch|listen)s?\b/gi;
        const simpleVerbMatches = writingResponse.match(simpleVerbRegex) || [];
        
        presentSimpleCount += Math.min(5, simpleVerbMatches.length);
        
        if (presentSimpleCount >= 5) {
            presentSimpleScore = 0.3;
        } else if (presentSimpleCount >= 3) {
            presentSimpleScore = 0.2;
        } else if (presentSimpleCount >= 1) {
            presentSimpleScore = 0.1;
        }
        
        // 3. Check for presence of Present Continuous (0.3 points)
        const presentContinuousKeywords = assessmentConfig.part4Keywords.presentContinuous;
        let presentContinuousCount = 0;
        
        presentContinuousKeywords.forEach(keyword => {
            if (writingResponse.toLowerCase().includes(keyword)) {
                presentContinuousCount++;
            }
        });
        
        // Count "ing" forms with auxiliaries
        const continuousVerbRegex = /\b(am|is|are)\s+\w+ing\b/gi;
        const continuousVerbMatches = writingResponse.match(continuousVerbRegex) || [];
        
        presentContinuousCount += continuousVerbMatches.length;
        
        if (presentContinuousCount >= 5) {
            presentContinuousScore = 0.3;
        } else if (presentContinuousCount >= 3) {
            presentContinuousScore = 0.2;
        } else if (presentContinuousCount >= 1) {
            presentContinuousScore = 0.1;
        }
        
        // 4. Check for correct use of perception verbs (0.3 points)
        const perceptionVerbs = assessmentConfig.part4Keywords.perceptionVerbs;
        let perceptionVerbCount = 0;
        
        perceptionVerbs.forEach(verb => {
            // Check if the verb is used in the simple form, not continuous
            const simpleRegex = new RegExp(`\\b(I|you|he|she|it|we|they)\\s+(${verb}s?)\\b`, 'gi');
            const continuousRegex = new RegExp(`\\b(am|is|are)\\s+${verb}ing\\b`, 'gi');
            
            const simpleMatches = writingResponse.match(simpleRegex) || [];
            const continuousMatches = writingResponse.match(continuousRegex) || [];
            
            // Add correct usages, subtract incorrect usages
            perceptionVerbCount += simpleMatches.length;
            perceptionVerbCount -= continuousMatches.length;
        });
        
        perceptionVerbCount = Math.max(0, perceptionVerbCount);
        
        if (perceptionVerbCount >= 3) {
            perceptionVerbsScore = 0.3;
        } else if (perceptionVerbCount >= 2) {
            perceptionVerbsScore = 0.2;
        } else if (perceptionVerbCount >= 1) {
            perceptionVerbsScore = 0.1;
        }
        
        // 5. Check for correct use of feeling verbs (0.2 points)
        const feelingVerbs = assessmentConfig.part4Keywords.feelingVerbs;
        let feelingVerbCount = 0;
        
        feelingVerbs.forEach(verb => {
            // Check if the verb is used in the simple form, not continuous
            const simpleRegex = new RegExp(`\\b(I|you|he|she|it|we|they)\\s+(${verb}s?)\\b`, 'gi');
            const continuousRegex = new RegExp(`\\b(am|is|are)\\s+${verb}ing\\b`, 'gi');
            
            const simpleMatches = writingResponse.match(simpleRegex) || [];
            const continuousMatches = writingResponse.match(continuousRegex) || [];
            
            // Add correct usages, subtract incorrect usages
            feelingVerbCount += simpleMatches.length;
            feelingVerbCount -= continuousMatches.length;
        });
        
        feelingVerbCount = Math.max(0, feelingVerbCount);
        
        if (feelingVerbCount >= 2) {
            feelingVerbsScore = 0.2;
        } else if (feelingVerbCount >= 1) {
            feelingVerbsScore = 0.1;
        }
        
        // 6. Overall grammar and vocabulary score (0.2 points)
        // This is a simplistic estimate based on other scores
        const otherScores = lengthScore + presentSimpleScore + presentContinuousScore + 
                          perceptionVerbsScore + feelingVerbsScore;
        
        grammarScore = Math.min(0.2, (otherScores / 1.3) * 0.2);
        
        // Calculate total writing score (max 1.5 points)
        const rawTotal = lengthScore + presentSimpleScore + presentContinuousScore + 
                      perceptionVerbsScore + feelingVerbsScore + grammarScore;
        
        data.scores.part4 = Math.min(1.5, rawTotal).toFixed(2);
        
        // Provide detailed feedback
        data.feedback.writing = {
            wordCount,
            lengthFeedback: getFeedbackForWordCount(wordCount),
            presentSimpleFeedback: getFeedbackForPresentSimple(presentSimpleCount),
            presentContinuousFeedback: getFeedbackForPresentContinuous(presentContinuousCount),
            perceptionVerbsFeedback: getFeedbackForPerceptionVerbs(perceptionVerbCount),
            feelingVerbsFeedback: getFeedbackForFeelingVerbs(feelingVerbCount),
            overallFeedback: getOverallWritingFeedback(data.scores.part4)
        };
    }
    
    // Helper functions for writing feedback
    function getFeedbackForWordCount(count) {
        if (count >= 100) {
            return "Excellent length. Your response is comprehensive.";
        } else if (count >= 80) {
            return "Good length. Your response is adequate.";
        } else if (count >= 60) {
            return "Acceptable length, but could be more developed.";
        } else {
            return "Your response is too short. Aim for at least 10-12 lines.";
        }
    }
    
    function getFeedbackForPresentSimple(count) {
        if (count >= 5) {
            return "Excellent use of Present Simple tense.";
        } else if (count >= 3) {
            return "Good use of Present Simple, but could include more examples.";
        } else if (count >= 1) {
            return "Limited use of Present Simple. Include more routine/habitual actions.";
        } else {
            return "No clear use of Present Simple detected. Remember to include habitual actions or general truths.";
        }
    }
    
    function getFeedbackForPresentContinuous(count) {
        if (count >= 5) {
            return "Excellent use of Present Continuous tense.";
        } else if (count >= 3) {
            return "Good use of Present Continuous, but could include more examples.";
        } else if (count >= 1) {
            return "Limited use of Present Continuous. Include more actions in progress.";
        } else {
            return "No clear use of Present Continuous detected. Remember to include actions happening right now.";
        }
    }
    
    function getFeedbackForPerceptionVerbs(count) {
        if (count >= 3) {
            return "Excellent use of perception verbs in the correct form.";
        } else if (count >= 2) {
            return "Good use of perception verbs.";
        } else if (count >= 1) {
            return "Limited use of perception verbs. Try to include more examples.";
        } else {
            return "No correct use of perception verbs detected. Remember to use verbs like 'see', 'sound', 'smell', 'taste', 'feel' in the Simple Present.";
        }
    }
    
    function getFeedbackForFeelingVerbs(count) {
        if (count >= 2) {
            return "Excellent use of feeling verbs in the correct form.";
        } else if (count >= 1) {
            return "Good use of feeling verbs.";
        } else {
            return "No correct use of feeling verbs detected. Remember to use verbs like 'love', 'hate', 'like', 'prefer', 'want' in the Simple Present.";
        }
    }
    
    function getOverallWritingFeedback(score) {
        const scoreNum = parseFloat(score);
        if (scoreNum >= 1.2) {
            return "Excellent work! Your writing shows a strong understanding of Present Simple, Present Continuous, and the correct usage of perception and feeling verbs.";
        } else if (scoreNum >= 0.9) {
            return "Good work! You've demonstrated a solid understanding of the grammar concepts, with some areas for improvement.";
        } else if (scoreNum >= 0.6) {
            return "Satisfactory work with a basic understanding of the concepts. Review the use of Present Simple vs Present Continuous and be careful with perception/feeling verbs.";
        } else {
            return "Your response needs improvement. Focus on clearly distinguishing between Present Simple and Present Continuous, and remember that perception and feeling verbs should be used in Simple Present.";
        }
    }
    
    // Display results
    function displayResults(data) {
        // Show results section
        document.getElementById('results').classList.remove('hidden');
        
        // Update score displays
        document.getElementById('final-score').textContent = data.scores.total;
        document.getElementById('part1-score').textContent = data.scores.part1;
        document.getElementById('part2-score').textContent = data.scores.part2;
        document.getElementById('part3-score').textContent = data.scores.part3;
        document.getElementById('part4-score').textContent = data.scores.part4;
        
        // Generate feedback content
        const feedbackContent = document.getElementById('feedback-content');
        
        // Part 1 feedback
        const part1Feedback = document.createElement('div');
        part1Feedback.className = 'section-feedback';
        part1Feedback.innerHTML = `
            <h4>Part 1: Theoretical Understanding</h4>
            <p><strong>Question 1a:</strong> ${data.feedback.q1a}</p>
            <p><strong>Question 1b:</strong> ${data.feedback.q1b}</p>
        `;
        
        // Part 2 feedback
        const part2Feedback = document.createElement('div');
        part2Feedback.className = 'section-feedback';
        part2Feedback.innerHTML = `<h4>Part 2: Completing Sentences</h4>`;
        
        // Group part 2 feedback by question
        for (let i = 'a'; i <= 'f'; i++) {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-feedback';
            questionDiv.innerHTML = `
                <p><strong>Question 2${i}:</strong></p>
                <ul>
                    <li>${data.feedback[`q2${i}1`]}</li>
                    <li>${data.feedback[`q2${i}2`]}</li>
                </ul>
            `;
            part2Feedback.appendChild(questionDiv);
        }
        
        // Part 3 feedback
        const part3Feedback = document.createElement('div');
        part3Feedback.className = 'section-feedback';
        part3Feedback.innerHTML = `<h4>Part 3: Error Identification and Correction</h4>`;
        
        // Add each part 3 feedback
        for (let i = 'a'; i <= 'h'; i++) {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-feedback';
            questionDiv.innerHTML = `
                <p><strong>Question 3${i}:</strong> ${data.feedback[`q3${i}`]}</p>
            `;
            part3Feedback.appendChild(questionDiv);
        }
        
        // Part 4 feedback
        const part4Feedback = document.createElement('div');
        part4Feedback.className = 'section-feedback';
        part4Feedback.innerHTML = `
            <h4>Part 4: Writing Production</h4>
            <p><strong>Word Count:</strong> ${data.feedback.writing.wordCount} words. ${data.feedback.writing.lengthFeedback}</p>
            <p><strong>Present Simple:</strong> ${data.feedback.writing.presentSimpleFeedback}</p>
            <p><strong>Present Continuous:</strong> ${data.feedback.writing.presentContinuousFeedback}</p>
            <p><strong>Perception Verbs:</strong> ${data.feedback.writing.perceptionVerbsFeedback}</p>
            <p><strong>Feeling Verbs:</strong> ${data.feedback.writing.feelingVerbsFeedback}</p>
            <p><strong>Overall Feedback:</strong> ${data.feedback.writing.overallFeedback}</p>
        `;
        
        // Add all feedback sections
        feedbackContent.appendChild(part1Feedback);
        feedbackContent.appendChild(part2Feedback);
        feedbackContent.appendChild(part3Feedback);
        feedbackContent.appendChild(part4Feedback);
        
        // Return home button
        document.getElementById('return-home').addEventListener('click', function() {
            sessionStorage.clear();
            window.location.href = 'index.html';
        });
    }
    
    // Helper function to show loading indicator
    function showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Grading your assessment...</p>
        `;
        document.body.appendChild(loadingDiv);
    }
    
    // Helper function to hide loading indicator
    function hideLoading() {
        const loadingDiv = document.querySelector('.loading-overlay');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    // Helper function to show alerts
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${type}`;
        alertDiv.textContent = message;
        
        document.querySelector('header').after(alertDiv);
        
        // Remove the alert after 3 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }
});
