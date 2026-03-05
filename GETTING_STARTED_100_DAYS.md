# Getting Started - 100 Days of Code Feature

## ✅ Pre-Flight Checklist

Before using the 100 Days of Code feature, ensure you have:

- [ ] Node.js 18+ installed
- [ ] All dependencies installed (`npm install`)
- [ ] Next.js development server ready
- [ ] Authentication system working
- [ ] Internet connection (for LeetCode API)

---

## 🚀 Step-by-Step Guide

### Step 1: Start the Development Server
```bash
cd AI_interview
npm run dev
```

Expected output:
```
> next dev --turbopack -p 4001
  ▲ Next.js 15.2.2
  - Local:        http://localhost:4001
```

### Step 2: Log In to the App
1. Open browser to `http://localhost:4001`
2. Sign in with your credentials
3. You'll be redirected to the dashboard

### Step 3: Navigate to 100 Days of Code
**Method 1: Using Sidebar**
1. Look at the left sidebar
2. Find "100 Days to Code" menu item
3. Click it

**Method 2: Direct URL**
1. Go to address bar
2. Type: `http://localhost:4001/100-days-of-code`
3. Press Enter

### Step 4: Explore the Features

#### 🔍 Try the Search
1. Find the search bar at the top
2. Type "array"
3. See array-related questions appear
4. Clear to reset

#### 🏷️ Try the Filters
1. Click the "Easy" button under "All Levels"
2. See only easy problems
3. Click "All Levels" to reset
4. Try topic filters like "Array" or "String"

#### 📖 View a Question
1. Click "Day 1" to expand it
2. Click "Two Sum" title
3. A modal will appear with full details
4. See the code solution
5. Try changing the language dropdown
6. Click the Copy button and paste somewhere

#### 🔗 External Links
1. Click "View on LeetCode" - opens LeetCode problem
2. Click "View on DSAProblem" - opens DSAProblem page
3. These open in new tabs

#### 📊 Check Your LeetCode Stats
1. Find the "LeetCode Contest Stats" section
2. Enter your LeetCode username (e.g., "fyzxnshxik")
3. Click "Fetch Stats"
4. Wait for your statistics to load
5. See your global ranking and rating

### Step 5: View Progress Overview
1. Scroll to the bottom of the page
2. See the "Progress Overview" card
3. Shows:
   - Total Days: 3 (currently)
   - Total Questions: 10
   - Average per Day: ~3.3
   - Estimated Time: 100 days

---

## 🎯 Common Tasks

### Task: Find Binary Search Problems
1. Currently not available in Days 1-3
2. **Way to add**: Edit `constants/hundredDaysOfCode.js` and add more days

### Task: Add a New Day (Day 4)
1. Open `constants/hundredDaysOfCode.js`
2. Go to the end of the HUNDRED_DAYS_DSA object
3. Add:
```javascript
  day4: {
    day: 4,
    title: "Day 4",
    topics: ["Linked List"],
    questions: [
      // Add questions here following the same format
    ]
  }
```
4. Save and refresh the page
5. Day 4 will appear in the list

### Task: Add a New Language to Solutions
1. Find the question you want to edit in `constants/hundredDaysOfCode.js`
2. Update the `languages` array:
```javascript
languages: ["JavaScript", "Python", "Java", "C++", "Go"],
```
3. Add the solution in the `solutions` object:
```javascript
solutions: {
  // ... existing solutions
  Go: `func twoSum(nums []int, target int) []int {
    // Go solution code
  }`
}
```
4. Save and refresh
5. New language appears in the modal dropdown

### Task: Export Questions as CSV
1. Use the helper function in `lib/dsa-helpers.js`
2. In JavaScript console:
```javascript
const { exportQuestionsAsCSV, getAllDays } = require('@/lib/dsa-helpers');
const csv = exportQuestionsAsCSV(getAllDays());
console.log(csv);
```

---

## 🔧 Troubleshooting

### Issue: Page Shows 404 Error
**Solution**:
- Check the URL: should be `/100-days-of-code` (with hyphens)
- Ensure you're logged in
- Try refreshing the page
- Check if file `page.jsx` exists in `app/(root)/100-days-of-code/`

### Issue: Questions Not Showing
**Solution**:
- Ensure `constants/hundredDaysOfCode.js` is properly formatted
- Check browser console for errors
- Try refreshing the page
- Clear browser cache

### Issue: Modal Not Opening When Clicking Question
**Solution**:
- Check if JavaScript is enabled
- Try refreshing the page
- Check browser console for errors
- Verify `QuestionDetailsModal.jsx` exists

### Issue: Search Not Working
**Solution**:
- Make sure search text is entered
- The search is case-insensitive
- Try searching for just part of a word
- Clear all filters and try again

### Issue: LeetCode Stats Not Loading
**Solution**:
- Verify username spelling is correct
- Make sure your LeetCode profile is public
- Check internet connection
- Try again after a few seconds
- Look at browser network tab to debug API response

### Issue: Tailwind Classes Not Applying
**Solution**:
- Classes like `bg-linear-to-br` should work fine
- If colors don't appear, clear browser cache
- Try hard refresh (Ctrl+Shift+R)
- Ensure Tailwind CSS is working globally

---

## 📱 Browser Compatibility

Tested on:
- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Dark Mode
- Automatically detects system preference
- Can be toggled in app settings (if implemented)
- Works across all modern browsers

---

## 🎓 Learning Path Suggestion

### Week 1-2: Easy Problems (Days 1-3)
1. Array basics
2. String manipulation
3. Hash maps
4. Build foundation

### Week 3-4: Medium Problems (Days 4-7)
1. Sorting and searching
2. Dynamic programming
3. Two pointers
4. Increase complexity

### Week 5+: Hard Problems (Days 8+)
1. Advanced DP
2. Graph algorithms
3. System design basics
4. Interview preparation

---

## 💡 Pro Tips

1. **Type Out Solutions**: Don't just read, actually code them
2. **Try Before Peeking**: Attempt 20-30 mins before viewing solution
3. **Understand the Why**: Learn the pattern, not just memorize
4. **Track Your Time**: See how fast you solve as you practice
5. **Explain Out Loud**: Verbally explain your approach to master it
6. **Mix Languages**: Solve in different programming languages
7. **Do Variations**: Try solving the same problem with different approaches

---

## 🔗 Useful Resources

- **LeetCode**: https://leetcode.com
- **DSAProblem**: https://www.dsaproblem.com
- **GeeksforGeeks**: https://www.geeksforgeeks.org
- **NeetCode**: https://neetcode.io
- **AlgoExpert**: https://www.algoexpert.io

---

## 📞 Quick Support

### Check These Files for Help
1. `docs/100_DAYS_OF_CODE_GUIDE.md` - Detailed guide
2. `QUICK_REFERENCE_100_DAYS.md` - Developer reference
3. `IMPLEMENTATION_SUMMARY_100_DAYS.md` - What was implemented

### Common Questions Answered

**Q: How many days/questions are included?**
A: Currently 3 complete days with 10 questions total. Follow the guide to add more.

**Q: Can I add my own questions?**
A: Yes! Edit `constants/hundredDaysOfCode.js` and follow the question format.

**Q: How do I add more programming languages?**
A: Add them to the `languages` array and `solutions` object in each question.

**Q: Can I track my progress?**
A: The basic framework is there. You can extend it with localStorage or backend.

**Q: Will my progress be saved?**
A: Not currently. You can implement this using localStorage or database.

**Q: How do I modify the colors?**
A: Edit Tailwind CSS classes in the components or CSS variables.

---

## 🎉 You're All Set!

1. ✅ Feature is installed
2. ✅ Components are created
3. ✅ Documentation is provided
4. ✅ Ready to use

**Start your 100-day DSA journey! 🚀**

---

**Setup Date**: March 3, 2026
**Feature Version**: 1.0.0
**Status**: Ready to Use ✅
