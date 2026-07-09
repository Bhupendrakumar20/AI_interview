# PrepWise Project API Directory & Report

This report catalogs all Next.js API Routes (`app/api/`) and FastAPI endpoints (`ResumeInterview/api.py`) used in the project, detailing their purpose and the underlying **AI Providers / LLM Engines** they use.

---

## 🧠 AI Provider & LLM Mapping

The project employs a hybrid model architecture:
1. **Ollama (Local Host)**: Used for privacy-sensitive data, offline processing, and local resume analysis/negotiation chats.
2. **Gemini / Groq (Cloud API)**: Used for high-reasoning tasks like real-time question generation and adaptive follow-up evaluation.
3. **Piston Container**: Used for sandboxed DSA code execution.

---

## 🛠️ FastAPI Python Backend (Port 8080)
These endpoints process heavy natural language tasks using local LLMs.

| Endpoint | Method | AI Provider / Engine | Description |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | *None* | Verifies Python FastAPI server status. |
| `/parse` | `POST` | *None* (Rule-based PDF parser) | Parses an uploaded PDF resume into a structured JSON representation. |
| `/ats-score` | `POST` | *None* (Cosine Similarity Matcher) | Scores the parsed resume structure against a target Job Description. |
| `/generate-questions` | `POST` | **Ollama** (`gemma3:4b`) | Generates targeted claims verification questions based on focus area and persona. |
| `/feedback` | `POST` | **Ollama** (`gemma3:4b`) | Outputs structured, constructive expert feedback on the ATS score and matches. |
| `/optimize-resume` | `POST` | **Ollama** (`gemma3:4b`) | Recommends resume optimization summaries and skills using Ollama. |

---

## 🌐 Next.js Frontend APIs (`app/api/`)

### 📄 Resume & ATS
| Endpoint Path | Method | AI Provider / Engine | Description |
| :--- | :--- | :--- | :--- |
| `/api/resume/upload` | `POST` | *FastAPI Proxy* | Uploads PDF resume and forwards it to Python `/parse`. |
| `/api/resume/ats-score` | `POST` | *FastAPI Proxy* | Forwards JSON resume details and JD to Python `/ats-score`. |
| `/api/resume/generate-questions` | `POST` | *FastAPI Proxy* (**Ollama**) | Forwards parameters to Python `/generate-questions`. |
| `/api/resume/feedback` | `POST` | *FastAPI Proxy* (**Ollama**) | Forwards data to Python `/feedback`. |
| `/api/resume/optimize` | `POST` | *FastAPI Proxy* (**Ollama**) | Forwards data to Python `/optimize-resume`. |
| `/api/resume/verify` | `POST` | **Gemini** (`gemini-pro`) / **Groq** | Original fallback Gemini-powered claims extraction & verification question service. |

### 🤝 Interview Buddy, Copilot & Proctoring
| Endpoint Path | Method | AI Provider / Engine | Description |
| :--- | :--- | :--- | :--- |
| `/api/interview/generate-question` | `POST` | **Gemini** (`gemini-pro`) / **Groq** | Generates adaptive behavioral/technical follow-ups. |
| `/api/copilot/manage-session` | `POST` | **Gemini** / **Groq** | Manages AI copilot coding assistant loops. |
| `/api/cheating/detect-ai-usage` | `POST` | **Gemini** / **Groq** | Audits clipboard copy/pastes and key inputs for signs of AI assistance. |
| `/api/proctoring/analyze-behavior` | `POST` | **Gemini** / **Groq** | Real-time behavior analysis of candidate actions. |
| `/api/interview-buddy/create-session` | `POST` | *None* (WebRTC) | Initiates WebRTC peer connections or AI bot rooms. |
| `/api/interview-buddy/join-session` | `POST` | *None* | Resolves lobby assignments for peer interview sessions. |
| `/api/interview-buddy/join-by-invite` | `POST` | *None* | Authenticates access to shared interview invitations. |
| `/api/interview-buddy/sessions` | `GET` | *None* | Returns a list of past interview history logs. |
| `/api/interview-buddy/sessions/[sessionId]/update`| `PATCH` | *None* | Updates session status, notes, or candidate feedback scores. |
| `/api/interview-buddy/ice-credentials` | `GET` | *None* (STUN/TURN) | Generates dynamic STUN/TURN credentials for WebRTC. |
| `/api/interview-buddy/proctoring/validate` | `POST` | **Gemini** / **Groq** (Frame Analyser) | Compares candidate video feed frame analyses to flag tab switching/absence. |
| `/api/interview-buddy/proctoring/report/[sessionId]`| `GET` | *None* | Fetches cumulative screen/webcam flags for completed interviews. |
| `/api/interview-buddy/stats` | `GET` | *None* | Returns overall user stats (hours prepped, AI reviews). |

### 💻 Code Execution & DSA
| Endpoint Path | Method | AI Provider / Engine | Description |
| :--- | :--- | :--- | :--- |
| `/api/code-executor/execute` | `POST` | **Piston Container** | Compiles and executes code in a sandboxed runner. |
| `/api/code-executor/runtimes` | `GET` | **Piston Container** | Lists available language execution runtimes. |
| `/api/dsa-room/create` | `POST` | *None* (Socket.io) | Initializes dynamic WebSocket rooms for live DSA coding sessions. |
| `/api/dsa-room/send-notification` | `POST` | *None* | Notifies users of lobby activity or test starts. |
| `/api/dsa-stats` | `GET` | *None* | Compiles coding submissions, success rates, and active streaks. |
| `/api/leetcode` | `GET` | *None* (LeetCode Scraper) | Fetches coding questions from LeetCode. |
| `/api/leetcode/daily-question` | `GET` | *None* | Returns the active daily challenge. |

### 🎙️ Audio & Voice
| Endpoint Path | Method | AI Provider / Engine | Description |
| :--- | :--- | :--- | :--- |
| `/api/tts` | `POST` | *None* (Browser Web Speech API) | Converts interviewer questions to lifelike audio. |
| `/api/vapi/generate` | `POST` | **Vapi Voice Agent** | Creates dynamic voice agent configurations for interactive phone call interviews. |
| `/api/vapi/generate/auth/admin-verify`| `POST` | *None* | Checks admin access for configuring Voice Agents. |

### 👔 Admin Modules
| Endpoint Path | Method | AI Provider / Engine | Description |
| :--- | :--- | :--- | :--- |
| `/api/admin/dsa-question` | `POST` | *None* | Manages creation and updates of DSA questions and test cases in Firestore. |
| `/api/admin/proctoring/reviews` | `GET` | *None* | Fetches active screen and webcam logs flagged for cheating review. |
| `/api/admin/audit-logs` | `GET` | *None* | Returns audit trails of admin actions. |

### 🔐 Authentication
| Endpoint Path | Method | AI Provider / Engine | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/current-user` | `GET` | *None* (Firebase Auth) | Fetches session token and active user details. |
| `/api/auth/admin-verify` | `POST` | *None* | Verifies whether the requesting user has administrative rights. |

### 🩺 System & Test Utilities
| Endpoint Path | Method | AI Provider / Engine | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | *None* | Health status checker across active database connection, rate limiter, and API keys. |
| `/api/system/health` | `GET` | *None* | Core hardware utilization metrics. |
| `/api/system/init` | `POST` | *None* | Initializes defaults, indexes folders, and checks dependencies. |
| `/api/test/rate-limiter` | `GET` | *None* | Stress-tests dynamic rate limits across different request speeds. |
| `/api/test/feedback-generation` | `POST` | **Gemini** / **Groq** | Sandbox to verify the speed and outputs of model feedback triggers. |
| `/api/debug/model-info` | `GET` | *None* | Returns debug parameters about active model configurations. |
| `/api/debug/feedback-test` | `POST` | **Gemini** / **Groq** | Verifies format stability for AI interviewer evaluations. |
