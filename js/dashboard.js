document.addEventListener('DOMContentLoaded', function() {
    // Fazer logout explícito quando a página de login é carregada
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
        firebase.auth().signOut().then(() => {
            console.log('Usuário deslogado com sucesso');
        }).catch((error) => {
            console.error('Erro ao deslogar:', error);
        });
    }
        
        // Check if the user is a teacher
        db.collection('teachers').doc(user.uid).get()
            .then((doc) => {
                if (!doc.exists) {
                    // Sign out and redirect if not a teacher
                    firebase.auth().signOut();
                    window.location.href = 'index.html';
                    return;
                }
                
                // Show teacher name
                const teacherData = doc.data();
                document.getElementById('teacher-name').textContent = `Welcome, ${teacherData.name}`;
                
                // Initialize dashboard
                initializeDashboard();
            })
            .catch((error) => {
                console.error("Error checking teacher status:", error);
                firebase.auth().signOut();
                window.location.href = 'index.html';
            });
    });
    
    // Initialize dashboard data and UI
    function initializeDashboard() {
        // Tab navigation
        const tabLinks = document.querySelectorAll('.sidebar-menu li:not(#logout-btn)');
        const tabContents = document.querySelectorAll('.tab-content');
        
        // Log to debug
        console.log('Menu items found:', tabLinks.length);
        console.log('Content tabs found:', tabContents.length);
        
        tabLinks.forEach(link => {
            link.addEventListener('click', function() {
                console.log('Menu item clicked:', this.textContent.trim());
                const tabId = this.getAttribute('data-tab');
                console.log('Tab ID:', tabId);
                
                if(tabId) {
                    // Remove active class from all tabs
                    tabLinks.forEach(el => el.classList.remove('active'));
                    tabContents.forEach(el => el.classList.remove('active'));
                    
                    // Add active class to current tab
                    this.classList.add('active');
                    const targetTab = document.getElementById(tabId);
                    if(targetTab) {
                        targetTab.classList.add('active');
                    } else {
                        console.error('Tab content not found:', tabId);
                    }
                } else {
                    console.error('No data-tab attribute found on menu item');
                }
            });
        });
        
        // Logout functionality
        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                console.log('Logout clicked');
                firebase.auth().signOut()
                    .then(() => {
                        window.location.href = 'index.html';
                    })
                    .catch((error) => {
                        console.error('Error signing out:', error);
                    });
            });
        } else {
            console.error('Logout button not found');
        }
        
        // Load data
        loadDashboardData();
        
        // Initialize accordion functionality
        initializeAccordion();
        
        // Initialize settings functionality
        initializeSettings();
    }
    
    // Load dashboard data from Firestore
    function loadDashboardData() {
        db.collection('assessments').get()
            .then((querySnapshot) => {
                const assessments = [];
                
                querySnapshot.forEach((doc) => {
                    const assessment = doc.data();
                    assessment.id = doc.id;
                    assessments.push(assessment);
                });
                
                // Update dashboard with the data
                updateDashboardStats(assessments);
                updateStudentsTable(assessments);
                updateClassesTab(assessments);
                updateQuestionsTab(assessments);
                
                // Create charts
                createCharts(assessments);
            })
            .catch((error) => {
                console.error("Error loading assessments:", error);
                showAlert('Error loading assessment data.', 'error');
            });
    }
    
    // Update dashboard statistics
    function updateDashboardStats(assessments) {
        // Total students
        const uniqueStudents = new Set(assessments.map(a => a.studentEmail));
        document.getElementById('total-students').textContent = uniqueStudents.size;
        
        // Total classes
        const uniqueClasses = new Set(assessments.map(a => a.studentClass));
        document.getElementById('total-classes').textContent = uniqueClasses.size;
        
        // Completed tests
        document.getElementById('completed-tests').textContent = assessments.length;
        
        // Average score
        const averageScore = assessments.length > 0 ? 
            assessments.reduce((sum, assessment) => {
                return sum + parseFloat(assessment.scores.total);
            }, 0) / assessments.length : 0;
        
        document.getElementById('average-score').textContent = averageScore.toFixed(1) + '/3.0';
        
        // Recent submissions table
        const recentSubmissionsTable = document.getElementById('recent-submissions');
        if (!recentSubmissionsTable) {
            console.error('Recent submissions table not found');
            return;
        }
        
        recentSubmissionsTable.innerHTML = '';
        
        if (assessments.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5">No assessments submitted yet.</td>';
            recentSubmissionsTable.appendChild(row);
            return;
        }
        
        const recentSubmissions = [...assessments]
            .sort((a, b) => {
                const dateA = a.submissionDate instanceof Date ? a.submissionDate : new Date(a.submissionDate.seconds * 1000);
                const dateB = b.submissionDate instanceof Date ? b.submissionDate : new Date(b.submissionDate.seconds * 1000);
                return dateB - dateA;
            })
            .slice(0, 5);
        
        recentSubmissions.forEach(assessment => {
            const row = document.createElement('tr');
            
            const date = assessment.submissionDate instanceof Date ? 
                assessment.submissionDate : 
                new Date(assessment.submissionDate.seconds * 1000);
                
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            row.innerHTML = `
                <td>${assessment.studentName}</td>
                <td>${assessment.studentClass}</td>
                <td>${formattedDate}</td>
                <td>${assessment.scores.total}/3.0</td>
                <td><button class="btn-view" data-id="${assessment.id}">View</button></td>
            `;
            
            recentSubmissionsTable.appendChild(row);
        });
        
        // Add event listeners to view buttons
        document.querySelectorAll('.btn-view').forEach(button => {
            button.addEventListener('click', function() {
                const assessmentId = this.getAttribute('data-id');
                showStudentDetail(assessmentId, assessments);
            });
        });
    }
    
    // Update students table
    function updateStudentsTable(assessments) {
        const studentsTable = document.getElementById('students-table');
        if (!studentsTable) {
            console.error('Students table not found');
            return;
        }
        
        studentsTable.innerHTML = '';
        
        if (assessments.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="10">No assessments submitted yet.</td>';
            studentsTable.appendChild(row);
            return;
        }
        
        // Sort by submission date (newest first)
        const sortedAssessments = [...assessments]
            .sort((a, b) => {
                const dateA = a.submissionDate instanceof Date ? a.submissionDate : new Date(a.submissionDate.seconds * 1000);
                const dateB = b.submissionDate instanceof Date ? b.submissionDate : new Date(b.submissionDate.seconds * 1000);
                return dateB - dateA;
            });
        
        // Populate table
        sortedAssessments.forEach(assessment => {
            const row = document.createElement('tr');
            
            const date = assessment.submissionDate instanceof Date ? 
                assessment.submissionDate : 
                new Date(assessment.submissionDate.seconds * 1000);
                
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            row.innerHTML = `
                <td>${assessment.studentName}</td>
                <td>${assessment.studentEmail}</td>
                <td>${assessment.studentClass}</td>
                <td>${formattedDate}</td>
                <td>${assessment.scores.total}/3.0</td>
                <td>${assessment.scores.part1}/0.5</td>
                <td>${assessment.scores.part2}/0.6</td>
                <td>${assessment.scores.part3}/0.4</td>
                <td>${assessment.scores.part4}/1.5</td>
                <td><button class="btn-view" data-id="${assessment.id}">View</button></td>
            `;
            
            studentsTable.appendChild(row);
        });
        
        // Add event listeners to view buttons
        document.querySelectorAll('.btn-view').forEach(button => {
            button.addEventListener('click', function() {
                const assessmentId = this.getAttribute('data-id');
                showStudentDetail(assessmentId, assessments);
            });
        });
        
        // Add filter functionality
        initializeStudentFilters(assessments);
    }
    
    // Initialize student filters
    function initializeStudentFilters(assessments) {
        const classFilter = document.getElementById('class-filter');
        const scoreFilter = document.getElementById('score-filter');
        const searchInput = document.getElementById('student-search');
        
        if (!classFilter || !scoreFilter || !searchInput) {
            console.error('Filter elements not found');
            return;
        }
        
        // Populate class filter options
        const classes = [...new Set(assessments.map(a => a.studentClass))];
        classFilter.innerHTML = '<option value="all">All Classes</option>';
        
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classFilter.appendChild(option);
        });
        
        // Filter function
        function applyFilters() {
            const selectedClass = classFilter.value;
            const selectedScore = scoreFilter.value;
            const searchTerm = searchInput.value.toLowerCase();
            
            const filteredAssessments = assessments.filter(assessment => {
                // Class filter
                if (selectedClass !== 'all' && assessment.studentClass !== selectedClass) {
                    return false;
                }
                
                // Score filter
                const score = parseFloat(assessment.scores.total);
                if (selectedScore === 'high' && score <= 2.0) {
                    return false;
                } else if (selectedScore === 'medium' && (score < 1.0 || score > 2.0)) {
                    return false;
                } else if (selectedScore === 'low' && score >= 1.0) {
                    return false;
                }
                
                // Search filter
                if (searchTerm && 
                    !assessment.studentName.toLowerCase().includes(searchTerm) && 
                    !assessment.studentEmail.toLowerCase().includes(searchTerm)) {
                    return false;
                }
                
                return true;
            });
            
            // Update table
            updateStudentsTable(filteredAssessments);
        }
        
        // Add event listeners
        classFilter.addEventListener('change', applyFilters);
        scoreFilter.addEventListener('change', applyFilters);
        searchInput.addEventListener('input', applyFilters);
    }
    
    // Update classes tab
    function updateClassesTab(assessments) {
        const classCardsContainer = document.getElementById('class-cards-container');
        if (!classCardsContainer) {
            console.error('Class cards container not found');
            return;
        }
        
        classCardsContainer.innerHTML = '';
        
        if (assessments.length === 0) {
            classCardsContainer.innerHTML = '<div class="no-data">No assessments submitted yet.</div>';
            return;
        }
        
        // Group assessments by class
        const classesByName = {};
        assessments.forEach(assessment => {
            const className = assessment.studentClass;
            if (!classesByName[className]) {
                classesByName[className] = [];
            }
            classesByName[className].push(assessment);
        });
        
        // Create class cards
        Object.entries(classesByName).forEach(([className, classAssessments]) => {
            // Calculate statistics
            const studentCount = new Set(classAssessments.map(a => a.studentEmail)).size;
            const averageScore = classAssessments.reduce((sum, a) => sum + parseFloat(a.scores.total), 0) / classAssessments.length;
            const highestScore = Math.max(...classAssessments.map(a => parseFloat(a.scores.total)));
            const lowestScore = Math.min(...classAssessments.map(a => parseFloat(a.scores.total)));
            
            // Create card
            const classCard = document.createElement('div');
            classCard.className = 'class-card';
            classCard.innerHTML = `
                <h3>${className} <span class="badge">${studentCount} students</span></h3>
                <div class="class-meta">
                    <div class="meta-item">
                        <h4>Average Score</h4>
                        <p>${averageScore.toFixed(1)}/3.0</p>
                    </div>
                    <div class="meta-item">
                        <h4>Highest Score</h4>
                        <p>${highestScore.toFixed(1)}/3.0</p>
                    </div>
                    <div class="meta-item">
                        <h4>Lowest Score</h4>
                        <p>${lowestScore.toFixed(1)}/3.0</p>
                    </div>
                </div>
                <canvas id="chart-${className.replace(/\s+/g, '-')}"></canvas>
            `;
            
            classCardsContainer.appendChild(classCard);
            
            // Create a mini chart for each class
            setTimeout(() => {
                const chartElement = document.getElementById(`chart-${className.replace(/\s+/g, '-')}`);
                if (!chartElement) {
                    console.error(`Chart element for class ${className} not found`);
                    return;
                }
                
                const ctx = chartElement.getContext('2d');
                
                // Group scores into ranges
                const scoreRanges = [0, 1, 2, 3];
                const scoreDistribution = scoreRanges.map((min, index) => {
                    const max = scoreRanges[index + 1] || 3.1; // Last range goes slightly above 3.0
                    return classAssessments.filter(a => {
                        const score = parseFloat(a.scores.total);
                        return score >= min && score < max;
                    }).length;
                });
                
                try {
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: ['0-1', '1-2', '2-3'],
                            datasets: [{
                                label: 'Score Distribution',
                                data: scoreDistribution,
                                backgroundColor: [
                                    'rgba(255, 99, 132, 0.2)',
                                    'rgba(255, 206, 86, 0.2)',
                                    'rgba(75, 192, 192, 0.2)'
                                ],
                                borderColor: [
                                    'rgba(255, 99, 132, 1)',
                                    'rgba(255, 206, 86, 1)',
                                    'rgba(75, 192, 192, 1)'
                                ],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1,
                                        precision: 0
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error('Error creating chart:', e);
                }
            }, 100);
        });
    }
    
    // Update questions tab
    function updateQuestionsTab(assessments) {
        const part2Container = document.getElementById('part2-questions');
        const part3Container = document.getElementById('part3-questions');
        
        if (!part2Container || !part3Container) {
            console.error('Question containers not found');
            return;
        }
        
        part2Container.innerHTML = '';
        part3Container.innerHTML = '';
        
        if (assessments.length === 0) {
            part2Container.innerHTML = '<div class="no-data">No assessments submitted yet.</div>';
            part3Container.innerHTML = '<div class="no-data">No assessments submitted yet.</div>';
            return;
        }
        
        // Analysis for Part 2 questions
        for (let i = 'a'; i <= 'f'; i++) {
            for (let j = 1; j <= 2; j++) {
                const questionId = `q2${i}${j}`;
                
                // Calculate success rate
                const correctCount = assessments.filter(a => {
                    const studentAnswer = a.answers && a.answers[questionId] ? a.answers[questionId].trim().toLowerCase() : '';
                    const correctAnswer = assessmentConfig.part2Answers[questionId].toLowerCase();
                    return studentAnswer === correctAnswer;
                }).length;
                
                const successRate = (correctCount / assessments.length) * 100;
                
                // Create progress bar
                const progressContainer = document.createElement('div');
                progressContainer.className = 'progress-container';
                progressContainer.innerHTML = `
                    <p>Question 2${i}${j}:</p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${successRate}%" id="${questionId}-progress"></div>
                    </div>
                    <span id="${questionId}-percentage">${successRate.toFixed(0)}%</span>
                `;
                
                part2Container.appendChild(progressContainer);
            }
        }
        
        // Analysis for Part 3 questions
        for (let i = 'a'; i <= 'h'; i++) {
            const questionId = `q3${i}`;
            
            // Calculate success rate
            const correctCount = assessments.filter(a => {
                if (!a.answers || !a.answers[questionId]) return false;
                
                // Normalize student answer
                let studentAnswer = a.answers[questionId].trim();
                if (studentAnswer.endsWith('.')) {
                    studentAnswer = studentAnswer.slice(0, -1);
                }
                
                // Normalize correct answer
                let correctAnswer = assessmentConfig.part3Answers[questionId];
                if (correctAnswer.endsWith('.')) {
                    correctAnswer = correctAnswer.slice(0, -1);
                }
                
                return studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
            }).length;
            
            const successRate = (correctCount / assessments.length) * 100;
            
            // Create progress bar
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            progressContainer.innerHTML = `
                <p>Question 3${i}:</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${successRate}%" id="${questionId}-progress"></div>
                </div>
                <span id="${questionId}-percentage">${successRate.toFixed(0)}%</span>
            `;
            
            part3Container.appendChild(progressContainer);
        }
        
        // Analysis for Part 4 writing
        const optionCounts = {
            'A': 0,
            'B': 0,
            'C': 0
        };
        
        assessments.forEach(assessment => {
            const option = assessment.answers && assessment.answers['writing-option'];
            if (option && optionCounts.hasOwnProperty(option)) {
                optionCounts[option]++;
            }
        });
        
        // Update chart for writing options
        setTimeout(() => {
            const chartElement = document.getElementById('writing-options-chart');
            if (!chartElement) {
                console.error('Writing options chart element not found');
                return;
            }
            
            const ctx = chartElement.getContext('2d');
            
            try {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Option A', 'Option B', 'Option C'],
                        datasets: [{
                            data: [optionCounts['A'], optionCounts['B'], optionCounts['C']],
                            backgroundColor: [
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(255, 206, 86, 0.2)',
                                'rgba(75, 192, 192, 0.2)'
                            ],
                            borderColor: [
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
            } catch (e) {
                console.error('Error creating writing options chart:', e);
            }
        }, 100);
        
        // Calculate average writing score
        const writingScores = assessments.map(a => parseFloat(a.scores.part4)).filter(score => !isNaN(score));
        const avgWritingScore = writingScores.length > 0 ? 
            writingScores.reduce((sum, score) => sum + score, 0) / writingScores.length : 0;
            
        const writingAvgScoreElement = document.getElementById('writing-avg-score');
        if (writingAvgScoreElement) {
            writingAvgScoreElement.textContent = `${avgWritingScore.toFixed(1)}/1.5`;
        }
        
        // Analyze common issues in writing
        const writingIssues = document.getElementById('writing-issues');
        if (!writingIssues) {
            console.error('Writing issues element not found');
            return;
        }
        
        writingIssues.innerHTML = '';
        
        if (assessments.length === 0) {
            writingIssues.innerHTML = '<li>No data available</li>';
            return;
        }
        
        // Simple analysis of common issues based on scores
        const assessmentsWithWritingFeedback = assessments.filter(a => a.feedback && a.feedback.writing);
        
        if (assessmentsWithWritingFeedback.length === 0) {
            writingIssues.innerHTML = '<li>No writing feedback data available</li>';
            return;
        }
        
        const missingPerceptionVerbs = assessmentsWithWritingFeedback.filter(a => 
            !a.feedback.writing.perceptionVerbsFeedback.includes('Excellent') && 
            !a.feedback.writing.perceptionVerbsFeedback.includes('Good')
        ).length;
        
        const missingFeelingVerbs = assessmentsWithWritingFeedback.filter(a => 
            !a.feedback.writing.feelingVerbsFeedback.includes('Excellent') && 
            !a.feedback.writing.feelingVerbsFeedback.includes('Good')
        ).length;
        
        const incorrectTenses = assessmentsWithWritingFeedback.filter(a => 
            (!a.feedback.writing.presentSimpleFeedback.includes('Excellent') || 
            !a.feedback.writing.presentContinuousFeedback.includes('Excellent'))
        ).length;
        
        const tooShort = assessmentsWithWritingFeedback.filter(a => 
            a.feedback.writing.lengthFeedback.includes('too short')
        ).length;
        
        // Add issues to the list
        const issues = [
            { name: 'Incorrect or missing perception verbs', count: missingPerceptionVerbs },
            { name: 'Incorrect or missing feeling verbs', count: missingFeelingVerbs },
            { name: 'Confusion between Present Simple and Continuous', count: incorrectTenses },
            { name: 'Response too short', count: tooShort }
        ];
        
        // Sort issues by frequency
        issues.sort((a, b) => b.count - a.count);
        
        // Add to the list
        issues.forEach(issue => {
            const percentage = (issue.count / assessmentsWithWritingFeedback.length) * 100;
            const li = document.createElement('li');
            li.textContent = `${issue.name}: ${percentage.toFixed(0)}% of students`;
            writingIssues.appendChild(li);
        });
    }
    
    // Create charts
    function createCharts(assessments) {
        if (assessments.length === 0) {
            console.log('No assessments to create charts');
            return;
        }
        
        // Score distribution chart
        const scoreChartElement = document.getElementById('score-chart');
        if (!scoreChartElement) {
            console.error('Score chart element not found');
            return;
        }
        
        const scoreCtx = scoreChartElement.getContext('2d');
        
        // Group scores into ranges
        const scoreRanges = [
            { min: 0, max: 0.5 },
            { min: 0.5, max: 1.0 },
            { min: 1.0, max: 1.5 },
            { min: 1.5, max: 2.0 },
            { min: 2.0, max: 2.5 },
            { min: 2.5, max: 3.0 }
        ];
        
        const scoreDistribution = scoreRanges.map(range => {
            return assessments.filter(a => {
                const score = parseFloat(a.scores.total);
                return score >= range.min && score < range.max;
            }).length;
        });
        
        try {
            new Chart(scoreCtx, {
                type: 'bar',
                data: {
                    labels: ['0-0.5', '0.5-1.0', '1.0-1.5', '1.5-2.0', '2.0-2.5', '2.5-3.0'],
                    datasets: [{
                        label: 'Number of Students',
                        data: scoreDistribution,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                precision: 0
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Error creating score distribution chart:', e);
        }
        
        // Class performance chart
        const classChartElement = document.getElementById('class-chart');
        if (!classChartElement) {
            console.error('Class chart element not found');
            return;
        }
        
        const classCtx = classChartElement.getContext('2d');
        
        // Group by class
        const classesByName = {};
        assessments.forEach(assessment => {
            const className = assessment.studentClass;
            if (!classesByName[className]) {
                classesByName[className] = [];
            }
            classesByName[className].push(assessment);
        });
        
        // Calculate average scores by class
        const classNames = Object.keys(classesByName);
        const classAverages = classNames.map(className => {
            const classAssessments = classesByName[className];
            return classAssessments.reduce((sum, a) => sum + parseFloat(a.scores.total), 0) / classAssessments.length;
        });
        
        try {
            new Chart(classCtx, {
                type: 'bar',
                data: {
                    labels: classNames,
                    datasets: [{
                        label: 'Average Score',
                        data: classAverages,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 3.0
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Error creating class performance chart:', e);
        }
        
        // Class comparison chart (full width)
        const classComparisonChartElement = document.getElementById('class-comparison-chart');
        if (!classComparisonChartElement) {
            console.error('Class comparison chart element not found');
            return;
        }
        
        const classComparisonCtx = classComparisonChartElement.getContext('2d');
        
        // Calculate average scores for each section by class
        const sectionLabels = ['Part 1 (0.5)', 'Part 2 (0.6)', 'Part 3 (0.4)', 'Part 4 (1.5)'];
        const sectionData = {};
        
        classNames.forEach(className => {
            const classAssessments = classesByName[className];
            sectionData[className] = [
                classAssessments.reduce((sum, a) => sum + parseFloat(a.scores.part1), 0) / classAssessments.length,
                classAssessments.reduce((sum, a) => sum + parseFloat(a.scores.part2), 0) / classAssessments.length,
                classAssessments.reduce((sum, a) => sum + parseFloat(a.scores.part3), 0) / classAssessments.length,
                classAssessments.reduce((sum, a) => sum + parseFloat(a.scores.part4), 0) / classAssessments.length
            ];
        });
        
        // Create datasets for each class
        const colorPalette = [
           { bg: 'rgba(255, 206, 86, 0.2)', border: 'rgba(255, 206, 86, 1)' },
            { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgba(75, 192, 192, 1)' },
            { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgba(153, 102, 255, 1)' },
            { bg: 'rgba(255, 159, 64, 0.2)', border: 'rgba(255, 159, 64, 1)' }
        ];
        
        const classDatasets = classNames.map((className, index) => {
            const color = colorPalette[index % colorPalette.length];
            return {
                label: className,
                data: sectionData[className],
                backgroundColor: color.bg,
                borderColor: color.border,
                borderWidth: 1
            };
        });
        
        try {
            new Chart(classComparisonCtx, {
                type: 'bar',
                data: {
                    labels: sectionLabels,
                    datasets: classDatasets
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 1.5 // Maximum possible score for any section
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Error creating class comparison chart:', e);
        }
        
        // Question success rate chart
        const questionSuccessChartElement = document.getElementById('question-success-chart');
        if (!questionSuccessChartElement) {
            console.error('Question success chart element not found');
            return;
        }
        
        const questionSuccessCtx = questionSuccessChartElement.getContext('2d');
        
        // Calculate success rates for Part 2 and Part 3 questions
        const part2SuccessRates = [];
        const part2Labels = [];
        
        for (let i = 'a'; i <= 'f'; i++) {
            for (let j = 1; j <= 2; j++) {
                const questionId = `q2${i}${j}`;
                const label = `2${i}${j}`;
                
                // Calculate success rate
                const correctCount = assessments.filter(a => {
                    if (!a.answers || !a.answers[questionId]) return false;
                    const studentAnswer = a.answers[questionId].trim().toLowerCase();
                    const correctAnswer = assessmentConfig.part2Answers[questionId].toLowerCase();
                    return studentAnswer === correctAnswer;
                }).length;
                
                const successRate = (correctCount / assessments.length) * 100;
                part2SuccessRates.push(successRate);
                part2Labels.push(label);
            }
        }
        
        const part3SuccessRates = [];
        const part3Labels = [];
        
        for (let i = 'a'; i <= 'h'; i++) {
            const questionId = `q3${i}`;
            const label = `3${i}`;
            
            // Calculate success rate
            const correctCount = assessments.filter(a => {
                if (!a.answers || !a.answers[questionId]) return false;
                
                // Normalize answers for comparison
                let studentAnswer = a.answers[questionId].trim();
                let correctAnswer = assessmentConfig.part3Answers[questionId];
                
                if (studentAnswer.endsWith('.')) {
                    studentAnswer = studentAnswer.slice(0, -1);
                }
                
                if (correctAnswer.endsWith('.')) {
                    correctAnswer = correctAnswer.slice(0, -1);
                }
                
                return studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
            }).length;
            
            const successRate = (correctCount / assessments.length) * 100;
            part3SuccessRates.push(successRate);
            part3Labels.push(label);
        }
        
        try {
            new Chart(questionSuccessCtx, {
                type: 'bar',
                data: {
                    labels: [...part2Labels, ...part3Labels],
                    datasets: [
                        {
                            label: 'Success Rate (%)',
                            data: [...part2SuccessRates, ...part3SuccessRates],
                            backgroundColor: function(context) {
                                const index = context.dataIndex;
                                return index < part2Labels.length ? 
                                    'rgba(75, 192, 192, 0.2)' : 'rgba(255, 99, 132, 0.2)';
                            },
                            borderColor: function(context) {
                                const index = context.dataIndex;
                                return index < part2Labels.length ? 
                                    'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)';
                            },
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Error creating question success chart:', e);
        }
        
        // Section score chart
        const sectionScoreChartElement = document.getElementById('section-score-chart');
        if (!sectionScoreChartElement) {
            console.error('Section score chart element not found');
            return;
        }
        
        const sectionScoreCtx = sectionScoreChartElement.getContext('2d');
        
        // Calculate average scores for each section
        const part1Avg = assessments.reduce((sum, a) => sum + parseFloat(a.scores.part1), 0) / assessments.length;
        const part2Avg = assessments.reduce((sum, a) => sum + parseFloat(a.scores.part2), 0) / assessments.length;
        const part3Avg = assessments.reduce((sum, a) => sum + parseFloat(a.scores.part3), 0) / assessments.length;
        const part4Avg = assessments.reduce((sum, a) => sum + parseFloat(a.scores.part4), 0) / assessments.length;
        
        // Calculate as percentages of maximum possible score
        const part1Percent = (part1Avg / 0.5) * 100;
        const part2Percent = (part2Avg / 0.6) * 100;
        const part3Percent = (part3Avg / 0.4) * 100;
        const part4Percent = (part4Avg / 1.5) * 100;
        
        try {
            new Chart(sectionScoreCtx, {
                type: 'radar',
                data: {
                    labels: ['Part 1', 'Part 2', 'Part 3', 'Part 4'],
                    datasets: [{
                        label: 'Average Score (%)',
                        data: [part1Percent, part2Percent, part3Percent, part4Percent],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Error creating section score chart:', e);
        }
    }
    
    // Initialize accordion functionality
    function initializeAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const item = this.parentElement;
                
                // Toggle active class
                item.classList.toggle('active');
            });
        });
    }
    
    // Initialize settings functionality
    function initializeSettings() {
        // Account settings form
        const accountSettingsForm = document.getElementById('account-settings');
        
        if (accountSettingsForm) {
            // Get teacher data
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    // Get teacher data from Firestore
                    db.collection('teachers').doc(user.uid).get()
                        .then((doc) => {
                            if (doc.exists) {
                                const teacherData = doc.data();
                                
                                // Fill form
                                document.getElementById('display-name').value = teacherData.name;
                                document.getElementById('email-address').value = user.email;
                            }
                        })
                        .catch((error) => {
                            console.error("Error getting teacher data:", error);
                        });
                }
            });
            
            // Handle form submission
            accountSettingsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const displayName = document.getElementById('display-name').value;
                
                // Update teacher data
                firebase.auth().onAuthStateChanged(function(user) {
                    if (user) {
                        db.collection('teachers').doc(user.uid).update({
                            name: displayName
                        })
                        .then(() => {
                            // Update UI
                            document.getElementById('teacher-name').textContent = `Welcome, ${displayName}`;
                            showAlert('Account settings updated successfully.', 'success');
                        })
                        .catch((error) => {
                            console.error("Error updating teacher data:", error);
                            showAlert('Error updating account settings.', 'error');
                        });
                    }
                });
            });
        }
        
        // Password change form
        const passwordForm = document.getElementById('password-form');
        
        if (passwordForm) {
            passwordForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                
                // Check if new passwords match
                if (newPassword !== confirmPassword) {
                    showAlert('New passwords do not match.', 'error');
                    return;
                }
                
                // Update password
                updatePassword(currentPassword, newPassword);
            });
        }
        
        // Class management
        const addClassBtn = document.getElementById('add-class-btn');
        const addClassForm = document.getElementById('add-class-form');
        const cancelAddClassBtn = document.getElementById('cancel-add-class');
        const newClassForm = document.getElementById('new-class-form');
        
        if (addClassBtn && addClassForm && cancelAddClassBtn && newClassForm) {
            // Show/hide form
            addClassBtn.addEventListener('click', function() {
                addClassForm.classList.remove('hidden');
            });
            
            cancelAddClassBtn.addEventListener('click', function() {
                addClassForm.classList.add('hidden');
            });
            
            // Handle form submission
            newClassForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const className = document.getElementById('class-name').value;
                const classDescription = document.getElementById('class-description').value;
                
                // Add class to Firestore
                db.collection('classes').add({
                    name: className,
                    description: classDescription,
                    createdAt: new Date()
                })
                .then(() => {
                    // Reset form
                    newClassForm.reset();
                    addClassForm.classList.add('hidden');
                    
                    // Show success message
                    showAlert('Class added successfully.', 'success');
                    
                    // Reload class list
                    loadClassList();
                })
                .catch((error) => {
                    console.error("Error adding class:", error);
                    showAlert('Error adding class.', 'error');
                });
            });
        }
        
        // Load class list
        loadClassList();
        
        // Export buttons
        const exportCsvBtn = document.getElementById('export-csv');
        const exportPdfBtn = document.getElementById('export-pdf');
        
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', function() {
                exportToCSV();
            });
        }
        
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', function() {
                showAlert('PDF export is not implemented in this demo.', 'info');
            });
        }
    }
    
    // Load class list
    function loadClassList() {
        const classesList = document.getElementById('classes-list');
        
        if (!classesList) return;
        
        classesList.innerHTML = '';
        
        // Get classes from Firestore
        db.collection('classes').orderBy('name').get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    classesList.innerHTML = '<li class="empty-list">No classes added yet.</li>';
                    return;
                }
                
                querySnapshot.forEach((doc) => {
                    const classData = doc.data();
                    
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${classData.name}</span>
                        <div class="actions">
                            <button class="btn-edit" data-id="${doc.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-delete" data-id="${doc.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    `;
                    
                    classesList.appendChild(li);
                });
                
                // Add event listeners to edit/delete buttons
                document.querySelectorAll('.btn-edit').forEach(button => {
                    button.addEventListener('click', function() {
                        const classId = this.getAttribute('data-id');
                        // Show edit form (not implemented in this demo)
                        showAlert('Class editing is not implemented in this demo.', 'info');
                    });
                });
                
                document.querySelectorAll('.btn-delete').forEach(button => {
                    button.addEventListener('click', function() {
                        const classId = this.getAttribute('data-id');
                        
                        if (confirm('Are you sure you want to delete this class?')) {
                            // Delete class from Firestore
                            db.collection('classes').doc(classId).delete()
                                .then(() => {
                                    showAlert('Class deleted successfully.', 'success');
                                    loadClassList();
                                })
                                .catch((error) => {
                                    console.error("Error deleting class:", error);
                                    showAlert('Error deleting class.', 'error');
                                });
                        }
                    });
                });
            })
            .catch((error) => {
                console.error("Error loading classes:", error);
                showAlert('Error loading classes.', 'error');
            });
    }
    
    // Update password
    function updatePassword(currentPassword, newPassword) {
        const user = firebase.auth().currentUser;
        
        if (!user) {
            showAlert('You must be logged in to change your password.', 'error');
            return;
        }
        
        // Get credentials
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        
        // Re-authenticate
        user.reauthenticateWithCredential(credential)
            .then(() => {
                // Update password
                return user.updatePassword(newPassword);
            })
            .then(() => {
                // Show success message
                showAlert('Password updated successfully.', 'success');
                
                // Reset form
                document.getElementById('password-form').reset();
            })
            .catch((error) => {
                console.error("Error updating password:", error);
                
                if (error.code === 'auth/wrong-password') {
                    showAlert('Current password is incorrect.', 'error');
                } else {
                    showAlert('Error updating password. Please try again.', 'error');
                }
            });
    }
    
    // Export to CSV
    function exportToCSV() {
        db.collection('assessments').get()
            .then((querySnapshot) => {
                const assessments = [];
                
                querySnapshot.forEach((doc) => {
                    const assessment = doc.data();
                    
                    // Format date
                    let formattedDate = 'N/A';
                    if (assessment.submissionDate) {
                        const date = assessment.submissionDate instanceof Date ? 
                            assessment.submissionDate : 
                            new Date(assessment.submissionDate.seconds * 1000);
                        formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                    }
                    assessment.formattedDate = formattedDate;
                    
                    assessments.push(assessment);
                });
                
                if (assessments.length === 0) {
                    showAlert('No assessment data to export.', 'info');
                    return;
                }
                
                // Create CSV content
                let csvContent = 'Student Name,Email,Class,Submission Date,Total Score,Part 1 Score,Part 2 Score,Part 3 Score,Part 4 Score\n';
                
                assessments.forEach(assessment => {
                    csvContent += `"${assessment.studentName}","${assessment.studentEmail}","${assessment.studentClass}","${assessment.formattedDate}",${assessment.scores.total},${assessment.scores.part1},${assessment.scores.part2},${assessment.scores.part3},${assessment.scores.part4}\n`;
                });
                
                // Create download link
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', 'assessment_results.csv');
                link.style.visibility = 'hidden';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showAlert('CSV data exported successfully.', 'success');
            })
            .catch((error) => {
                console.error("Error exporting data:", error);
                showAlert('Error exporting data.', 'error');
            });
    }
    
    // Show student detail modal
    function showStudentDetail(assessmentId, assessments) {
        const assessment = assessments.find(a => a.id === assessmentId);
        
        if (!assessment) {
            showAlert('Assessment not found.', 'error');
            return;
        }
        
        // Get modal elements
        const modal = document.getElementById('student-modal');
        const modalContent = document.getElementById('student-details');
        const closeModal = document.querySelector('.close-modal');
        
        if (!modal || !modalContent || !closeModal) {
            console.error('Modal elements not found');
            return;
        }
        
        // Format date
        let formattedDate = 'N/A';
        if (assessment.submissionDate) {
            const date = assessment.submissionDate instanceof Date ? 
                assessment.submissionDate : 
                new Date(assessment.submissionDate.seconds * 1000);
            formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
        
        // Create content
        modalContent.innerHTML = `
            <div class="student-detail-header">
                <h3>${assessment.studentName}</h3>
                <p><strong>Email:</strong> ${assessment.studentEmail}</p>
                <p><strong>Class:</strong> ${assessment.studentClass}</p>
                <p><strong>Submission Date:</strong> ${formattedDate}</p>
            </div>
            
            <div class="score-summary">
                <div class="score-circle">
                    <span>${assessment.scores.total}</span>/3.0
                </div>
                <div class="score-breakdown">
                    <p>Part 1: ${assessment.scores.part1}/0.5</p>
                    <p>Part 2: ${assessment.scores.part2}/0.6</p>
                    <p>Part 3: ${assessment.scores.part3}/0.4</p>
                    <p>Part 4: ${assessment.scores.part4}/1.5</p>
                </div>
            </div>
            
            <div class="assessment-answers">
                <h4>Part 1: Theoretical Understanding</h4>
                <div class="answer-item">
                    <p><strong>Question 1a:</strong></p>
                    <p class="student-answer">${assessment.answers?.q1a || 'No answer provided'}</p>
                    <p class="feedback">${assessment.feedback?.q1a || 'No feedback available'}</p>
                </div>
                <div class="answer-item">
                    <p><strong>Question 1b:</strong></p>
                    <p class="student-answer">${assessment.answers?.q1b || 'No answer provided'}</p>
                    <p class="feedback">${assessment.feedback?.q1b || 'No feedback available'}</p>
                </div>
                
                <h4>Part 2: Completing Sentences</h4>
        `;
        
        // Add Part 2 answers
        for (let i = 'a'; i <= 'f'; i++) {
            modalContent.innerHTML += `
                <div class="answer-item">
                    <p><strong>Question 2${i}:</strong></p>
                    <p class="student-answer">${assessment.answers?.[`q2${i}1`] || 'No answer'} / ${assessment.answers?.[`q2${i}2`] || 'No answer'}</p>
                    <p class="feedback">${assessment.feedback?.[`q2${i}1`] || 'No feedback'}</p>
                    <p class="feedback">${assessment.feedback?.[`q2${i}2`] || 'No feedback'}</p>
                </div>
            `;
        }
        
        // Add Part 3 answers
        modalContent.innerHTML += `<h4>Part 3: Error Identification and Correction</h4>`;
        
        for (let i = 'a'; i <= 'h'; i++) {
            modalContent.innerHTML += `
                <div class="answer-item">
                    <p><strong>Question 3${i}:</strong></p>
                    <p class="student-answer">${assessment.answers?.[`q3${i}`] || 'No answer provided'}</p>
                    <p class="feedback">${assessment.feedback?.[`q3${i}`] || 'No feedback available'}</p>
                </div>
            `;
        }
        
        // Add Part 4 answer if available
        if (assessment.answers && assessment.answers['writing-response']) {
            modalContent.innerHTML += `
                <h4>Part 4: Writing Production (Option ${assessment.answers['writing-option'] || 'N/A'})</h4>
                <div class="answer-item">
                    <p class="student-answer">${assessment.answers['writing-response'].replace(/\n/g, '<br>')}</p>
                    <div class="writing-feedback">
            `;
            
            // Add writing feedback if available
            if (assessment.feedback && assessment.feedback.writing) {
                modalContent.innerHTML += `
                    <p><strong>Word Count:</strong> ${assessment.feedback.writing.wordCount} words. ${assessment.feedback.writing.lengthFeedback}</p>
                    <p><strong>Present Simple:</strong> ${assessment.feedback.writing.presentSimpleFeedback}</p>
                    <p><strong>Present Continuous:</strong> ${assessment.feedback.writing.presentContinuousFeedback}</p>
                    <p><strong>Perception Verbs:</strong> ${assessment.feedback.writing.perceptionVerbsFeedback}</p>
                    <p><strong>Feeling Verbs:</strong> ${assessment.feedback.writing.feelingVerbsFeedback}</p>
                    <p><strong>Overall Feedback:</strong> ${assessment.feedback.writing.overallFeedback}</p>
                `;
            } else {
                modalContent.innerHTML += `<p>No detailed feedback available.</p>`;
            }
            
            modalContent.innerHTML += `
                    </div>
                </div>
            `;
        } else {
            modalContent.innerHTML += `
                <h4>Part 4: Writing Production</h4>
                <div class="answer-item">
                    <p class="student-answer">No writing response submitted.</p>
                </div>
            `;
        }
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Close modal when clicking X or outside
        const closeModalHandler = function() {
            modal.classList.add('hidden');
        };
        
        closeModal.addEventListener('click', closeModalHandler);
        
        const windowClickHandler = function(e) {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        };
        
        window.addEventListener('click', windowClickHandler);
        
        // Remove event listeners when modal is closed to prevent memory leaks
        modal.addEventListener('transitionend', function() {
            if (modal.classList.contains('hidden')) {
                closeModal.removeEventListener('click', closeModalHandler);
                window.removeEventListener('click', windowClickHandler);
            }
        });
    }
    
    // Helper function to show alerts
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${type}`;
        alertDiv.textContent = message;
        
        const contentElement = document.querySelector('.content');
        if (contentElement) {
            contentElement.prepend(alertDiv);
            
            // Remove the alert after 3 seconds
            setTimeout(() => {
                alertDiv.remove();
            }, 3000);
        } else {
            console.error('Content element not found for showing alert');
        }
    }
});
