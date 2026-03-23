# AI Buddy Interview Session - Questions Integration

## Overview

The AI Buddy feature now includes dynamic question generation from your comprehensive question bank. When users select topics for their AI interview session, questions are automatically fetched and displayed during the interview.

## How It Works

### 1. **User Selects Topics**
Users can select from:
- DSA (Data Structures & Algorithms)
- System Design
- Behavioral
- SQL / Databases
- OOP (Object-Oriented Programming)
- React / JavaScript
- HR Round
- Leadership
- Case Study
- Negotiation

### 2. **Difficulty Level**
Users choose:
- Easy
- Medium  
- Hard

### 3. **AI Interview Session Starts**
When user clicks "Start AI Session":
1. `InterviewBuddy` component creates session
2. For AI mode: `AiBuddyInterviewSession` component loads immediately
3. Questions are fetched from question bank filtered by selected topics
4. Interview questions display one at a time

## File Structure

### New Files Created

**`lib/utils/ai-buddy-questions.js`** - Question fetching logic
- `getQuestionsByTopics()` - Get questions filtered by topics
- `getRandomQuestionByTopic()` - Get single random question
- `getNextQuestion()` - Get next unasked question
- `getInterviewQuestions()` - Get interview session questions
- `getQuestionById()` - Get specific question
- `mapTopicsToQuestionTopic()` - Map UI topics to question bank topics
- `getAvailableTopics()` - List all available topics
- `getTopicStats()` - Count questions per topic

**`components/AiBuddyInterviewSession.jsx`** - Interview UI component
- Displays current question
- Records user answers
- Tracks progress
- Manages timer
- Shows session summary

### Modified Files

**`components/InterviewBuddy.jsx`** - Main component integration
- Added state: `activeSessionId`, `isInterviewActive`
- Import: `AiBuddyInterviewSession` component
- Modified `handleCreateSession()` to start interview for AI mode
- Added conditional rendering for interview view

## Data Flow

```
User selects AI Buddy mode
    ↓
Selects topics (DSA, System Design, OOP, etc.)
    ↓
Selects difficulty (Easy/Medium/Hard)
    ↓
Selects duration (15-90 minutes)
    ↓
Clicks "Start AI Session"
    ↓
InterviewBuddy.handleCreateSession()
    ↓
Creates session via API
    ↓
Sets activeSessionId & isInterviewActive = true
    ↓
AiBuddyInterviewSession mounts
    ↓
useEffect initializes interview:
    - Map user topics to question bank topics
    - Call getInterviewQuestions()
    - Load questions from HUNDRED_DAYS_DSA
    ↓
Display first question
    ↓
User answers question
    ↓
Show next question button
    ↓
When time runs out or user clicks "Finish"
    - Save session results to backend
    - Return to main InterviewBuddy view
    - Show score and stats
```

## Question Selection Strategy

### Topic Mapping
User topics are mapped to question bank topics:
```javascript
{
  'dsa': 'Array',
  'system-design': 'Design',
  'oop': 'OOP',
  'databases': 'Database',
  'api-design': 'API',
  // ... more mappings
}
```

### Question Fetching
1. Get all questions from `HUNDRED_DAYS_DSA` constant
2. Filter by selected topics (case-insensitive)
3. Filter by difficulty level if needed
4. Return limited number (5-18 based on session duration)

### Duration to Question Count
- 15 min session → 3 questions
- 30 min session → 6 questions
- 45 min session → 9 questions
- 60+ min session → 12+ questions

## Component Props

### `AiBuddyInterviewSession`

```javascript
<AiBuddyInterviewSession
  sessionId="unique-session-id"           // For saving results
  selectedTopics={["DSA", "System Design"]} // Topics to ask about
  difficulty="Medium"                      // Question difficulty
  duration={30}                            // Session time in minutes
  onSessionEnd={(results) => {...}}       // Callback when finished
  onClose={() => {...}}                   // Callback to close session
/>
```

## Features

✅ **Dynamic Question Loading**
- Questions loaded from comprehensive question bank
- Filtered by user-selected topics
- Different difficulties available

✅ **Answer Recording**
- Voice recording support (mic required)
- Text answer support
- Stores with question ID

✅ **Progress Tracking**
- Shows current question number
- Progress bar shows progress
- Summary shows answered vs total

✅ **Session Timer**
- Countdown timer (red when <1 min)
- Auto-ends session when time up
- Shows minutes:seconds format

✅ **Question Navigation**
- Previous/Next buttons
- Skip question option
- Finish interview button

✅ **Results Saving**
- Sends results to backend
- Calculates score based on questions answered
- Generates feedback scores (clarity, accuracy, communication, etc.)

## Question Bank Integration

### Data Source
Questions come from `constants/hundredDaysOfCode.js`:
- Contains 100+ days of DSA problems
- Organized by day and topic
- Includes difficulty levels
- Links to LeetCode and GeeksForGeeks

### Question Structure
```javascript
{
  id: "q1-1",
  title: "Reverse an Array",
  difficulty: "Easy",
  topic: "Array",
  description: "Reverse array or string in-place.",
  problemStatementUrl: "...",
  leetcodeUrl: "...",
  geeksforgeeksUrl: "...",
  languages: ["JavaScript"],
  solutions: { JavaScript: "..." },
  complexity: { time: "O(n)", space: "O(1)" }
}
```

## Customization

### Add More Topics
Edit `VALID_TOPICS` in `lib/utils/interview-buddy-utils.js`:
```javascript
export const VALID_TOPICS = [
  "DSA",
  "System Design",
  // ... add new topics
];
```

### Adjust Question Count
Edit `getInterviewQuestions()` in `lib/utils/ai-buddy-questions.js`:
```javascript
const questionCount = Math.ceil(duration / 5); // Adjust divisor (5 = 1 question per 5 min)
```

### Filter by Specific Difficulty
In the UI, users can select difficulty level for filtered questions:
```javascript
const difficultyQuestions = allQuestions.filter(q => q.difficulty === selectedDifficulty);
```

## Performance Notes

- Questions are fetched synchronously during initialization
- No database queries (uses in-memory constants)
- Fast filtering with Set-based lookups
- Questions loaded before timer starts

## Future Enhancements

- [ ] Real-time speech-to-text transcription
- [ ] AI sentiment analysis during answers
- [ ] Adaptive question difficulty based on user performance
- [ ] Multi-language support
- [ ] Custom question creation by users
- [ ] Weighted question selection by importance
- [ ] Historical question tracking (avoid repeats)
- [ ] Performance analytics per topic

## Testing

To test the AI Buddy with questions:

1. Visit `/interview/buddy` page
2. Select "AI Buddy Mode"
3. Choose:
   - AI Persona (any)
   - Topics (DSA, System Design, etc.)
   - Difficulty (Easy/Medium/Hard)
   - Duration (15-90 minutes)
4. Click "Start AI Session"
5. Interview session loads with questions
6. Answer questions and track progress
7. Session ends and shows results

## Troubleshooting

**No questions loading?**
- Check if selectedTopics are correctly mapped
- Verify HUNDRED_DAYS_DSA has data
- Check browser console for errors

**Questions showing but not from selected topics?**
- Check topic mapping in `mapTopicsToQuestionTopic()`
- Verify topic names match question bank

**Timer not working?**
- Check system clock/browser timezone
- Verify duration prop is set correctly
- Check browser console for errors

## Notes

- Questions are read-only during interview
- User answers stored in component state
- Results calculated on session end
- Questions don't repeat during single session
- All questions from DSA question bank (expandable)
