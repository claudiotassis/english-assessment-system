// Firebase configuration
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWHIn_u4ZR6z-R8mjvXQrfi65BLnA-es8",
  authDomain: "english-assessment-system.firebaseapp.com",
  projectId: "english-assessment-system",
  storageBucket: "english-assessment-system.firebasestorage.app",
  messagingSenderId: "749884700814",
  appId: "1:749884700814:web:a2329011973a448450b1df",
  measurementId: "G-N2M7ZKVEWG"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Assessment questions and answers
const assessmentConfig = {
    // Part 2 correct answers
    part2Answers: {
        "q2a1": "is playing",
        "q2a2": "am watching",
        "q2b1": "hates",
        "q2b2": "is not eating",
        "q2c1": "see",
        "q2c2": "doesn't understand",
        "q2d1": "sounds",
        "q2d2": "doesn't sound",
        "q2e1": "believe",
        "q2e2": "are telling",
        "q2f1": "tastes",
        "q2f2": "prefers"
    },
    
    // Part 3 correct answers
    part3Answers: {
        "q3a": "I see the mountains from my window.",
        "q3b": "She loves chocolate ice cream.",
        "q3c": "They want to go to the beach this weekend.",
        "q3d": "He smells the roses in the garden.",
        "q3e": "The music sounds beautiful tonight.",
        "q3f": "She believes everything he says.",
        "q3g": "I think that you are right.",
        "q3h": "They have three cars."
    },
    
    // Maximum scores for each part
    maxScores: {
        part1: 0.5,
        part2: 0.6,
        part3: 0.4,
        part4: 1.5
    },
    
    // Keywords for Part 1 evaluation
    part1Keywords: {
        q1a: [
            "habit", "routine", "permanent", "regular", "fact", "general truth",
            "action", "progress", "temporary", "moment", "now", "currently"
        ],
        q1b: [
            "state", "non-action", "mental", "perception", "feeling", "stative",
            "see", "sound", "smell", "taste", "feel", "love", "hate", "like", "prefer", "want"
        ]
    },
    
    // Keywords for Part 4 evaluation
    part4Keywords: {
        presentSimple: [
            "usually", "always", "every day", "normally", "generally", "regularly", "habit", "routine"
        ],
        presentContinuous: [
            "now", "right now", "at the moment", "currently", "today", "this week"
        ],
        perceptionVerbs: [
            "see", "sound", "smell", "taste", "feel"
        ],
        feelingVerbs: [
            "love", "hate", "like", "prefer", "want", "believe", "know", "understand"
        ]
    }
};
