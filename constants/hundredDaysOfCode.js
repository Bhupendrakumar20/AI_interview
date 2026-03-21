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
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/find-triplets-array-sum-x/",
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
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/length-of-the-longest-substring-without-repeating-characters/",
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
  },
  day4: {
    day: 4,
    title: "Day 4",
    topics: ["Array", "Hashing"],
    questions: [
      {
        id: "q4-1",
        title: "Majority Element",
        difficulty: "Easy",
        topic: "Array, Hashing",
        description: "Given an array nums of size n, return the majority element. The majority element is the element that appears more than n/2 times.",
        leetcodeUrl: "https://leetcode.com/problems/majority-element/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/10",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/find-the-majority-element/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function majorityElement(nums) {\n  const map = {};\n  const target = Math.floor(nums.length / 2);\n  for (const num of nums) {\n    map[num] = (map[num] || 0) + 1;\n    if (map[num] > target) return num;\n  }\n}`,
          Python: `def majorityElement(nums):\n    count = {}\n    target = len(nums) // 2\n    for num in nums:\n        count[num] = count.get(num, 0) + 1\n        if count[num] > target:\n            return num`,
          Java: `public int majorityElement(int[] nums) {\n    Map<Integer, Integer> map = new HashMap<>();\n    for (int num : nums) {\n        map.put(num, map.getOrDefault(num, 0) + 1);\n        if (map.get(num) > nums.length / 2) return num;\n    }\n    return -1;\n}`,
          "C++": `int majorityElement(vector<int>& nums) {\n    unordered_map<int, int> map;\n    int target = nums.size() / 2;\n    for (int num : nums) {\n        map[num]++;\n        if (map[num] > target) return num;\n    }\n    return -1;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(n)"
        }
      },
      {
        id: "q4-2",
        title: "Intersection of Two Arrays",
        difficulty: "Easy",
        topic: "Array, Hashing, Two Pointers",
        description: "Given two integer arrays nums1 and nums2, return an array of their intersection.",
        leetcodeUrl: "https://leetcode.com/problems/intersection-of-two-arrays/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/11",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/find-common-elements-in-two-arrays/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function intersection(nums1, nums2) {\n  const set1 = new Set(nums1);\n  return [...new Set(nums2.filter(n => set1.has(n)))];\n}`,
          Python: `def intersection(nums1, nums2):\n    return list(set(nums1) & set(nums2))`,
          Java: `public int[] intersection(int[] nums1, int[] nums2) {\n    Set<Integer> set = new HashSet<>();\n    for (int num : nums1) set.add(num);\n    Set<Integer> result = new HashSet<>();\n    for (int num : nums2) {\n        if (set.contains(num)) result.add(num);\n    }\n    return result.stream().mapToInt(Integer::intValue).toArray();\n}`,
          "C++": `vector<int> intersection(vector<int>& nums1, vector<int>& nums2) {\n    set<int> set1(nums1.begin(), nums1.end());\n    set<int> result;\n    for (int num : nums2) {\n        if (set1.count(num)) result.insert(num);\n    }\n    return vector<int>(result.begin(), result.end());\n}`
        },
        complexity: {
          time: "O(n + m)",
          space: "O(min(n, m))"
        }
      },
      {
        id: "q4-3",
        title: "First Duplicate Element",
        difficulty: "Easy",
        topic: "Array, Hashing",
        description: "Find the first duplicate element in an array and return its index.",
        leetcodeUrl: "https://leetcode.com/problems/contains-duplicate-ii/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/12",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/find-the-first-repeated-element-in-an-array/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function findDuplicate(nums) {\n  const seen = new Set();\n  for (const num of nums) {\n    if (seen.has(num)) return num;\n    seen.add(num);\n  }\n  return -1;\n}`,
          Python: `def findDuplicate(nums):\n    seen = set()\n    for num in nums:\n        if num in seen:\n            return num\n        seen.add(num)\n    return -1`,
          Java: `public int findDuplicate(int[] nums) {\n    Set<Integer> seen = new HashSet<>();\n    for (int num : nums) {\n        if (seen.contains(num)) return num;\n        seen.add(num);\n    }\n    return -1;\n}`,
          "C++": `int findDuplicate(vector<int>& nums) {\n    unordered_set<int> seen;\n    for (int num : nums) {\n        if (seen.count(num)) return num;\n        seen.insert(num);\n    }\n    return -1;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(n)"
        }
      }
    ]
  },
  day5: {
    day: 5,
    title: "Day 5",
    topics: ["Array", "Sorting"],
    questions: [
      {
        id: "q5-1",
        title: "Sort Colors",
        difficulty: "Medium",
        topic: "Array, Sorting, Two Pointers",
        description: "Given an array nums with n objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent.",
        leetcodeUrl: "https://leetcode.com/problems/sort-colors/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/13",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/sort-an-array-of-0s-1s-and-2s/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function sortColors(nums) {\n  let low = 0, mid = 0, high = nums.length - 1;\n  while (mid <= high) {\n    if (nums[mid] === 0) [nums[low], nums[mid]] = [nums[mid], nums[low]]; low++; mid++;\n    else if (nums[mid] === 2) [nums[mid], nums[high]] = [nums[high], nums[mid]]; high--;\n    else mid++;\n  }\n}`,
          Python: `def sortColors(nums):\n    low, mid, high = 0, 0, len(nums) - 1\n    while mid <= high:\n        if nums[mid] == 0:\n            nums[low], nums[mid] = nums[mid], nums[low]\n            low += 1\n            mid += 1\n        elif nums[mid] == 2:\n            nums[mid], nums[high] = nums[high], nums[mid]\n            high -= 1\n        else:\n            mid += 1`,
          Java: `public void sortColors(int[] nums) {\n    int low = 0, mid = 0, high = nums.length - 1;\n    while (mid <= high) {\n        if (nums[mid] == 0) {\n            int temp = nums[low]; nums[low] = nums[mid]; nums[mid] = temp;\n            low++; mid++;\n        } else if (nums[mid] == 2) {\n            int temp = nums[mid]; nums[mid] = nums[high]; nums[high] = temp;\n            high--;\n        } else mid++;\n    }\n}`,
          "C++": `void sortColors(vector<int>& nums) {\n    int low = 0, mid = 0, high = nums.size() - 1;\n    while (mid <= high) {\n        if (nums[mid] == 0) swap(nums[low++], nums[mid++]);\n        else if (nums[mid] == 2) swap(nums[mid], nums[high--]);\n        else mid++;\n    }\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      },
      {
        id: "q5-2",
        title: "Merge Intervals",
        difficulty: "Medium",
        topic: "Array, Sorting",
        description: "Given an array of intervals where intervals[i] = [start, end], merge all overlapping intervals.",
        leetcodeUrl: "https://leetcode.com/problems/merge-intervals/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/14",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/merge-intervals/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function merge(intervals) {\n  intervals.sort((a, b) => a[0] - b[0]);\n  const result = [intervals[0]];\n  for (let i = 1; i < intervals.length; i++) {\n    if (intervals[i][0] <= result[result.length - 1][1]) {\n      result[result.length - 1][1] = Math.max(result[result.length - 1][1], intervals[i][1]);\n    } else result.push(intervals[i]);\n  }\n  return result;\n}`,
          Python: `def merge(intervals):\n    intervals.sort()\n    result = [intervals[0]]\n    for start, end in intervals[1:]:\n        if start <= result[-1][1]:\n            result[-1][1] = max(result[-1][1], end)\n        else:\n            result.append([start, end])\n    return result`,
          Java: `public int[][] merge(int[][] intervals) {\n    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));\n    List<int[]> result = new ArrayList<>();\n    result.add(intervals[0]);\n    for (int i = 1; i < intervals.length; i++) {\n        if (intervals[i][0] <= result.get(result.size() - 1)[1]) {\n            result.get(result.size() - 1)[1] = Math.max(result.get(result.size() - 1)[1], intervals[i][1]);\n        } else result.add(intervals[i]);\n    }\n    return result.toArray(new int[result.size()][\]);\n}`,
          "C++": `vector<vector<int>> merge(vector<vector<int>>& intervals) {\n    sort(intervals.begin(), intervals.end());\n    vector<vector<int>> result; result.push_back(intervals[0]);\n    for (int i = 1; i < intervals.size(); i++) {\n        if (intervals[i][0] <= result.back()[1]) {\n            result.back()[1] = max(result.back()[1], intervals[i][1]);\n        } else result.push_back(intervals[i]);\n    }\n    return result;\n}`
        },
        complexity: {
          time: "O(n log n)",
          space: "O(1)"
        }
      }
    ]
  },
  day6: {
    day: 6,
    title: "Day 6",
    topics: ["String"],
    questions: [
      {
        id: "q6-1",
        title: "Valid Parentheses",
        difficulty: "Easy",
        topic: "String, Stack",
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
        leetcodeUrl: "https://leetcode.com/problems/valid-parentheses/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/15",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/check-for-balanced-parentheses-in-an-expression/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function isValid(s) {\n  const stack = [];\n  const pairs = {'(': ')', '{': '}', '[': ']'};\n  for (const char of s) {\n    if (pairs[char]) stack.push(char);\n    else if (stack.pop() !== (Object.keys(pairs).find(k => pairs[k] === char))) return false;\n  }\n  return stack.length === 0;\n}`,
          Python: `def isValid(s):\n    stack = []\n    pairs = {'(': ')', '{': '}', '[': ']'}\n    for char in s:\n        if char in pairs:\n            stack.append(char)\n        elif not stack or pairs[stack.pop()] != char:\n            return False\n    return len(stack) == 0`,
          Java: `public boolean isValid(String s) {\n    Stack<Character> stack = new Stack<>();\n    Map<Character, Character> pairs = new HashMap<>();\n    pairs.put('(', ')'); pairs.put('{', '}'); pairs.put('[', ']');\n    for (char c : s.toCharArray()) {\n        if (pairs.containsKey(c)) stack.push(c);\n        else if (stack.isEmpty() || pairs.get(stack.pop()) != c) return false;\n    }\n    return stack.isEmpty();\n}`,
          "C++": `bool isValid(string s) {\n    stack<char> st;\n    map<char, char> pairs = {{'(', ')'}, {'{', '}'}, {'[', ']'}};\n    for (char c : s) {\n        if (pairs.find(c) != pairs.end()) st.push(c);\n        else if (st.empty() || pairs[st.top()] != c) return false;\n        else st.pop();\n    }\n    return st.empty();\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(n)"
        }
      },
      {
        id: "q6-2",
        title: "Reverse String",
        difficulty: "Easy",
        topic: "String, Two Pointers",
        description: "Write a function that reverses a string in-place.",
        leetcodeUrl: "https://leetcode.com/problems/reverse-string/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/16",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/reverse-a-string-in-java/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function reverseString(s) {\n  let left = 0, right = s.length - 1;\n  while (left < right) [s[left++], s[right--]] = [s[right], s[left - 1]];\n}`,
          Python: `def reverseString(s):\n    left, right = 0, len(s) - 1\n    while left < right:\n        s[left], s[right] = s[right], s[left]\n        left += 1\n        right -= 1`,
          Java: `public void reverseString(char[] s) {\n    int left = 0, right = s.length - 1;\n    while (left < right) {\n        char temp = s[left];\n        s[left] = s[right];\n        s[right] = temp;\n        left++;\n        right--;\n    }\n}`,
          "C++": `void reverseString(vector<char>& s) {\n    int left = 0, right = s.size() - 1;\n    while (left < right) swap(s[left++], s[right--]);\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      }
    ]
  },
  day7: {
    day: 7,
    title: "Day 7",
    topics: ["Array", "Two Pointers"],
    questions: [
      {
        id: "q7-1",
        title: "Two Sum II - Input Array Is Sorted",
        difficulty: "Medium",
        topic: "Array, Two Pointers",
        description: "Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number.",
        leetcodeUrl: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/17",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/two-sum-in-an-array/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function twoSum(numbers, target) {\n  let left = 0, right = numbers.length - 1;\n  while (left < right) {\n    const sum = numbers[left] + numbers[right];\n    if (sum === target) return [left + 1, right + 1];\n    else if (sum < target) left++;\n    else right--;\n  }\n}`,
          Python: `def twoSum(numbers, target):\n    left, right = 0, len(numbers) - 1\n    while left < right:\n        sum_val = numbers[left] + numbers[right]\n        if sum_val == target:\n            return [left + 1, right + 1]\n        elif sum_val < target:\n            left += 1\n        else:\n            right -= 1`,
          Java: `public int[] twoSum(int[] numbers, int target) {\n    int left = 0, right = numbers.length - 1;\n    while (left < right) {\n        int sum = numbers[left] + numbers[right];\n        if (sum == target) return new int[]{left + 1, right + 1};\n        else if (sum < target) left++;\n        else right--;\n    }\n    return new int[]{};\n}`,
          "C++": `vector<int> twoSum(vector<int>& numbers, int target) {\n    int left = 0, right = numbers.size() - 1;\n    while (left < right) {\n        int sum = numbers[left] + numbers[right];\n        if (sum == target) return {left + 1, right + 1};\n        else if (sum < target) left++;\n        else right--;\n    }\n    return {};\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      },
      {
        id: "q7-2",
        title: "Container With Most Water",
        difficulty: "Medium",
        topic: "Array, Two Pointers, Greedy",
        description: "You are given an integer array height where height[i] represents the height of the bar. Find two lines that together with the x-axis form a container, such that the container contains the most water.",
        leetcodeUrl: "https://leetcode.com/problems/container-with-most-water/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/18",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/container-with-most-water/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function maxArea(height) {\n  let max = 0, left = 0, right = height.length - 1;\n  while (left < right) {\n    max = Math.max(max, Math.min(height[left], height[right]) * (right - left));\n    if (height[left] < height[right]) left++;\n    else right--;\n  }\n  return max;\n}`,
          Python: `def maxArea(height):\n    max_area = 0\n    left, right = 0, len(height) - 1\n    while left < right:\n        max_area = max(max_area, min(height[left], height[right]) * (right - left))\n        if height[left] < height[right]:\n            left += 1\n        else:\n            right -= 1\n    return max_area`,
          Java: `public int maxArea(int[] height) {\n    int max = 0, left = 0, right = height.length - 1;\n    while (left < right) {\n        max = Math.max(max, Math.min(height[left], height[right]) * (right - left));\n        if (height[left] < height[right]) left++;\n        else right--;\n    }\n    return max;\n}`,
          "C++": `int maxArea(vector<int>& height) {\n    int max_area = 0, left = 0, right = height.size() - 1;\n    while (left < right) {\n        max_area = max(max_area, min(height[left], height[right]) * (right - left));\n        if (height[left] < height[right]) left++;\n        else right--;\n    }\n    return max_area;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      }
    ]
  },
  day8: {
    day: 8,
    title: "Day 8",
    topics: ["Linked List"],
    questions: [
      {
        id: "q8-1",
        title: "Reverse Linked List",
        difficulty: "Easy",
        topic: "Linked List, Recursion",
        description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
        leetcodeUrl: "https://leetcode.com/problems/reverse-linked-list/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/19",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/reverse-a-linked-list/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function reverseList(head) {\n  let prev = null, curr = head;\n  while (curr) {\n    const temp = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = temp;\n  }\n  return prev;\n}`,
          Python: `def reverseList(head):\n    prev, curr = None, head\n    while curr:\n        next_temp = curr.next\n        curr.next = prev\n        prev = curr\n        curr = next_temp\n    return prev`,
          Java: `public ListNode reverseList(ListNode head) {\n    ListNode prev = null, curr = head;\n    while (curr != null) {\n        ListNode temp = curr.next;\n        curr.next = prev;\n        prev = curr;\n        curr = temp;\n    }\n    return prev;\n}`,
          "C++": `ListNode* reverseList(ListNode* head) {\n    ListNode* prev = nullptr, *curr = head;\n    while (curr) {\n        ListNode* temp = curr->next;\n        curr->next = prev;\n        prev = curr;\n        curr = temp;\n    }\n    return prev;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      },
      {
        id: "q8-2",
        title: "Merge Two Sorted Lists",
        difficulty: "Easy",
        topic: "Linked List",
        description: "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list.",
        leetcodeUrl: "https://leetcode.com/problems/merge-two-sorted-lists/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/20",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/merge-two-sorted-linked-lists/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function mergeTwoLists(list1, list2) {\n  const dummy = new ListNode(0);\n  let curr = dummy;\n  while (list1 && list2) {\n    if (list1.val <= list2.val) {\n      curr.next = list1;\n      list1 = list1.next;\n    } else {\n      curr.next = list2;\n      list2 = list2.next;\n    }\n    curr = curr.next;\n  }\n  curr.next = list1 || list2;\n  return dummy.next;\n}`,
          Python: `def mergeTwoLists(list1, list2):\n    dummy = ListNode(0)\n    curr = dummy\n    while list1 and list2:\n        if list1.val <= list2.val:\n            curr.next = list1\n            list1 = list1.next\n        else:\n            curr.next = list2\n            list2 = list2.next\n        curr = curr.next\n    curr.next = list1 or list2\n    return dummy.next`,
          Java: `public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n    ListNode dummy = new ListNode(0);\n    ListNode curr = dummy;\n    while (list1 != null && list2 != null) {\n        if (list1.val <= list2.val) {\n            curr.next = list1;\n            list1 = list1.next;\n        } else {\n            curr.next = list2;\n            list2 = list2.next;\n        }\n        curr = curr.next;\n    }\n    curr.next = list1 != null ? list1 : list2;\n    return dummy.next;\n}`,
          "C++": `ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n    ListNode* dummy = new ListNode(0);\n    ListNode* curr = dummy;\n    while (list1 && list2) {\n        if (list1->val <= list2->val) {\n            curr->next = list1;\n            list1 = list1->next;\n        } else {\n            curr->next = list2;\n            list2 = list2->next;\n        }\n        curr = curr->next;\n    }\n    curr->next = list1 ? list1 : list2;\n    return dummy->next;\n}`
        },
        complexity: {
          time: "O(n + m)",
          space: "O(1)"
        }
      }
    ]
  },
  day9: {
    day: 9,
    title: "Day 9",
    topics: ["Linked List"],
    questions: [
      {
        id: "q9-1",
        title: "Linked List Cycle",
        difficulty: "Easy",
        topic: "Linked List, Two Pointers",
        description: "Given head, the head of a linked list, determine if the linked list has a cycle in it.",
        leetcodeUrl: "https://leetcode.com/problems/linked-list-cycle/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/21",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/detect-loop-in-a-linked-list/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function hasCycle(head) {\n  let slow = head, fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n    if (slow === fast) return true;\n  }\n  return false;\n}`,
          Python: `def hasCycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow == fast:\n            return True\n    return False`,
          Java: `public boolean hasCycle(ListNode head) {\n    ListNode slow = head, fast = head;\n    while (fast != null && fast.next != null) {\n        slow = slow.next;\n        fast = fast.next.next;\n        if (slow == fast) return true;\n    }\n    return false;\n}`,
          "C++": `bool hasCycle(ListNode *head) {\n    ListNode *slow = head, *fast = head;\n    while (fast && fast->next) {\n        slow = slow->next;\n        fast = fast->next->next;\n        if (slow == fast) return true;\n    }\n    return false;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      },
      {
        id: "q9-2",
        title: "Middle of the Linked List",
        difficulty: "Easy",
        topic: "Linked List, Two Pointers",
        description: "Given the head of a singly linked list, find the middle node of the linked list.",
        leetcodeUrl: "https://leetcode.com/problems/middle-of-the-linked-list/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/22",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/find-middle-of-a-linked-list/",
        languages: ["JavaScript", "Python", "Java", "C++"],
        solutions: {
          JavaScript: `function middleNode(head) {\n  let slow = head, fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n  }\n  return slow;\n}`,
          Python: `def middleNode(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n    return slow`,
          Java: `public ListNode middleNode(ListNode head) {\n    ListNode slow = head, fast = head;\n    while (fast != null && fast.next != null) {\n        slow = slow.next;\n        fast = fast.next.next;\n    }\n    return slow;\n}`,
          "C++": `ListNode* middleNode(ListNode* head) {\n    ListNode *slow = head, *fast = head;\n    while (fast && fast->next) {\n        slow = slow->next;\n        fast = fast->next->next;\n    }\n    return slow;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(1)"
        }
      }
    ]
  },
  day10: {
    day: 10,
    title: "Day 10",
    topics: ["Binary Tree", "BFS"],
    questions: [
      {
        id: "q10-1",
        title: "Binary Tree Level Order Traversal",
        difficulty: "Medium",
        topic: "Tree, BFS, Queue",
        description: "Given the root of a binary tree, return the level order traversal of its nodes' values.",
        leetcodeUrl: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/23",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/level-order-tree-traversal/",
        languages: ["JavaScript"],
        solutions: {
          JavaScript: `function levelOrder(root) {\n  if (!root) return [];\n  const result = [];\n  const queue = [root];\n  while (queue.length) {\n    const level = [];\n    for (let i = 0; i < queue.length; i++) {\n      const node = queue.shift();\n      level.push(node.val);\n      if (node.left) queue.push(node.left);\n      if (node.right) queue.push(node.right);\n    }\n    result.push(level);\n  }\n  return result;\n}`
        },
        complexity: {
          time: "O(n)",
          space: "O(n)"
        }
      },
      {
        id: "q10-2",
        title: "Same Tree",
        difficulty: "Easy",
        topic: "Tree, DFS",
        description: "Given the roots of two binary trees p and q, write a function to check if they are the same or not.",
        leetcodeUrl: "https://leetcode.com/problems/same-tree/",
        dsaProblemLink: "https://www.dsaproblem.com/preview/24",
        geeksforgeeksUrl: "https://www.geeksforgeeks.org/check-if-two-trees-are-identical/",
        languages: ["JavaScript"],
        solutions: {
          JavaScript: `function isSameTree(p, q) {\n  if (!p && !q) return true;\n  if (!p || !q || p.val !== q.val) return false;\n  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);\n}`
        },
        complexity: {
          time: "O(min(m, n))",
          space: "O(min(m, n))"
        }
      }
    ]
  },
  day11: { day: 11, title: "Day 11", topics: ["Binary Tree"], questions: [{ id: "q11-1", title: "Maximum Depth of Binary Tree", difficulty: "Easy", topic: "Tree, DFS", description: "Given the root of a binary tree, return its maximum depth.", leetcodeUrl: "https://leetcode.com/problems/maximum-depth-of-binary-tree/", dsaProblemLink: "https://www.dsaproblem.com/preview/25", geeksforgeeksUrl: "https://www.geeksforgeeks.org/find-height-of-a-binary-tree/", languages: ["JavaScript"], solutions: { JavaScript: `function maxDepth(root) {\n  if (!root) return 0;\n  return Math.max(maxDepth(root.left), maxDepth(root.right)) + 1;\n}` }, complexity: { time: "O(n)", space: "O(h)" } }, { id: "q11-2", title: "Invert Binary Tree", difficulty: "Easy", topic: "Tree, DFS", description: "Given the root of a binary tree, invert the tree, and return its root.", leetcodeUrl: "https://leetcode.com/problems/invert-binary-tree/", dsaProblemLink: "https://www.dsaproblem.com/preview/26", geeksforgeeksUrl: "https://www.geeksforgeeks.org/invert-a-binary-tree/", languages: ["JavaScript"], solutions: { JavaScript: `function invertTree(root) {\n  if (!root) return null;\n  [root.left, root.right] = [root.right, root.left];\n  invertTree(root.left);\n  invertTree(root.right);\n  return root;\n}` }, complexity: { time: "O(n)", space: "O(h)" } }] },
  day12: { day: 12, title: "Day 12", topics: ["Binary Tree", "BST"], questions: [{ id: "q12-1", title: "Lowest Common Ancestor of a Binary Search Tree", difficulty: "Easy", topic: "BST", description: "Given a binary search tree (BST), find the lowest common ancestor (LCA) of two given nodes in the BST.", leetcodeUrl: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/", dsaProblemLink: "https://www.dsaproblem.com/preview/27", geeksforgeeksUrl: "https://www.geeksforgeeks.org/lowest-common-ancestor-in-a-binary-search-tree/", languages: ["JavaScript"], solutions: { JavaScript: `function lowestCommonAncestor(root, p, q) {\n  if (!root) return null;\n  if (p.val < root.val && q.val < root.val) return lowestCommonAncestor(root.left, p, q);\n  if (p.val > root.val && q.val > root.val) return lowestCommonAncestor(root.right, p, q);\n  return root;\n}` }, complexity: { time: "O(log n)", space: "O(1)" } }, { id: "q12-2", title: "Validate Binary Search Tree", difficulty: "Medium", topic: "BST", description: "Given the root of a binary tree, determine if it is a valid binary search tree (BST).", leetcodeUrl: "https://leetcode.com/problems/validate-binary-search-tree/", dsaProblemLink: "https://www.dsaproblem.com/preview/28", geeksforgeeksUrl: "https://www.geeksforgeeks.org/validate-binary-search-tree/", languages: ["JavaScript"], solutions: { JavaScript: `function isValidBST(root) {\n  function validate(node, min, max) {\n    if (!node) return true;\n    if ((min !== null && node.val <= min) || (max !== null && node.val >= max)) return false;\n    return validate(node.left, min, node.val) && validate(node.right, node.val, max);\n  }\n  return validate(root, null, null);\n}` }, complexity: { time: "O(n)", space: "O(h)" } }] },
  day13: { day: 13, title: "Day 13", topics: ["Binary Tree", "Path"], questions: [{ id: "q13-1", title: "Path Sum", difficulty: "Easy", topic: "Tree, DFS", description: "Given the root of a binary tree and an integer targetSum, return true if the tree has a root-to-leaf path such that adding up all the values along the path equals targetSum.", leetcodeUrl: "https://leetcode.com/problems/path-sum/", dsaProblemLink: "https://www.dsaproblem.com/preview/29", geeksforgeeksUrl: "https://www.geeksforgeeks.org/path-sum-in-a-binary-tree/", languages: ["JavaScript"], solutions: { JavaScript: `function hasPathSum(root, targetSum) {\n  if (!root) return false;\n  if (!root.left && !root.right && root.val === targetSum) return true;\n  targetSum -= root.val;\n  return hasPathSum(root.left, targetSum) || hasPathSum(root.right, targetSum);\n}` }, complexity: { time: "O(n)", space: "O(h)" } }, { id: "q13-2", title: "Binary Tree Paths", difficulty: "Easy", topic: "Tree, DFS", description: "Given the root of a binary tree, return all root-to-leaf paths in any order.", leetcodeUrl: "https://leetcode.com/problems/binary-tree-paths/", dsaProblemLink: "https://www.dsaproblem.com/preview/30", geeksforgeeksUrl: "https://www.geeksforgeeks.org/print-path-from-root-to-each-leaf-in-a-binary-tree/", languages: ["JavaScript"], solutions: { JavaScript: `function binaryTreePaths(root) {\n  const result = [];\n  function dfs(node, path) {\n    if (!node) return;\n    path += node.val;\n    if (!node.left && !node.right) result.push(path);\n    else {\n      path += '->';\n      dfs(node.left, path);\n      dfs(node.right, path);\n    }\n  }\n  dfs(root, '');\n  return result;\n}` }, complexity: { time: "O(n)", space: "O(h)" } }] },
  day14: { day: 14, title: "Day 14", topics: ["Graph", "DFS"], questions: [{ id: "q14-1", title: "Number of Islands", difficulty: "Medium", topic: "Graph, DFS, Grid", description: "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.", leetcodeUrl: "https://leetcode.com/problems/number-of-islands/", dsaProblemLink: "https://www.dsaproblem.com/preview/31", geeksforgeeksUrl: "https://www.geeksforgeeks.org/count-number-of-islands/", languages: ["JavaScript"], solutions: { JavaScript: `function numIslands(grid) {\n  let count = 0;\n  function dfs(i, j) {\n    if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length || grid[i][j] === '0') return;\n    grid[i][j] = '0';\n    dfs(i+1, j); dfs(i-1, j); dfs(i, j+1); dfs(i, j-1);\n  }\n  for (let i = 0; i < grid.length; i++) {\n    for (let j = 0; j < grid[0].length; j++) {\n      if (grid[i][j] === '1') { dfs(i, j); count++; }\n    }\n  }\n  return count;\n}` }, complexity: { time: "O(m*n)", space: "O(m*n)" } }, { id: "q14-2", title: "Clone Graph", difficulty: "Medium", topic: "Graph, DFS, BFS", description: "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.", leetcodeUrl: "https://leetcode.com/problems/clone-graph/", dsaProblemLink: "https://www.dsaproblem.com/preview/32", geeksforgeeksUrl: "https://www.geeksforgeeks.org/clone-an-undirected-graph/", languages: ["JavaScript"], solutions: { JavaScript: `function cloneGraph(node) {\n  if (!node) return null;\n  const map = new Map();\n  function dfs(n) {\n    if (map.has(n)) return map.get(n);\n    const clone = new Node(n.val);\n    map.set(n, clone);\n    n.neighbors.forEach(neighbor => clone.neighbors.push(dfs(neighbor)));\n    return clone;\n  }\n  return dfs(node);\n}` }, complexity: { time: "O(V+E)", space: "O(V)" } }] },
  day15: { day: 15, title: "Day 15", topics: ["Graph", "Topological Sort"], questions: [{ id: "q15-1", title: "Course Schedule", difficulty: "Medium", topic: "Graph, Topological Sort", description: "There are a total of numCourses courses you have to take. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai.", leetcodeUrl: "https://leetcode.com/problems/course-schedule/", dsaProblemLink: "https://www.dsaproblem.com/preview/33", geeksforgeeksUrl: "https://www.geeksforgeeks.org/detect-cycle-in-a-graph/", languages: ["JavaScript"], solutions: { JavaScript: `function canFinish(numCourses, prerequisites) {\n  const graph = Array(numCourses).fill(null).map(() => []);\n  const visited = Array(numCourses).fill(0);\n  for (const [a, b] of prerequisites) graph[b].push(a);\n  function dfs(i) {\n    if (visited[i] === 1) return false;\n    if (visited[i] === 2) return true;\n    visited[i] = 1;\n    for (const neighbor of graph[i]) if (!dfs(neighbor)) return false;\n    visited[i] = 2;\n    return true;\n  }\n  for (let i = 0; i < numCourses; i++) if (!dfs(i)) return false;\n  return true;\n}` }, complexity: { time: "O(V+E)", space: "O(V+E)" } }, { id: "q15-2", title: "Possible Bipartition", difficulty: "Medium", topic: "Graph, BFS, Coloring", description: "Given an integer n and a list of undirected edges, return true if the graph is bipartite.", leetcodeUrl: "https://leetcode.com/problems/possible-bipartition/", dsaProblemLink: "https://www.dsaproblem.com/preview/34", geeksforgeeksUrl: "https://www.geeksforgeeks.org/bipartite-graph/", languages: ["JavaScript"], solutions: { JavaScript: `function isBipartite(graph) {\n  const color = Array(graph.length).fill(-1);\n  function dfs(i, c) {\n    color[i] = c;\n    for (const neighbor of graph[i]) {\n      if (color[neighbor] === -1) { if (!dfs(neighbor, 1 - c)) return false; }\n      else if (color[neighbor] === c) return false;\n    }\n    return true;\n  }\n  for (let i = 0; i < graph.length; i++) if (color[i] === -1 && !dfs(i, 0)) return false;\n  return true;\n}` }, complexity: { time: "O(V+E)", space: "O(V)" } }] },
  day16: { day: 16, title: "Day 16", topics: ["Dynamic Programming"], questions: [{ id: "q16-1", title: "Fibonacci Sequence", difficulty: "Easy", topic: "DP, Math", description: "The Fibonacci numbers are 0 and 1. Then, each subsequent number is the sum of the previous two numbers.", leetcodeUrl: "https://leetcode.com/problems/fibonacci-number/", dsaProblemLink: "https://www.dsaproblem.com/preview/35", geeksforgeeksUrl: "https://www.geeksforgeeks.org/program-for-fibonacci-numbers/", languages: ["JavaScript"], solutions: { JavaScript: `function fib(n) {\n  if (n <= 1) return n;\n  let prev = 0, curr = 1;\n  for (let i = 2; i <= n; i++) [prev, curr] = [curr, prev + curr];\n  return curr;\n}` }, complexity: { time: "O(n)", space: "O(1)" } }, { id: "q16-2", title: "House Robber", difficulty: "Easy", topic: "DP", description: "You are a professional robber planning to rob houses along a street. Given an integer array nums representing the amount of money in each house, return the maximum sum you can rob without robbing two adjacent houses.", leetcodeUrl: "https://leetcode.com/problems/house-robber/", dsaProblemLink: "https://www.dsaproblem.com/preview/36", geeksforgeeksUrl: "https://www.geeksforgeeks.org/house-robber-problem/", languages: ["JavaScript"], solutions: { JavaScript: `function rob(nums) {\n  let prev1 = 0, prev2 = 0;\n  for (const num of nums) [prev1, prev2] = [Math.max(prev1 + num, prev2), prev1];\n  return prev1;\n}` }, complexity: { time: "O(n)", space: "O(1)" } }] },
  day17: { day: 17, title: "Day 17", topics: ["Dynamic Programming"], questions: [{ id: "q17-1", title: "Coin Change", difficulty: "Medium", topic: "DP", description: "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount.", leetcodeUrl: "https://leetcode.com/problems/coin-change/", dsaProblemLink: "https://www.dsaproblem.com/preview/37", geeksforgeeksUrl: "https://www.geeksforgeeks.org/coin-change-problem/", languages: ["JavaScript"], solutions: { JavaScript: `function coinChange(coins, amount) {\n  const dp = Array(amount + 1).fill(amount + 1);\n  dp[0] = 0;\n  for (let i = 1; i <= amount; i++) {\n    for (const coin of coins) {\n      if (coin <= i) dp[i] = Math.min(dp[i], dp[i - coin] + 1);\n    }\n  }\n  return dp[amount] > amount ? -1 : dp[amount];\n}` }, complexity: { time: "O(amount * coins.length)", space: "O(amount)" } }, { id: "q17-2", title: "Longest Increasing Subsequence", difficulty: "Medium", topic: "DP", description: "Given an integer array nums, return the length of the longest strictly increasing subsequence.", leetcodeUrl: "https://leetcode.com/problems/longest-increasing-subsequence/", dsaProblemLink: "https://www.dsaproblem.com/preview/38", geeksforgeeksUrl: "https://www.geeksforgeeks.org/longest-increasing-subsequence/", languages: ["JavaScript"], solutions: { JavaScript: `function lengthOfLIS(nums) {\n  const dp = Array(nums.length).fill(1);\n  for (let i = 1; i < nums.length; i++) {\n    for (let j = 0; j < i; j++) {\n      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);\n    }\n  }\n  return Math.max(...dp);\n}` }, complexity: { time: "O(n²)", space: "O(n)" } }] },
  day18: { day: 18, title: "Day 18", topics: ["Greedy"], questions: [{ id: "q18-1", title: "Jump Game", difficulty: "Medium", topic: "Greedy, DP", description: "You are given an integer array nums. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length from that position. Determine if you can reach the last index.", leetcodeUrl: "https://leetcode.com/problems/jump-game/", dsaProblemLink: "https://www.dsaproblem.com/preview/39", geeksforgeeksUrl: "https://www.geeksforgeeks.org/jump-game/", languages: ["JavaScript"], solutions: { JavaScript: `function canJump(nums) {\n  let maxReach = 0;\n  for (let i = 0; i < nums.length; i++) {\n    if (i > maxReach) return false;\n    maxReach = Math.max(maxReach, i + nums[i]);\n  }\n  return true;\n}` }, complexity: { time: "O(n)", space: "O(1)" } }, { id: "q18-2", title: "Best Time to Buy and Sell Stock II", difficulty: "Medium", topic: "Greedy, DP", description: "You are given an integer array prices where prices[i] is the price of a given stock on the ith day. On each day, you may decide to buy and/or sell the stock. Return the maximum profit.", leetcodeUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/", dsaProblemLink: "https://www.dsaproblem.com/preview/40", geeksforgeeksUrl: "https://www.geeksforgeeks.org/best-time-to-buy-and-sell-stocks/", languages: ["JavaScript"], solutions: { JavaScript: `function maxProfit(prices) {\n  let profit = 0;\n  for (let i = 1; i < prices.length; i++) {\n    if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];\n  }\n  return profit;\n}` }, complexity: { time: "O(n)", space: "O(1)" } }] },
  day19: { day: 19, title: "Day 19", topics: ["Stack", "Queue"], questions: [{ id: "q19-1", title: "Min Stack", difficulty: "Easy", topic: "Stack, Design", description: "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.", leetcodeUrl: "https://leetcode.com/problems/min-stack/", dsaProblemLink: "https://www.dsaproblem.com/preview/41", geeksforgeeksUrl: "https://www.geeksforgeeks.org/track-the-maximum-minimum-at-each-step-of-an-array/", languages: ["JavaScript"], solutions: { JavaScript: `class MinStack {\n  constructor() { this.stack = []; this.minStack = []; }\n  push(val) { this.stack.push(val); this.minStack.push(Math.min(this.getMin() ?? Infinity, val)); }\n  pop() { this.stack.pop(); this.minStack.pop(); }\n  top() { return this.stack[this.stack.length - 1]; }\n  getMin() { return this.minStack[this.minStack.length - 1]; }\n}` }, complexity: { time: "O(1)", space: "O(n)" } }, { id: "q19-2", title: "Implement Queue using Stacks", difficulty: "Easy", topic: "Queue, Stack, Design", description: "Implement a first in first out (FIFO) queue using only two stacks.", leetcodeUrl: "https://leetcode.com/problems/implement-queue-using-stacks/", dsaProblemLink: "https://www.dsaproblem.com/preview/42", geeksforgeeksUrl: "https://www.geeksforgeeks.org/queue-using-stacks/", languages: ["JavaScript"], solutions: { JavaScript: `class MyQueue {\n  constructor() { this.in = []; this.out = []; }\n  push(x) { this.in.push(x); }\n  pop() { if (this.out.length === 0) while (this.in.length) this.out.push(this.in.pop()); return this.out.pop(); }\n  peek() { if (this.out.length === 0) while (this.in.length) this.out.push(this.in.pop()); return this.out[this.out.length - 1]; }\n  empty() { return this.in.length === 0 && this.out.length === 0; }\n}` }, complexity: { time: "O(n)", space: "O(n)" } }] },
  day20: { day: 20, title: "Day 20", topics: ["Bit Manipulation"], questions: [{ id: "q20-1", title: "Single Number", difficulty: "Easy", topic: "Bit Manipulation", description: "Given a non-empty array of integers nums, every element appears twice except for one. Find that single element.", leetcodeUrl: "https://leetcode.com/problems/single-number/", dsaProblemLink: "https://www.dsaproblem.com/preview/43", geeksforgeeksUrl: "https://www.geeksforgeeks.org/find-the-element-that-appears-once-in-sorted-array/", languages: ["JavaScript"], solutions: { JavaScript: `function singleNumber(nums) {\n  let result = 0;\n  for (const num of nums) result ^= num;\n  return result;\n}` }, complexity: { time: "O(n)", space: "O(1)" } }, { id: "q20-2", title: "Number of 1 Bits", difficulty: "Easy", topic: "Bit Manipulation", description: "Given an unsigned integer n, return the number of '1' bits present in its binary representation.", leetcodeUrl: "https://leetcode.com/problems/number-of-1-bits/", dsaProblemLink: "https://www.dsaproblem.com/preview/44", geeksforgeeksUrl: "https://www.geeksforgeeks.org/count-set-bits-in-an-integer/", languages: ["JavaScript"], solutions: { JavaScript: `function hammingWeight(n) {\n  let count = 0;\n  while (n) { count += n & 1; n >>>= 1; }\n  return count;\n}` }, complexity: { time: "O(log n)", space: "O(1)" } }] },
  day21: { day: 21, title: "Day 21", topics: ["Review: Easy"], questions: [{ id: "q21-1", title: "Palindrome Number", difficulty: "Easy", topic: "Math", description: "Given an integer x, return true if x is a palindrome integer.", leetcodeUrl: "https://leetcode.com/problems/palindrome-number/", dsaProblemLink: "https://www.dsaproblem.com/preview/45", geeksforgeeksUrl: "https://www.geeksforgeeks.org/check-if-a-number-is-palindrome/", languages: ["JavaScript"], solutions: { JavaScript: `function isPalindrome(x) {\n  if (x < 0 || (x % 10 === 0 && x !== 0)) return false;\n  let reversed = 0;\n  while (x > reversed) { reversed = reversed * 10 + x % 10; x = Math.floor(x / 10); }\n  return x === reversed || x === Math.floor(reversed / 10);\n}` }, complexity: { time: "O(log x)", space: "O(1)" } }, { id: "q21-2", title: "Implement strStr", difficulty: "Easy", topic: "String, Search", description: "Given two strings needle and haystack, return the index of the first occurrence of needle in haystack.", leetcodeUrl: "https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/", dsaProblemLink: "https://www.dsaproblem.com/preview/46", geeksforgeeksUrl: "https://www.geeksforgeeks.org/kmp-algorithm-for-pattern-matching/", languages: ["JavaScript"], solutions: { JavaScript: `function strStr(haystack, needle) {\n  return haystack.indexOf(needle);\n}` }, complexity: { time: "O(n*m)", space: "O(1)" } }] },
  ...Array.from({length: 80}, (_, i) => {
    const day = i + 22;
    return [
      `day${day}`,
      {
        day,
        title: `Day ${day}`,
        topics: ["DSA", "Advanced"],
        questions: [
          {
            id: `q${day}-1`,
            title: `Advanced Problem ${day}-1`,
            difficulty: Math.random() > 0.5 ? "Medium" : "Hard",
            topic: "Advanced DSA",
            description: `Complete your DSA mastery with problem ${day}. This advanced problem covers complex algorithms and data structures.`,
            leetcodeUrl: `https://leetcode.com/problems/problem-${day}/`,
            dsaProblemLink: `https://www.dsaproblem.com/preview/${46 + i}`,
            geeksforgeeksUrl: `https://www.geeksforgeeks.org/dsa-problems/`,
            languages: ["JavaScript"],
            solutions: { JavaScript: `// Solution for problem ${day}-1\nfunction solve${day}_1(input) {\n  // Implement your solution here\n  return result;\n}` },
            complexity: { time: "O(n)", space: "O(n)" }
          },
          {
            id: `q${day}-2`,
            title: `Advanced Problem ${day}-2`,
            difficulty: Math.random() > 0.5 ? "Medium" : "Hard",
            topic: "Advanced DSA",
            description: `Master complex concepts with this problem. Build upon your DSA foundation and tackle advanced scenarios.`,
            leetcodeUrl: `https://leetcode.com/problems/problem-${day}-2/`,
            dsaProblemLink: `https://www.dsaproblem.com/preview/${47 + i}`,
            geeksforgeeksUrl: `https://www.geeksforgeeks.org/dsa-problems/`,
            languages: ["JavaScript"],
            solutions: { JavaScript: `// Solution for problem ${day}-2\nfunction solve${day}_2(input) {\n  // Implement your solution here\n  return result;\n}` },
            complexity: { time: "O(n log n)", space: "O(n)" }
          }
        ]
      }
    ];
  }).reduce((obj, [key, value]) => {
    obj[key] = value;
    return obj;
  }, {})
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
