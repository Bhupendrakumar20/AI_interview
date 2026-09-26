# PrepWise Server Architecture & Deployment Guide

This document describes the servers, microservices, databases, and runtime sandbox engines used in the PrepWise AI Mock Interview application.

---

## 🗺️ Server Architecture Diagram (Mermaid)

```mermaid
graph TD
    %% Clients
    Browser["Candidate Browser (Client UI)"]

    %% Deployed Public Servers
    Vercel["Next.js Web Server (Vercel)<br/>Port: 4001 (Local)<br/>Status: Deployed (Live)"]
    SocketServer["Socket.IO Signaling Server (Render)<br/>Port: 4002 (Local)<br/>Status: Deployed (Live)"]

    %% Backend APIs (Currently Local)
    ResumeAPI["Python Resume API (FastAPI)<br/>Port: 8000 (Local)<br/>Status: Local Only"]
    AdaptiveAPI["Python Adaptive Buddy API (FastAPI)<br/>Port: 8001 (Local)<br/>Status: Local Only"]
    PistonAPI["Piston Code Sandbox Runner (Node)<br/>Port: 2000 (Local)<br/>Status: Local Only"]

    %% Database Layers
    Redis["Redis Store (Docker Container)<br/>Port: 6379 (Local)<br/>Status: Local Only"]
    Firestore["Cloud Firestore (Google NoSQL)<br/>Status: Cloud Database (Live)"]

    %% Communications
    Browser -->|HTTP Requests / Actions| Vercel
    Browser -->|WebSockets Connection| SocketServer
    
    Vercel -->|Query/Save Data| Firestore
    Vercel -->|Execute Code| PistonAPI
    Vercel -->|API Calls (Adaptive State)| AdaptiveAPI
    Vercel -->|API Calls (Resume Parse)| ResumeAPI
    
    SocketServer -->|Store Rooms/Code Sync| Redis
    AdaptiveAPI -->|Store Adaptive States| Redis
```

---

## 📊 Quick Server Status Table

| Server Service | Port (Local) | Deployed Status | Platform (Used) |
| :--- | :---: | :---: | :---: |
| **Next.js Web Server** (App Router & API Actions) | `4001` | **YES** | **Vercel** |
| **Socket.IO Server** (Lobby rooms messaging) | `4002` | **YES** | **Render** |
| **Python Resume Analysis API** (Resume Parser & RAG) | `8000` | **NO** (Local only) | None |
| **Python Adaptive AI Buddy API** (Difficulty algorithms) | `8001` | **NO** (Local only) | None |
| **Piston Local Engine** (Sandbox compiler to run code) | `2000` | **NO** (Local only) | None |
| **Redis Database** (Session State Storage) | `6379` | **NO** (Local only) | None (Docker Local) |

---

## ⚙️ Detailed Server Breakdown

### 1. Next.js Web Server (Port 4001)
* **Role:** Serves the frontend React user interface, handles middleware routes, and executes Server Actions (Auth, interview logic, database triggers).
* **Current Status:** Deployed to **Vercel** (Production-ready).
* **Alternative:** AWS Amplify, Netlify, or self-hosted Node Docker container on VPS.

### 2. Socket.IO Signaling Server (Port 4002)
* **Role:** Manages persistent WebSockets communication for collaborative buddy-mode rooms, syncing real-time voice, code editors, and whiteboard drawings.
* **Current Status:** Deployed to **Render** (Production-ready).
* **Alternative:** Railway, Heroku, or self-hosted Socket instance on VM.

### 3. Python Resume Analysis API (Port 8000)
* **Role:** Heavy computational server for processing PDF resumes, performing RAG metrics matching, and extracting custom interview topics.
* **Current Status:** Running locally.
* **Why not deployed:** High CPU/RAM demands for PDF parsing and local embed matching. Free-tier hosts (like Render) have limits of 512MB RAM, leading to Out Of Memory (OOM) crashes.
* **Alternative:** Deploy to **Hugging Face Spaces (using Docker Space template)** which offers 16GB RAM for free, or a **Railway / AWS EC2** instance.

### 4. Python Adaptive AI Buddy API (Port 8001)
* **Role:** Computes dynamic answer evaluations, tracks weak areas, and updates candidate difficulty levels on the fly using Redis.
* **Current Status:** Running locally.
* **Why not deployed:** Needs persistent memory storage connection (Redis) and continuous availability to avoid delay (cold-start lags) during live speech interviews.
* **Alternative:** Deploy to **Render (Paid Tier)** or **Railway** along with a cloud Redis connection.

### 5. Piston Sandbox Code Executor (Port 2000)
* **Role:** Safely isolates and executes untrusted compiler runtimes (C++, Python, Java, JS) submitted by candidates during competitive lobby rounds.
* **Current Status:** Running locally.
* **Why not deployed:** Executes raw code scripts directly on the host OS. Next.js serverless functions do not allow compiling and running native files.
* **Alternative:** Use the **Public Piston API** (`https://emkc.org/api/v2/piston`) directly instead of hosting it locally.

### 6. Redis Database (Port 6379)
* **Role:** High-speed in-memory store. Retains room participant counts, active drawing shapes, and adaptive interview states.
* **Current Status:** Running locally via Docker Container.
* **Alternative:** **Upstash Redis** (Serverless, free-tier cloud Redis that connects instantly using a single connection string).
