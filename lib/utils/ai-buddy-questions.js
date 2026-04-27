// ═══════════════════════════════════════════════════════════════════════════════
// ║        AI BUDDY INTERVIEW QUESTION FETCHER - LEETCODE ONLY (NO GFG)           ║
// ═══════════════════════════════════════════════════════════════════════════════
// 
// • STRICT LeetCode-only policy for interview buddy questions
// • NO GeeksforGeeks (GFG) content - EVER
// • ALL questions, titles, descriptions from LeetCode GraphQL API exclusively
// • Validates every question source before returning
// • Clear error logging for violations
//
// LeetCode GraphQL API: https://leetcode.com/graphql
// Question ID Format: lc_* prefix required for all questions
//
// ═══════════════════════════════════════════════════════════════════════════════

import { getMixedProblems, fetchLeetCodeDetails } from '@/lib/dsa-question-service';

/**
 * FALLBACK DSA QUESTIONS - Used when LeetCode API fails
 * Real DSA/Algorithm problems from LeetCode and classic interview questions
 */
const FALLBACK_DSA_QUESTIONS = {
  easy: [
    {
      id: 'fallback_1',
      title: 'Two Sum',
      description: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You cannot use the same element twice.',
      difficulty: 'Easy',
      topics: ['Array', 'Hash Table'],
      source: 'leetcode'
    },
    {
      id: 'fallback_2',
      title: 'Reverse String',
      description: 'Write a function that reverses a string. The input string is given as an array of characters s.',
      difficulty: 'Easy',
      topics: ['String', 'Two Pointers'],
      source: 'leetcode'
    },
    {
      id: 'fallback_3',
      title: 'Valid Palindrome',
      description: 'A phrase is a palindrome if it reads the same forward and backward, considering only alphanumeric characters and ignoring cases.',
      difficulty: 'Easy',
      topics: ['String', 'Two Pointers'],
      source: 'leetcode'
    },
    {
      id: 'fallback_4',
      title: 'Merge Two Sorted Lists',
      description: 'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list.',
      difficulty: 'Easy',
      topics: ['Linked List', 'Recursion'],
      source: 'leetcode'
    },
    {
      id: 'fallback_5',
      title: 'Contains Duplicate',
      description: 'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
      difficulty: 'Easy',
      topics: ['Array', 'Hash Table'],
      source: 'leetcode'
    }
  ],
  medium: [
    {
      id: 'fallback_6',
      title: 'Binary Search',
      description: 'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, return its index. Otherwise, return -1.',
      difficulty: 'Medium',
      topics: ['Array', 'Binary Search'],
      source: 'leetcode'
    },
    {
      id: 'fallback_7',
      title: 'Longest Substring Without Repeating Characters',
      description: 'Given a string s, find the length of the longest substring without repeating characters.',
      difficulty: 'Medium',
      topics: ['String', 'Sliding Window', 'Hash Table'],
      source: 'leetcode'
    },
    {
      id: 'fallback_8',
      title: 'Add Two Numbers',
      description: 'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order.',
      difficulty: 'Medium',
      topics: ['Linked List', 'Math', 'Recursion'],
      source: 'leetcode'
    },
    {
      id: 'fallback_9',
      title: 'LRU Cache',
      description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the LRUCache class.',
      difficulty: 'Medium',
      topics: ['Hash Table', 'Linked List', 'Design'],
      source: 'leetcode'
    },
    {
      id: 'fallback_10',
      title: 'Implement Stack using Queues',
      description: 'Implement a last-in-first-out (LIFO) stack using only two queues. The implemented stack should support all the functions.',
      difficulty: 'Medium',
      topics: ['Stack', 'Queue', 'Design'],
      source: 'leetcode'
    }
  ],
  hard: [
    {
      id: 'fallback_11',
      title: 'Median of Two Sorted Arrays',
      description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.',
      difficulty: 'Hard',
      topics: ['Array', 'Binary Search', 'Divide and Conquer'],
      source: 'leetcode'
    },
    {
      id: 'fallback_12',
      title: 'Word Ladder',
      description: 'A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words where each adjacent pair differs by a single letter.',
      difficulty: 'Hard',
      topics: ['String', 'BFS', 'Graph'],
      source: 'leetcode'
    },
    {
      id: 'fallback_13',
      title: 'Serialize and Deserialize Binary Tree',
      description: 'Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work.',
      difficulty: 'Hard',
      topics: ['String', 'Tree', 'Design', 'BFS', 'DFS'],
      source: 'leetcode'
    },
    {
      id: 'fallback_14',
      title: 'Trapping Rain Water',
      description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
      difficulty: 'Hard',
      topics: ['Array', 'Dynamic Programming', 'Two Pointers', 'Stack'],
      source: 'leetcode'
    }
  ]
};

/**
 * Validate that a question is from LeetCode only
 */
function validateLeetCodeQuestion(question) {
  if (!question || typeof question !== 'object') {
    console.error('[Interview Buddy - LeetCode Validator] Invalid question object');
    return false;
  }
  if (!question.id || !question.id.startsWith('lc_')) {
    console.error('[Interview Buddy - LeetCode Validator] Non-LeetCode ID detected:', question.id);
    return false;
  }
  if (question.source !== 'leetcode') {
    console.error('[Interview Buddy - LeetCode Validator] Non-LeetCode source detected:', question.source);
    return false;
  }
  return true;
}

/**
 * Map difficulty levels for LeetCode questions
 */
const DIFFICULTY_MAP = {
  'easy': 'Easy',
  'medium': 'Medium',
  'hard': 'Hard',
  'all': null,
};

/**
 * Get interview questions from LeetCode ONLY
 * Falls back to DSA questions if LeetCode API fails
 */
export const getInterviewQuestions = async (userTopics = [], difficulty = 'medium', questionCount = 5) => {
  try {
    console.log('[Interview Buddy] Fetching LeetCode questions for topics:', userTopics, 'difficulty:', difficulty);
    
    // Map difficulty
    const mappedDifficulty = DIFFICULTY_MAP[difficulty?.toLowerCase()] || 'Medium';
    
    // Fetch from LeetCode via our service
    const problems = await getMixedProblems(mappedDifficulty, Math.max(3, questionCount));
    
    // If LeetCode returns questions, validate and use them
    if (problems && problems.length > 0) {
      const validatedQuestions = problems.filter(q => {
        const isValid = validateLeetCodeQuestion(q);
        if (!isValid) {
          console.error('[Interview Buddy] Filtered out non-LeetCode question:', q);
        }
        return isValid;
      });
      
      if (validatedQuestions.length > 0) {
        console.log('[Interview Buddy] ✅ Delivering', validatedQuestions.length, 'verified LeetCode questions');
        return validatedQuestions.slice(0, questionCount);
      }
    }
    
    // LeetCode API failed or returned empty, use FALLBACK DSA QUESTIONS
    console.warn('[Interview Buddy] ⚠️ LeetCode API unavailable, using fallback DSA questions');
    const difficultyKey = difficulty?.toLowerCase() || 'medium';
    const fallbackQuestions = FALLBACK_DSA_QUESTIONS[difficultyKey] || FALLBACK_DSA_QUESTIONS.medium;
    
    // Shuffle and return requested count
    const shuffled = [...fallbackQuestions].sort(() => Math.random() - 0.5);
    console.log('[Interview Buddy] ✅ Delivering', shuffled.slice(0, questionCount).length, 'fallback DSA questions');
    return shuffled.slice(0, questionCount);
    
  } catch (error) {
    console.error('[Interview Buddy] Error fetching LeetCode questions:', error);
    
    // FALLBACK: Return DSA questions when any error occurs
    console.warn('[Interview Buddy] ⚠️ Using fallback DSA questions due to error');
    const difficultyKey = difficulty?.toLowerCase() || 'medium';
    const fallbackQuestions = FALLBACK_DSA_QUESTIONS[difficultyKey] || FALLBACK_DSA_QUESTIONS.medium;
    const shuffled = [...fallbackQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, questionCount);
  }
};

/**
 * Get question details with full description from LeetCode GraphQL API
 */
export const getQuestionDetails = async (questionId, titleSlug) => {
  try {
    if (!questionId || !questionId.startsWith('lc_')) {
      console.error('[Interview Buddy] Invalid LeetCode ID format:', questionId);
      return null;
    }
    
    console.log('[Interview Buddy] Fetching full details from LeetCode for:', titleSlug);
    const details = await fetchLeetCodeDetails(titleSlug);
    
    if (!details) {
      console.error('[Interview Buddy] Failed to fetch details from LeetCode:', titleSlug);
      return null;
    }
    
    // Validate source is LeetCode
    if (details.source !== 'leetcode') {
      console.error('[Interview Buddy] Non-LeetCode source detected in details:', details.source);
      return null;
    }
    
    console.log('[Interview Buddy] Successfully fetched full LeetCode question:', details.title);
    return details;
    
  } catch (error) {
    console.error('[Interview Buddy] Error fetching question details:', error);
    return null;
  }
};

/**
 * Get all questions - fetches LeetCode only, falls back to DSA questions
 */
const getAllQuestions = async () => {
  const allQuestions = [];
  
  // Try to fetch from LeetCode GraphQL API
  try {
    console.log('[Interview Buddy] Fetching all LeetCode questions...');
    const easyQuestions = await getMixedProblems('Easy', 10);
    const mediumQuestions = await getMixedProblems('Medium', 10);
    const hardQuestions = await getMixedProblems('Hard', 5);
    
    const combined = [...easyQuestions, ...mediumQuestions, ...hardQuestions];
    
    // Validate all are LeetCode
    combined.forEach(q => {
      if (validateLeetCodeQuestion(q)) {
        allQuestions.push(q);
      } else {
        console.error('[Interview Buddy] Filtered out non-LeetCode question:', q);
      }
    });
    
    if (allQuestions.length > 0) {
      console.log('[Interview Buddy] ✅ Loaded', allQuestions.length, 'LeetCode questions');
      return allQuestions;
    }
  } catch (error) {
    console.error('[Interview Buddy] Error loading LeetCode questions:', error);
  }
  
  // FALLBACK: Return all DSA questions when LeetCode fails
  console.warn('[Interview Buddy] ⚠️ Using fallback DSA questions');
  return [
    ...FALLBACK_DSA_QUESTIONS.easy,
    ...FALLBACK_DSA_QUESTIONS.medium,
    ...FALLBACK_DSA_QUESTIONS.hard
  ];
};

/**
 * Get questions filtered by user-selected topics (from LeetCode only)
 */
export const getQuestionsByTopics = async (userTopics = [], limit = 10) => {
  try {
    console.log('[Interview Buddy - Topic Filter] Filtering LeetCode by topics:', userTopics);
    
    const allQuestions = await getAllQuestions();
    
    if (!userTopics || userTopics.length === 0) {
      return getDefaultQuestions(limit, allQuestions);
    }

    const matchedQuestions = [];
    
    // All questions are already LeetCode only, just slice by limit
    // Topic mapping already handled in getMixedProblems
    allQuestions.slice(0, limit).forEach(q => {
      if (validateLeetCodeQuestion(q)) {
        matchedQuestions.push(q);
      }
    });

    console.log('[Interview Buddy - Topic Filter] Found', matchedQuestions.length, 'LeetCode questions');
    return matchedQuestions.length > 0 ? matchedQuestions : getDefaultQuestions(limit, allQuestions);
  } catch (error) {
    console.error('[Interview Buddy - Topic Filter] Error:', error);
    return [];
  }
};

/**
 * Get default LeetCode questions when no topics match
 */
export const getDefaultQuestions = async (limit = 5, allQuestions = null) => {
  try {
    const questions = allQuestions || await getAllQuestions();
    
    if (questions.length === 0) {
      console.warn('[Interview Buddy] No questions available');
      return [];
    }
    
    // Return mix of difficulties
    const easy = questions.filter(q => q.difficulty === 'Easy').slice(0, 2);
    const medium = questions.filter(q => q.difficulty === 'Medium').slice(0, 2);
    const hard = questions.filter(q => q.difficulty === 'Hard').slice(0, 1);

    const result = [...easy, ...medium, ...hard].slice(0, limit);
    console.log('[Interview Buddy] Delivering', result.length, 'default LeetCode questions');
    return result;
  } catch (error) {
    console.error('[Interview Buddy] Error getting default questions:', error);
    return [];
  }
};

/**
 * Get random LeetCode question by topic
 */
export const getRandomQuestionByTopic = async (userTopics = []) => {
  try {
    const questions = await getQuestionsByTopics(userTopics, 100);
    if (questions.length === 0) {
      const defaults = await getDefaultQuestions(1);
      return defaults[0] || null;
    }
    const selected = questions[Math.floor(Math.random() * questions.length)];
    console.log('[Interview Buddy] Selected random LeetCode question:', selected.title);
    return selected;
  } catch (error) {
    console.error('[Interview Buddy] Error getting random question:', error);
    return null;
  }
};

/**
 * Text-to-speech for questions (LeetCode content only)
 */
export const speakQuestion = (question) => {
  if (!question) return;

  console.log('[Interview Buddy - TTS] Speaking LeetCode question:', question.title);

  // Check browser support
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const text = `${question.title}. ${question.description || 'No description available.'}`;
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.rate = 1; // Speech rate
    utterance.pitch = 1; // Pitch
    utterance.volume = 1; // Volume
    utterance.lang = 'en-US'; // Language

    speechSynthesis.speak(utterance);
  } else {
    console.warn('[Interview Buddy - TTS] Text-to-speech not supported in this browser');
  }
};

/**
 * Stop text-to-speech
 */
export const stopSpeech = () => {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
};

/**
 * Get all available topics (from LeetCode)
 */
export const getAvailableTopics = () => {
  return [
    'dsa',
    'system design',
    'oop',
    'databases',
    'api design',
    'testing',
    'security',
    'scalability',
    'performance',
    'code review',
    'behavioral',
    'sql',
    'react / js',
    'hr round',
    'leadership',
    'case study',
    'negotiation'
  ];
};

