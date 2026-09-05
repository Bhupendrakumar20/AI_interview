# ML Resume API

Render service settings:

- Root directory: repository root
- Build command: `pip install --no-cache-dir -r ResumeInterview/ml_api/requirements.txt`
- Start command: `uvicorn ResumeInterview.ml_api.api:app --host 0.0.0.0 --port $PORT --workers 1`
- Health check path: `/health`

This service owns `/generate-questions`, `/feedback`, and `/optimize-resume`.
Set `OLLAMA_URL` to a hosted Ollama-compatible endpoint. `localhost` will not reach a computer outside Render.
