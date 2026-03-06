// Fallback data for when API quota is exhausted

export const FALLBACK_INTERVIEW_QUESTIONS = {
  "Software Engineer": {
    Easy: [
      "What is the difference between let, const, and var in JavaScript?",
      "Explain what a closure is and provide an example.",
      "What are the main differences between arrays and objects in JavaScript?",
      "How does the event loop work in JavaScript?",
      "What is the difference between synchronous and asynchronous code?",
      "Explain the concept of hoisting in JavaScript.",
      "What are arrow functions and how do they differ from regular functions?"
    ],
    Medium: [
      "Design a function to find the two numbers in an array that add up to a target sum (Two Sum problem).",
      "Implement a binary search algorithm.",
      "What are the different types of sorting algorithms? Explain quicksort.",
      "Design a LRU (Least Recently Used) Cache.",
      "What is the difference between REST and GraphQL APIs?",
      "Explain how you would optimize a slow database query.",
      "Design a rate limiter for an API."
    ],
    Hard: [
      "Design a scalable real-time notification system for millions of users.",
      "Implement a distributed cache system with consistency guarantees.",
      "How would you design a URL shortener like bit.ly that scales to billions of URLs?",
      "Explain how to detect and handle deadlocks in a concurrent system.",
      "Design a load balancer for a microservices architecture.",
      "Implement a consensus algorithm for a distributed system.",
      "How would you architect a system to handle stock market trading at high frequency?"
    ]
  },
  "Product Manager": {
    Easy: [
      "Tell me about a product you use daily and how you would improve it.",
      "What is your product development philosophy?",
      "How do you prioritize features in a product roadmap?",
      "Describe a time you had to make a difficult trade-off decision.",
      "What metrics would you track for a mobile app?",
      "How do you gather user feedback?",
      "What is the difference between features and benefits?"
    ],
    Medium: [
      "How would you approach building a new product from scratch?",
      "Describe your approach to competitive analysis.",
      "How do you balance short-term wins with long-term vision?",
      "Tell me about a time you failed and what you learned.",
      "How do you communicate product strategy to stakeholders?",
      "What is your approach to A/B testing?",
      "How would you measure the success of a new feature?"
    ],
    Hard: [
      "You're building a competitor to Netflix. What is your go-to-market strategy?",
      "How would you expand Uber to a completely new geographic market?",
      "Design a payment product for the unbanked population in Africa.",
      "How would you pivot a company's product strategy based on declining revenue?",
      "Describe how you would build an AI assistant product.",
      "Design a product strategy for a company facing market disruption.",
      "How would you build a social platform that competes with TikTok?"
    ]
  },
  "Data Scientist": {
    Easy: [
      "What is the difference between supervised and unsupervised learning?",
      "Explain what overfitting is and how to prevent it.",
      "What is the difference between precision and recall?",
      "Explain the bias-variance tradeoff.",
      "What are the main steps in a machine learning workflow?",
      "What is a confusion matrix and why is it useful?",
      "Explain cross-validation and why it's important."
    ],
    Medium: [
      "How would you handle missing data in a dataset?",
      "Explain gradient descent and how it works.",
      "What are the differences between various clustering algorithms?",
      "How do you select features for a machine learning model?",
      "Explain the concept of regularization (L1 and L2).",
      "How would you evaluate a time series forecasting model?",
      "What is feature engineering and why is it important?"
    ],
    Hard: [
      "Design a recommendation system for an e-commerce platform.",
      "How would you detect and prevent data drift in production ML models?",
      "Explain how to build a real-time anomaly detection system.",
      "Design a model training pipeline that scales to billions of data points.",
      "How would you handle class imbalance in a classification problem?",
      "Explain how to implement and deploy a deep learning model in production.",
      "How would you optimize a machine learning model for inference speed?"
    ]
  }
};

export const FALLBACK_FEEDBACK = {
  communicationSkills: 72,
  technicalKnowledge: 68,
  problemSolving: 75,
  culturalFit: 70,
  confidenceClarity: 73,
  totalScore: 72,
  strengths: [
    "Clear articulation of thoughts and ideas",
    "Good problem-solving approach with structured thinking",
    "Able to ask clarifying questions when needed"
  ],
  areasForImprovement: [
    "Could provide more specific examples from past projects",
    "Should dive deeper into implementation details",
    "Practice explaining trade-offs between different approaches"
  ],
  finalAssessment: "Solid candidate with room for growth. Shows promise in technical fundamentals and communication skills. Continue to work on depth of technical knowledge and real-world project experience."
};

export const FALLBACK_MOCK_TEST_QUESTIONS = [
  {
    question: "Given an array of integers, write a function to find two numbers that add up to a specific target. Return their indices.",
    expectedAnswer: "Use a hash map to store values and their indices. For each number, check if (target - number) exists in the map. Time complexity: O(n), Space: O(n)",
    tips: [
      "Use a hash map for O(1) lookups",
      "Store values as you iterate through the array",
      "Handle edge cases like duplicate numbers or negative values"
    ],
    difficulty: "Medium"
  },
  {
    question: "Explain the difference between process and thread, and when you would use each.",
    expectedAnswer: "Processes are independent with separate memory spaces, while threads share memory within a process. Use processes for isolation, threads for shared state and lighter-weight concurrency.",
    tips: [
      "Discuss memory isolation benefits of processes",
      "Explain context switching overhead differences",
      "Consider thread safety and synchronization challenges"
    ],
    difficulty: "Medium"
  },
  {
    question: "Design a system to count page views for millions of concurrent users.",
    expectedAnswer: "Use distributed counting with eventual consistency. Implement write-through cache with batch writes to database. Use partitioning for scalability.",
    tips: [
      "Consider using Redis for real-time counting",
      "Implement batching to reduce database writes",
      "Use sharding/partitioning for horizontal scaling"
    ],
    difficulty: "Hard"
  }
];
