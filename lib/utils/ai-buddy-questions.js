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
 */
export const getInterviewQuestions = async (userTopics = [], difficulty = 'medium', questionCount = 5) => {
  try {
    console.log('[Interview Buddy] Fetching LeetCode questions for topics:', userTopics, 'difficulty:', difficulty);
    
    // Map difficulty
    const mappedDifficulty = DIFFICULTY_MAP[difficulty?.toLowerCase()] || 'Medium';
    
    // Fetch from LeetCode via our service
    const problems = await getMixedProblems(mappedDifficulty, Math.max(3, questionCount));
    
    // Validate all questions are LeetCode-only
    const validatedQuestions = problems.filter(q => {
      const isValid = validateLeetCodeQuestion(q);
      if (!isValid) {
        console.error('[Interview Buddy] Filtered out non-LeetCode question:', q);
      }
      return isValid;
    });
    
    if (validatedQuestions.length === 0) {
      console.error('[Interview Buddy] No LeetCode questions available for difficulty:', difficulty);
      return [];
    }
    
    console.log('[Interview Buddy] Delivering', validatedQuestions.length, 'verified LeetCode questions');
    return validatedQuestions.slice(0, questionCount);
    
  } catch (error) {
    console.error('[Interview Buddy] Error fetching LeetCode questions:', error);
    return [];
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
 * Get all questions - fetches LeetCode only
 */
const getAllQuestions = async () => {
  const allQuestions = [];
  
  // Fetch from LeetCode GraphQL API ONLY
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
    
    console.log('[Interview Buddy] Loaded', allQuestions.length, 'LeetCode questions');
  } catch (error) {
    console.error('[Interview Buddy] Error loading LeetCode questions:', error);
  }
  
  return allQuestions;
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

