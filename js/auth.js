document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const studentLoginForm = document.getElementById('student-login');
    const teacherLoginLink = document.getElementById('teacher-login-link');
    const teacherLoginPanel = document.getElementById('teacher-login-panel');
    const loginForm = document.getElementById('login-form');
    const teacherLoginForm = document.getElementById('teacher-login-form');
    const backToStudentBtn = document.getElementById('back-to-student');
    
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Check if the user is a teacher
            db.collection('teachers').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        // Redirect to teacher dashboard
                        window.location.href = 'dashboard.html';
                    } else {
                        // Check if student has already taken the assessment
                        checkStudentAssessmentStatus(user.email);
                    }
                })
                .catch((error) => {
                    console.error("Error checking user role:", error);
                });
        }
    });
    
    // Student Login Form Submission
    if (studentLoginForm) {
        studentLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const fullname = document.getElementById('fullname').value;
            const classValue = document.getElementById('class').value;
            
            if (!email || !fullname || !classValue) {
                showAlert('Please fill in all fields', 'error');
                return;
            }
            
            // Check if the student has already taken the assessment
            db.collection('assessments')
                .where('studentEmail', '==', email)
                .get()
                .then((querySnapshot) => {
                    if (!querySnapshot.empty) {
                        showAlert('You have already taken this assessment. Each student can only take it once.', 'error');
                    } else {
                        // Create a session for the student
                        sessionStorage.setItem('studentEmail', email);
                        sessionStorage.setItem('studentName', fullname);
                        sessionStorage.setItem('studentClass', classValue);
                        
                        // Redirect to assessment page
                        window.location.href = 'assessment.html';
                    }
                })
                .catch((error) => {
                    console.error("Error checking student assessment status:", error);
                    showAlert('An error occurred. Please try again.', 'error');
                });
        });
    }
    
    // Teacher Login Link Click
    if (teacherLoginLink) {
        teacherLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.classList.add('hidden');
            teacherLoginPanel.classList.remove('hidden');
        });
    }
    
    // Back to Student Login
    if (backToStudentBtn) {
        backToStudentBtn.addEventListener('click', function() {
            teacherLoginPanel.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }
    
    // Teacher Login Form Submission
    if (teacherLoginForm) {
        teacherLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('teacher-email').value;
            const password = document.getElementById('teacher-password').value;
            
            if (!email || !password) {
                showAlert('Please fill in all fields', 'error');
                return;
            }
            
            // Sign in with Firebase Authentication
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Check if the user is a teacher
                    const user = userCredential.user;
                    
                    db.collection('teachers').doc(user.uid).get()
                        .then((doc) => {
                            if (doc.exists) {
                                // Redirect to teacher dashboard
                                window.location.href = 'dashboard.html';
                            } else {
                                // Sign out the user if not a teacher
                                firebase.auth().signOut();
                                showAlert('You do not have teacher access.', 'error');
                            }
                        })
                        .catch((error) => {
                            console.error("Error checking teacher status:", error);
                            showAlert('An error occurred. Please try again.', 'error');
                        });
                })
                .catch((error) => {
                    console.error("Error signing in:", error);
                    showAlert('Invalid email or password.', 'error');
                });
        });
    }
    
    // Helper function to check if a student has already taken the assessment
    function checkStudentAssessmentStatus(email) {
        db.collection('assessments')
            .where('studentEmail', '==', email)
            .get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    // Student has already taken the assessment, show the result
                    const assessmentDoc = querySnapshot.docs[0];
                    const assessmentData = assessmentDoc.data();
                    
                    // Store assessment data in session and redirect to results page
                    sessionStorage.setItem('assessmentResults', JSON.stringify(assessmentData));
                    window.location.href = 'results.html';
                } else {
                    // Student hasn't taken the assessment, redirect to assessment page
                    window.location.href = 'assessment.html';
                }
            })
            .catch((error) => {
                console.error("Error checking assessment status:", error);
                showAlert('An error occurred. Please try again.', 'error');
            });
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
