// AI Buddy Question Fetcher
// Filters questions from the question bank based on selected topics

import { QUESTION_BANK } from '@/constants/questionBank';
import { HUNDRED_DAYS_DSA } from '@/constants/hundredDaysOfCode';

/**
 * Map user-friendly topics to actual question bank topics
 */
const TOPIC_MAPPING = {
  'dsa': ['Array', 'Matrix', 'String', 'LinkedList', 'Stack', 'Queue', 'Heap', 'Tree', 'Graph', 'DP', 'Greedy', 'Backtracking', 'BitManipulation', 'Searching', 'Sorting'],
  'system design': ['Design', 'System', 'Architecture', 'Scalability'],
  'oop': ['OOP', 'Object', 'Class', 'Design Pattern'],
  'databases': ['Database', 'SQL', 'NoSQL'],
  'api design': ['API', 'REST', 'GraphQL'],
  'testing': ['Testing', 'Unit Test', 'Integration Test'],
  'security': ['Security', 'Encryption'],
  'scalability': ['Scalability', 'Performance', 'Optimization'],
  'performance': ['Performance', 'Optimization', 'Cache'],
  'code review': ['Code', 'Review', 'Best Practice'],
  'behavioral': ['Interview', 'Behavioral', 'Communication'],
  'sql': ['SQL', 'Database', 'Query'],
  'react / js': ['JavaScript', 'React', 'Frontend'],
  'hr round': ['HR', 'Behavioral', 'Soft Skills'],
  'leadership': ['Leadership', 'Management'],
  'case study': ['Case', 'Study', 'Analysis'],
  'negotiation': ['Negotiation', 'Salary'],
};

/**
 * Get all questions from the question bank with all topics
 */
const getAllQuestions = () => {
  const allQuestions = [];
  
  // Get from HUNDRED_DAYS_DSA
  if (HUNDRED_DAYS_DSA && typeof HUNDRED_DAYS_DSA === 'object') {
    Object.values(HUNDRED_DAYS_DSA).forEach(dayData => {
      if (dayData.questions && Array.isArray(dayData.questions)) {
        dayData.questions.forEach(q => {
          allQuestions.push({
            id: q.id || `q-${Math.random()}`,
            title: q.title || 'Untitled Question',
            difficulty: q.difficulty || 'Medium',
            topic: q.topic || 'General',
            description: q.description || q.title || 'No description',
            source: 'dsa',
            complexity: q.complexity || { time: 'O(n)', space: 'O(1)' },
            problemStatementUrl: q.problemStatementUrl,
            leetcodeUrl: q.leetcodeUrl,
          });
        });
      }
    });
  }

  // Get from QUESTION_BANK if not already covered
  if (QUESTION_BANK && typeof QUESTION_BANK === 'object') {
    Object.entries(QUESTION_BANK).forEach(([key, category]) => {
      if (category.questions && Array.isArray(category.questions)) {
        category.questions.forEach((q, idx) => {
          if (typeof q === 'string') {
            // Simple string question
            allQuestions.push({
              id: `general-${key}-${idx}`,
              title: q,
              difficulty: 'Easy',
              topic: category.title || 'General',
              description: q,
              source: 'general',
              complexity: null,
            });
          }
        });
      }
    });
  }

  return allQuestions;
};

/**
 * Get questions filtered by user-selected topics
 */
export const getQuestionsByTopics = (userTopics = [], limit = 10) => {
  if (!userTopics || userTopics.length === 0) {
    return getDefaultQuestions(limit);
  }

  const allQuestions = getAllQuestions();
  const matchedQuestions = [];
  
  // Normalize user topics
  const normalizedUserTopics = userTopics.map(t => { 
    if (typeof t === 'string') return t.toLowerCase().trim();
    return '';
  }).filter(t => t);

  // Map to question bank topics
  const targetTopics = new Set();
  normalizedUserTopics.forEach(userTopic => {
    const mapped = TOPIC_MAPPING[userTopic];
    if (mapped && Array.isArray(mapped)) {
      mapped.forEach(t => targetTopics.add(t.toLowerCase()));
    }
    // Also add the user topic itself as a fallback
    targetTopics.add(userTopic);
  });

  // Filter questions by matching topics
  allQuestions.forEach(q => {
    if (matchedQuestions.length >= limit) return;
    
    const qTopic = q.topic?.toLowerCase() || '';
    let isMatch = false;

    // Check if question topic matches any target topic
    for (let targetTopic of targetTopics) {
      if (qTopic.includes(targetTopic) || targetTopic.includes(qTopic)) {
        isMatch = true;
        break;
      }
    }

    if (isMatch) {
      matchedQuestions.push(q);
    }
  });

  return matchedQuestions.length > 0 ? matchedQuestions : getDefaultQuestions(limit);
};

/**
 * Get default questions when no topics match
 */
export const getDefaultQuestions = (limit = 5) => {
  const allQuestions = getAllQuestions();
  
  // Get diverse questions
  const easy = allQuestions.filter(q => q.difficulty === 'Easy').slice(0, 2);
  const medium = allQuestions.filter(q => q.difficulty === 'Medium').slice(0, 2);
  const hard = allQuestions.filter(q => q.difficulty === 'Hard').slice(0, 1);

  return [...easy, ...medium, ...hard].slice(0, limit);
};

/**
 * Get interview questions for AI Buddy session
 */
export const getInterviewQuestions = (userTopics = [], difficulty = 'medium', questionCount = 5) => {
  let questions = getQuestionsByTopics(userTopics, questionCount * 3);

  // Filter by difficulty if specified
  if (difficulty && difficulty !== 'all') {
    const difficultyNorm = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    const filtered = questions.filter(q => q.difficulty === difficultyNorm);
    if (filtered.length > 0) {
      questions = filtered;
    }
  }

  return questions.slice(0, questionCount);
};

/**
 * Get random question by topic
 */
export const getRandomQuestionByTopic = (userTopics = []) => {
  const questions = getQuestionsByTopics(userTopics, 100);
  if (questions.length === 0) {
    return getDefaultQuestions(1)[0];
  }
  return questions[Math.floor(Math.random() * questions.length)];
};

/**
 * Text-to-speech for questions
 */
export const speakQuestion = (question) => {
  if (!question) return;

  // Check browser support
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const text = `${question.title}. ${question.description}`;
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = 1; // Speech rate
    utterance.pitch = 1; // Pitch
    utterance.volume = 1; // Volume
    utterance.lang = 'en-US'; // Language

    speechSynthesis.speak(utterance);
  } else {
    console.warn('Text-to-speech not supported in this browser');
  }
};

/**
 * Stop speech
 */
export const stopSpeech = () => {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
};

/**
 * Get all available topics
 */
export const getAvailableTopics = () => {
  return Object.keys(TOPIC_MAPPING);
};

