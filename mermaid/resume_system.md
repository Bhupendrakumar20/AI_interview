# PrepWise AI Resume & Ollama Integration Diagrams

This document contains specialized diagrams mapping out the Ollama-powered AI Resume pipeline, including PDF Parsing, ATS Score calculation, Feedback Generation, and Claim-Verification Question Generation.

---

## 1. AI Resume Pipeline Flowchart

This flowchart details the complete step-by-step document analysis, entity extraction, and evaluation pipeline using local Python microservices and the Ollama (`gemma3:4b`) instance.

```mermaid
flowchart TD
  %% Entry and Parsing
  Start([Candidate Uploads Resume PDF]) --> NextApi[Next.js API Gateway: /api/resume/upload]
  NextApi --> FastAPI[FastAPI Python Backend: /resume/parse]
  
  FastAPI --> PDFParser[ResumeParser: Extract Plain Text from PDF]
  PDFParser --> Tokenizer[Clean and structure text tokens]
  
  %% Ollama Evaluation Split
  Tokenizer --> OllamaQuery{Ollama Local Server: 11434}
  
  %% Task 1: ATS Scorer
  OllamaQuery --> ATSPath[Task 1: ATS Scoring]
  ATSPath --> ATSPrompt[Structure ATS prompt with rubrics]
  ATSPrompt --> OllamaATS[Ollama gemma3:4b evaluation]
  OllamaATS --> ATSMetrics[Calculate scores: Technical, Layout, Impact]
  
  %% Task 2: Claim Verification Q-Gen
  OllamaQuery --> QGenPath[Task 2: Claim Verification Q-Gen]
  QGenPath --> QGenPrompt[Structure prompt to isolate projects & claims]
  QGenPrompt --> OllamaQGen[Ollama gemma3:4b extracts claims]
  OllamaQGen --> ClaimQuestions[Generate question + expected keywords array]
  
  %% Task 3: Feedback & Optimization
  OllamaQuery --> FBPath[Task 3: Resume Feedback & Optimization]
  FBPath --> FBPrompt[Structure prompt for resume improvement]
  FBPrompt --> OllamaFB[Ollama gemma3:4b generates suggestions]
  OllamaFB --> ImproveList[Isolate Strengths, Weaknesses & Action Items]
  
  %% Aggregation & Validation
  ATSMetrics & ClaimQuestions & ImproveList --> OutputAggregator[FastAPI Aggregator]
  OutputAggregator --> ValidateJSON{Is JSON schema correct?}
  
  %% Fallbacks & Repairs
  ValidateJSON -- No --> JSONRepair[Try local regex/repair parser]
  JSONRepair --> RepairSuccess{Repair works?}
  RepairSuccess -- No --> GeminiFallback[Cloud Fallback: Call Gemini Pro]
  GeminiFallback --> FinalJSON[Valid Response JSON]
  RepairSuccess -- Yes --> FinalJSON
  ValidateJSON -- Yes --> FinalJSON
  
  %% DB & Client Rendering
  FinalJSON --> SaveDB[(Write parsed details & score report to Firestore)]
  SaveDB --> RenderUI[Render ATS Score Panel, Optimization Insights & Practice Questions]
```

---

## 2. Request Lifecycle (Sequence Diagram with Fallbacks)

This sequence diagram outlines the detailed network messages exchanged between the Next.js frontend, Next.js API server, FastAPI backend, local Ollama server, Gemini Cloud API (as fallback), and Firestore.

```mermaid
sequenceDiagram
    autonumber
    actor User as Candidate
    participant FE as Frontend (React UI)
    participant BE as Next.js API Server
    participant Py as FastAPI Python Backend
    participant Ollama as Ollama Local (gemma3:4b)
    participant Gemini as Gemini Cloud API
    participant DB as Firestore DB

    User->>FE: Selects resume PDF & clicks Upload
    FE->>BE: POST /api/resume/upload (form-data: file)
    BE->>Py: POST /resume/parse (Forward PDF payload)
    
    Py->>Py: Run ResumeParser (Extract plain text)
    
    %% Parallel/Sequential Ollama Calls
    Note over Py, Ollama: Start local processing (gemma3:4b)
    Py->>Ollama: POST http://localhost:11434/api/generate (ATS Rubrics prompt)
    Ollama-->>Py: Return ATS evaluation text
    
    Py->>Ollama: POST http://localhost:11434/api/generate (Claim-extraction prompt)
    Ollama-->>Py: Return claims & verification questions
    
    Py->>Ollama: POST http://localhost:11434/api/generate (Optimization suggestions prompt)
    Ollama-->>Py: Return formatted feedback suggestions
    
    %% JSON parsing & validation check
    Py->>Py: Parse Ollama responses to JSON
    
    alt Parsing succeeds & JSON schema matches
        Py-->>BE: Return combined JSON (Score, Questions, Feedback)
    else Parsing fails (Malformed JSON or Timeout)
        Py->>Py: Attempt schema repair
        alt Repair fails
            Py->>Gemini: POST generateContent (Fallback to Gemini API)
            Gemini-->>Py: Return high-quality, formatted JSON
            Py-->>BE: Return fallback JSON
        else Repair succeeds
            Py-->>BE: Return repaired JSON
        end
    end
    
    BE->>DB: Save parsed resume document & analysis details
    BE-->>FE: Return 200 OK with analysis payload
    
    FE->>User: Display ATS Score gauge, Suggestions, and Claim-verification Panel
```

---

## 3. Ollama Evaluation Engine State Machine (State Diagram)

This state diagram illustrates the internal lifecycle of the parsing and LLM evaluation engine during resume processing, highlighting input verification, active generation, retry logic, and fallback branches.

```mermaid
stateDiagram-v2
    [*] --> Idle: Waiting for file upload
    Idle --> FileReceived: POST /api/resume/upload
    
    state FileReceived {
        [*] --> TextExtraction: Parse PDF pages
        TextExtraction --> StructureCheck: Validate text length and layout
        StructureCheck --> [*]
    }
    
    FileReceived --> StructuringPrompts: Formatting variables for LLM
    
    state StructuringPrompts {
        [*] --> LoadRubrics: Fetch ATS guidelines
        LoadRubrics --> IngestText: Embed candidate text
        IngestText --> [*]
    }
    
    StructuringPrompts --> QueryingOllama: Send request to localhost:11434
    
    state QueryingOllama {
        [*] --> ActiveGenerating: Ollama processes prompt
        ActiveGenerating --> ResponseReceived: Text streamed back
        ResponseReceived --> [*]
    }
    
    QueryingOllama --> ParsingJSON: Convert text response to JSON
    
    state ParsingJSON {
        [*] --> ValidateSchema: Check fields (ATS, Claims, Suggestions)
        ValidateSchema --> SuccessState: All fields match structure
        ValidateSchema --> MalformedState: JSON broken / truncated
        MalformedState --> AttemptingRepair: Run regex & braces fixer
        AttemptingRepair --> SuccessState: Fix successful
        AttemptingRepair --> ErrorState: Fix failed
        SuccessState --> [*]
        ErrorState --> [*]
    }
    
    ParsingJSON --> WritingToDB: Success State reached
    ParsingJSON --> GeminiFallback: Error State reached (Timeout / Fail)
    
    GeminiFallback --> WritingToDB: Gemini response parsed
    WritingToDB --> DisplayingResults: Update Redux/Component state
    DisplayingResults --> Idle: Reset workflow
```
