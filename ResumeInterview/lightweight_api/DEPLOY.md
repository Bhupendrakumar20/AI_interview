# Lightweight Resume API

Render service settings:

- Root directory: repository root
- Build command: `pip install --no-cache-dir -r ResumeInterview/lightweight_api/requirements.txt`
- Start command: `uvicorn ResumeInterview.lightweight_api.api:app --host 0.0.0.0 --port $PORT --workers 1`
- Health check path: `/health`

This service owns `/parse` and the memory-safe lexical `/ats-score` endpoint.
