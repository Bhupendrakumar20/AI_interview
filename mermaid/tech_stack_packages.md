# PrepWise Technology Stack & Package Guide

This document lists all the frameworks, libraries, modules, and packages used across the Node.js (Next.js) frontend and Python backend systems of the PrepWise platform.

---

## 💻 1. Node.js / Next.js Ecosystem (`package.json`)

### Core Frameworks
* **Next.js 16 (`next`)**: The React framework for Server-Side Rendering (SSR), Server Actions, and File-system Routing.
* **React 19 (`react` / `react-dom`)**: Core UI library using concurrent features.

### AI SDKs & Integrations
* **Vercel AI SDK (`ai`)**: Unified API to stream and generate text, structures, and tools from large language models.
* **Google Gemini SDK (`@ai-sdk/google` / `@google/generative-ai`)**: Native client libraries for Google Gemini Pro and Flash models.
* **Groq SDK (`@ai-sdk/groq`)**: Provider wrapper for calling high-performance open-source models (like Llama-3.3-70B) via Groq API.
* **OpenAI SDK (`@ai-sdk/openai`)**: Client library to integrate OpenAI models.

### Real-Time & Databases
* **Firebase Admin SDK (`firebase-admin`)**: Node.js SDK to write secure server-side Firestore actions.
* **Firebase Client SDK (`firebase`)**: Frontend SDK for reading/writing live public collection states.
* **Socket.IO (`socket.io` / `socket.io-client`)**: Node.js WebSockets framework for syncing real-time collaborative state.
* **Redis Client (`redis`)**: Node.js interface to communicate with the local/cloud Redis caching container.
* **PostgreSQL Client (`postgres`)**: Client for PostgreSQL database interactions.

### UI & Styling
* **TailwindCSS 4 (`tailwindcss`)**: Utility-first CSS engine for dynamic premium user interfaces.
* **Lucide React (`lucide-react`)**: Clean svg icon package.
* **Recharts (`recharts`)**: SVG charting library for stats dashboards and progression analytics.
* **Sonner (`sonner`)**: Modern toast notification manager.
* **Next Themes (`next-themes`)**: Light/Dark theme configuration framework.

### Form Handling & Utilities
* **React Hook Form (`react-hook-form` / `@hookform/resolvers`)**: Lightweight validation forms integration.
* **Zod (`zod`)**: Schema declaration and type-safe verification (validation).
* **Day.js (`dayjs`)**: Lightweight date formatting engine (used for formatting dates/times on cards).
* **Uploadthing (`uploadthing` / `@uploadthing/react`)**: Cloud file upload manager for resumes/images.
* **Concurrently (`concurrently`)**: CLI utility to run multiple server processes concurrently in development.

---

## 🐍 2. Python Backend Ecosystem (`requirements.txt`)

### Web Framework & Servers
* **FastAPI (`fastapi`)**: High-performance async python web framework for creating APIs.
* **Uvicorn (`uvicorn`)**: Lightning-fast ASGI web server implementation.
* **Python Multipart (`python-multipart`)**: Library to parse PDF uploads and multipart form data.
* **Python Dotenv (`python-dotenv`)**: Loads environment variables from `.env` files.

### LangChain & Vector Search (RAG Engine)
* **LangChain Community (`langchain-community`)**: Third-party integrations for connecting document loaders, embeddings, and vector stores.
* **LangChain Text Splitters (`langchain-text-splitters`)**: Chunks raw resume PDF text into digestible sizes.
* **LangChain Hugging Face (`langchain-huggingface`)**: Connects to Hugging Face embeddings models locally.
* **FAISS CPU (`faiss-cpu`)**: Meta's library for efficient similarity search and dense vector indexing.

### Machine Learning & NLP
* **Sentence Transformers (`sentence-transformers`)**: Accesses pre-trained models to translate chunked text into dense vector embeddings.
* **Scikit-learn (`scikit-learn`)**: Library for classification, regression, clustering, and data analysis.
* **SpaCy (`spacy`)**: Natural Language Processing (NLP) tokenization and entity extraction library.
* **RapidFuzz (`rapidfuzz`)**: Fast string matching and similarity score computation.
* **NumPy (`numpy`)**: Multidimensional array mathematical processing library.

### Utilities & Testing
* **Redis (`redis`)**: Python driver to read/write active session states in the Redis store.
* **Requests (`requests`)**: Synchronous HTTP library for external calls.
* **PyMuPDF (`pymupdf`)**: High-performance PDF parser to convert resume files into clean text.
* **Pytest (`pytest`)**: Unit testing framework.
