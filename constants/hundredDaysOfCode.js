// 100 Days of Code - DSA Questions Database
// Contains 3-4 DSA questions for each day with difficulty, links, and solutions

export const HUNDRED_DAYS_DSA = {
  day1: {
    day: 1,
    title: "Day 1",
    topics: ["Array"],
    questions: [
      {
        id: "q1-1",
        title: "Two Sum",
        difficulty: "Easy",
        topic: "Array, Hash Map",
        description: "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume that each input has exactly one solution, and you may not use the same element twice.",
        leetcodeUrl: "https://leetcode.com/problems/two-sum/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/1",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
          Python: `def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []`,
          Java: `public int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> map = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n        int complement = target - nums[i];\n        if (map.containsKey(complement)) {\n            return new int[] { map.get(complement), i };\n        }\n        map.put(nums[i], i);\n    }\n    return new int[]{};\n}`,
          "C++": `vector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> map;\n    for (int i = 0; i < nums.size(); i++) {\n        int complement = target - nums[i];\n        if (map.find(complement) != map.end()) {\n            return {map[complement], i};\n        }\n        map[nums[i]] = i;\n    }\n    return {};\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(n)"
        }
      },
      {
        id: "q1-2",
        title: "Best Time to Buy and Sell Stock",
        difficulty: "Easy",
        topic: "Array, Dynamic Programming",
        description: "You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction.",
        leetcodeUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/2",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function maxProfit(prices) {\n  let minPrice = prices[0];\n  let maxProfit = 0;\n  for (let i = 1; i < prices.length; i++) {\n    const profit = prices[i] - minPrice;\n    maxProfit = Math.max(maxProfit, profit);\n    minPrice = Math.min(minPrice, prices[i]);\n  }\n  return maxProfit;\n}`,
          Python: `def maxProfit(prices):\n    min_price = prices[0]\n    max_profit = 0\n    for price in prices[1:]:\n        profit = price - min_price\n        max_profit = max(max_profit, profit)\n        min_price = min(min_price, price)\n    return max_profit`,
          Java: `public int maxProfit(int[] prices) {\n    int minPrice = prices[0];\n    int maxProfit = 0;\n    for (int i = 1; i < prices.length; i++) {\n        int profit = prices[i] - minPrice;\n        maxProfit = Math.max(maxProfit, profit);\n        minPrice = Math.min(minPrice, prices[i]);\n    }\n    return maxProfit;\n}`,
          "C++": `int maxProfit(vector<int>& prices) {\n    int minPrice = prices[0];\n    int maxProfit = 0;\n    for (int i = 1; i < prices.size(); i++) {\n        int profit = prices[i] - minPrice;\n        maxProfit = max(maxProfit, profit);\n        minPrice = min(minPrice, prices[i]);\n    }\n    return maxProfit;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      },
      {
        id: "q1-3",
        title: "Contains Duplicate",
        difficulty: "Easy",
        topic: "Array, Hash Set",
        description: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
        leetcodeUrl: "https://leetcode.com/problems/contains-duplicate/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/3",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function containsDuplicate(nums) {\n  return new Set(nums).size !== nums.length;\n}`,
          Python: `def containsDuplicate(nums):\n    return len(nums) != len(set(nums))`,
          Java: `public boolean containsDuplicate(int[] nums) {\n    Set<Integer> seen = new HashSet<>();\n    for (int num : nums) {\n        if (seen.contains(num)) return true;\n        seen.add(num);\n    }\n    return false;\n}`,
          "C++": `bool containsDuplicate(vector<int>& nums) {\n    unordered_set<int> seen;\n    for (int num : nums) {\n        if (seen.count(num)) return true;\n        seen.insert(num);\n    }\n    return false;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(n)"
        }
      },
      {
        id: "q1-4",
        title: "Valid Anagram",
        difficulty: "Easy",
        topic: "String, Hash Map",
        description: "Given two strings s and t, return true if t is an anagram of s, and false otherwise. An anagram is a word formed by rearranging the letters of a different word, typically using all the original letters exactly once.",
        leetcodeUrl: "https://leetcode.com/problems/valid-anagram/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/4",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  const map = {};\n  for (let char of s) {\n    map[char] = (map[char] || 0) + 1;\n  }\n  for (let char of t) {\n    if (!map[char]) return false;\n    map[char]--;\n  }\n  return true;\n}`,
          Python: `def isAnagram(s, t):\n    if len(s) != len(t):\n        return False\n    return sorted(s) == sorted(t)`,
          Java: `public boolean isAnagram(String s, String t) {\n    if (s.length() != t.length()) return false;\n    char[] sArray = s.toCharArray();\n    char[] tArray = t.toCharArray();\n    Arrays.sort(sArray);\n    Arrays.sort(tArray);\n    return Arrays.equals(sArray, tArray);\n}`,
          "C++": `bool isAnagram(string s, string t) {\n    if (s.length() != t.length()) return false;\n    sort(s.begin(), s.end());\n    sort(t.begin(), t.end());\n    return s == t;\n}`
        },
        complexity: {
          time: "O(n log n)",
          space: "O(1)"
        }
      }
    ]
  },
  day2: {
    day: 2,
    title: "Day 2",
    topics: ["Array", "Sorting"],
    questions: [
      {
        id: "q2-1",
        title: "Valid Palindrome",
        difficulty: "Easy",
        topic: "String, Two Pointers",
        description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
        leetcodeUrl: "https://leetcode.com/problems/valid-palindrome/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/5",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function isPalindrome(s) {\n  const filtered = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return filtered === filtered.split('').reverse().join('');\n}`,
          Python: `def isPalindrome(s):\n    filtered = ''.join(c.lower() for c in s if c.isalnum())\n    return filtered == filtered[::-1]`,
          Java: `public boolean isPalindrome(String s) {\n    String filtered = s.toLowerCase().replaceAll("[^a-z0-9]", "");\n    int left = 0, right = filtered.length() - 1;\n    while (left < right) {\n        if (filtered.charAt(left) != filtered.charAt(right)) return false;\n        left++;\n        right--;\n    }\n    return true;\n}`,
          "C++": `bool isPalindrome(string s) {\n    string filtered;\n    for (char c : s) {\n        if (isalnum(c)) filtered += tolower(c);\n    }\n    int left = 0, right = filtered.length() - 1;\n    while (left < right) {\n        if (filtered[left] != filtered[right]) return false;\n        left++;\n        right--;\n    }\n    return true;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(n)"
        }
      },
      {
        id: "q2-2",
        title: "Product of Array Except Self",
        difficulty: "Medium",
        topic: "Array",
        description: "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. You must write an algorithm that runs in O(n) time and without using the division operation.",
        leetcodeUrl: "https://leetcode.com/problems/product-of-array-except-self/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/6",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function productExceptSelf(nums) {\n  const result = new Array(nums.length).fill(1);\n  let prefix = 1;\n  for (let i = 0; i < nums.length; i++) {\n    result[i] = prefix;\n    prefix *= nums[i];\n  }\n  let suffix = 1;\n  for (let i = nums.length - 1; i >= 0; i--) {\n    result[i] *= suffix;\n    suffix *= nums[i];\n  }\n  return result;\n}`,
          Python: `def productExceptSelf(nums):\n    result = [1] * len(nums)\n    prefix = 1\n    for i in range(len(nums)):\n        result[i] = prefix\n        prefix *= nums[i]\n    suffix = 1\n    for i in range(len(nums) - 1, -1, -1):\n        result[i] *= suffix\n        suffix *= nums[i]\n    return result`,
          Java: `public int[] productExceptSelf(int[] nums) {\n    int[] result = new int[nums.length];\n    int prefix = 1;\n    for (int i = 0; i < nums.length; i++) {\n        result[i] = prefix;\n        prefix *= nums[i];\n    }\n    int suffix = 1;\n    for (int i = nums.length - 1; i >= 0; i--) {\n        result[i] *= suffix;\n        suffix *= nums[i];\n    }\n    return result;\n}`,
          "C++": `vector<int> productExceptSelf(vector<int>& nums) {\n    vector<int> result(nums.size(), 1);\n    int prefix = 1;\n    for (int i = 0; i < nums.size(); i++) {\n        result[i] = prefix;\n        prefix *= nums[i];\n    }\n    int suffix = 1;\n    for (int i = nums.size() - 1; i >= 0; i--) {\n        result[i] *= suffix;\n        suffix *= nums[i];\n    }\n    return result;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      },
      {
        id: "q2-3",
        title: "Maximum Subarray",
        difficulty: "Medium",
        topic: "Array, Dynamic Programming",
        description: "Given an integer array nums, find the subarray with the largest sum, and return its sum. A subarray is a contiguous non-empty sequence of elements within an array.",
        leetcodeUrl: "https://leetcode.com/problems/maximum-subarray/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/7",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function maxSubArray(nums) {\n  let maxCurrent = nums[0];\n  let maxGlobal = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    maxCurrent = Math.max(nums[i], maxCurrent + nums[i]);\n    maxGlobal = Math.max(maxGlobal, maxCurrent);\n  }\n  return maxGlobal;\n}`,
          Python: `def maxSubArray(nums):\n    max_current = max_global = nums[0]\n    for i in range(1, len(nums)):\n        max_current = max(nums[i], max_current + nums[i])\n        max_global = max(max_global, max_current)\n    return max_global`,
          Java: `public int maxSubArray(int[] nums) {\n    int maxCurrent = nums[0], maxGlobal = nums[0];\n    for (int i = 1; i < nums.length; i++) {\n        maxCurrent = Math.max(nums[i], maxCurrent + nums[i]);\n        maxGlobal = Math.max(maxGlobal, maxCurrent);\n    }\n    return maxGlobal;\n}`,
          "C++": `int maxSubArray(vector<int>& nums) {\n    int maxCurrent = nums[0], maxGlobal = nums[0];\n    for (int i = 1; i < nums.size(); i++) {\n        maxCurrent = max(nums[i], maxCurrent + nums[i]);\n        maxGlobal = max(maxGlobal, maxCurrent);\n    }\n    return maxGlobal;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      }
    ]
  },
  day3: {
    day: 3,
    title: "Day 3",
    topics: ["Sorting", "Strings"],
    questions: [
      {
        id: "q3-1",
        title: "3Sum",
        difficulty: "Medium",
        topic: "Array, Two Pointers, Sorting",
        description: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. Notice that the solution set must not contain duplicate triplets.",
        leetcodeUrl: "https://leetcode.com/problems/3sum/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/8",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function threeSum(nums) {\n  nums.sort((a, b) => a - b);\n  const result = [];\n  for (let i = 0; i < nums.length - 2; i++) {\n    if (nums[i] > 0) break;\n    if (i > 0 && nums[i] === nums[i - 1]) continue;\n    let left = i + 1, right = nums.length - 1;\n    while (left < right) {\n      const sum = nums[i] + nums[left] + nums[right];\n      if (sum === 0) {\n        result.push([nums[i], nums[left], nums[right]]);\n        while (left < right && nums[left] === nums[left + 1]) left++;\n        while (left < right && nums[right] === nums[right - 1]) right--;\n        left++;\n        right--;\n      } else if (sum < 0) {\n        left++;\n      } else {\n        right--;\n      }\n    }\n  }\n  return result;\n}`,
          Python: `def threeSum(nums):\n    nums.sort()\n    result = []\n    for i in range(len(nums) - 2):\n        if nums[i] > 0:\n            break\n        if i > 0 and nums[i] == nums[i - 1]:\n            continue\n        left, right = i + 1, len(nums) - 1\n        while left < right:\n            total = nums[i] + nums[left] + nums[right]\n            if total == 0:\n                result.append([nums[i], nums[left], nums[right]])\n                while left < right and nums[left] == nums[left + 1]:\n                    left += 1\n                while left < right and nums[right] == nums[right - 1]:\n                    right -= 1\n                left += 1\n                right -= 1\n            elif total < 0:\n                left += 1\n            else:\n                right -= 1\n    return result`,
          Java: `public List<List<Integer>> threeSum(int[] nums) {\n    Arrays.sort(nums);\n    List<List<Integer>> result = new ArrayList<>();\n    for (int i = 0; i < nums.length - 2; i++) {\n        if (nums[i] > 0) break;\n        if (i > 0 && nums[i] == nums[i - 1]) continue;\n        int left = i + 1, right = nums.length - 1;\n        while (left < right) {\n            int sum = nums[i] + nums[left] + nums[right];\n            if (sum == 0) {\n                result.add(Arrays.asList(nums[i], nums[left], nums[right]));\n                while (left < right && nums[left] == nums[left + 1]) left++;\n                while (left < right && nums[right] == nums[right - 1]) right--;\n                left++;\n                right--;\n            } else if (sum < 0) {\n                left++;\n            } else {\n                right--;\n            }\n        }\n    }\n    return result;\n}`,
          "C++": `vector<vector<int>> threeSum(vector<int>& nums) {\n    sort(nums.begin(), nums.end());\n    vector<vector<int>> result;\n    for (int i = 0; i < nums.size() - 2; i++) {\n        if (nums[i] > 0) break;\n        if (i > 0 && nums[i] == nums[i - 1]) continue;\n        int left = i + 1, right = nums.size() - 1;\n        while (left < right) {\n            int sum = nums[i] + nums[left] + nums[right];\n            if (sum == 0) {\n                result.push_back({nums[i], nums[left], nums[right]});\n                while (left < right && nums[left] == nums[left + 1]) left++;\n                while (left < right && nums[right] == nums[right - 1]) right--;\n                left++;\n                right--;\n            } else if (sum < 0) {\n                left++;\n            } else {\n                right--;\n            }\n        }\n    }\n    return result;\n}`
        },
        complexity: {
          time: "O(n²)",
          space: "O(1)"
        }
      },
      {
        id: "q3-2",
        title: "Longest Substring Without Repeating Characters",
        difficulty: "Medium",
        topic: "String, Sliding Window, Hash Map",
        description: "Given a string s, find the length of the longest substring without repeating characters.",
        leetcodeUrl: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/9",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function lengthOfLongestSubstring(s) {\n  const charMap = {};\n  let maxLength = 0;\n  let left = 0;\n  for (let right = 0; right < s.length; right++) {\n    const char = s[right];\n    if (char in charMap && charMap[char] >= left) {\n      left = charMap[char] + 1;\n    }\n    charMap[char] = right;\n    maxLength = Math.max(maxLength, right - left + 1);\n  }\n  return maxLength;\n}`,
          Python: `def lengthOfLongestSubstring(s):\n    char_map = {}\n    max_length = 0\n    left = 0\n    for right in range(len(s)):\n        if s[right] in char_map and char_map[s[right]] >= left:\n            left = char_map[s[right]] + 1\n        char_map[s[right]] = right\n        max_length = max(max_length, right - left + 1)\n    return max_length`,
          Java: `public int lengthOfLongestSubstring(String s) {\n    Map<Character, Integer> charMap = new HashMap<>();\n    int maxLength = 0;\n    int left = 0;\n    for (int right = 0; right < s.length(); right++) {\n        char c = s.charAt(right);\n        if (charMap.containsKey(c) && charMap.get(c) >= left) {\n            left = charMap.get(c) + 1;\n        }\n        charMap.put(c, right);\n        maxLength = Math.max(maxLength, right - left + 1);\n    }\n    return maxLength;\n}`,
          "C++": `int lengthOfLongestSubstring(string s) {\n    unordered_map<char, int> charMap;\n    int maxLength = 0;\n    int left = 0;\n    for (int right = 0; right < s.length(); right++) {\n        if (charMap.find(s[right]) != charMap.end() && charMap[s[right]] >= left) {\n            left = charMap[s[right]] + 1;\n        }\n        charMap[s[right]] = right;\n        maxLength = max(maxLength, right - left + 1);\n    }\n    return maxLength;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(min(m, n))"
        }
      }
    ]
  }
};

// Helper function to get all days
export const getAllDays = () => {
  return Object.keys(HUNDRED_DAYS_DSA)
    .sort((a, b) => {
      const dayA = parseInt(a.replace("day", ""));
      const dayB = parseInt(b.replace("day", ""));
      return dayA - dayB;
    })
    .map(key => HUNDRED_DAYS_DSA[key]);
};

// Helper function to get day by number
export const getDayByNumber = (dayNumber) => {
  return HUNDRED_DAYS_DSA[`day${dayNumber}`];
};

// Helper function to search questions
export const searchQuestions = (query, allDays) => {
  const lowerQuery = query.toLowerCase();
  const results = [];
  
  allDays.forEach(day => {
    day.questions.forEach(question => {
      if (
        question.title.toLowerCase().includes(lowerQuery) ||
        question.description.toLowerCase().includes(lowerQuery) ||
        question.topic.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          ...question,
          day: day.day
        });
      }
    });
  });
  
  return results;
};

// Helper function to get questions by topic
export const getQuestionsByTopic = (topic, allDays) => {
  const results = [];
  
  allDays.forEach(day => {
    day.questions.forEach(question => {
      if (question.topic.toLowerCase().includes(topic.toLowerCase())) {
        results.push({
          ...question,
          day: day.day
        });
      }
    });
  });
  
  return results;
};

// Helper function to get questions by difficulty
export const getQuestionsByDifficulty = (difficulty, allDays) => {
  const results = [];
  
  allDays.forEach(day => {
    day.questions.forEach(question => {
      if (question.difficulty.toLowerCase() === difficulty.toLowerCase()) {
        results.push({
          ...question,
          day: day.day
        });
      }
    });
  });
  
  return results;
};
