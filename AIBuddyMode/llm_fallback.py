# llm_fallback.py
import os
import time
import logging
import requests
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
env_local_path = os.path.join(parent_dir, ".env.local")
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)
else:
    load_dotenv()

# llm_fallback.py — add near the top, after load_dotenv calls
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
if not OLLAMA_URL.endswith("/api/generate") and not OLLAMA_URL.endswith("/api/chat"):
    OLLAMA_URL = f"{OLLAMA_URL.rstrip('/')}/api/generate"
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "gemma3:4b")

logger = logging.getLogger("llm_fallback")


def generate_with_fallback(prompt: str, temperature: float = 0.3, top_p: float = 0.9,
                            num_predict: int = 1024) -> dict:
    """
    Fallback chain for the adaptive interview's question generation and evaluation:
    1. Ollama (local)
    2. Gemini API (cloud)
    3. Groq API (cloud)

    Returns {"text": str, "source": "ollama" | "gemini" | "groq"} instead of a bare
    string, so callers (evaluator.py, question_gen.py) can log/surface which
    provider actually answered — useful when debugging inconsistent JSON
    formatting between models.
    """
    # 1. Try Ollama
    ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
    if not ollama_url.endswith("/api/generate") and not ollama_url.endswith("/api/chat"):
        ollama_url = f"{ollama_url.rstrip('/')}/api/generate"
    model_name = os.environ.get("OLLAMA_MODEL", "gemma3:4b")

    logger.info(f"[LLM Fallback] Attempting Ollama with model {model_name}...")
    start = time.time()
    try:
        response = requests.post(
            ollama_url,
            json={
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": top_p,
                    "num_predict": num_predict,
                },
            },
            timeout=60,  # generous enough for a warm local model; adjust if you see frequent timeouts
        )
        response.raise_for_status()
        result = response.json().get("response")
        elapsed = round(time.time() - start, 1)
        if result and result.strip():
            logger.info(f"[LLM Fallback] Ollama responded in {elapsed}s")
            return {"text": result, "source": "ollama"}
        raise Exception("Ollama returned empty response.")
    except Exception as e:
        logger.warning(f"[LLM Fallback] Ollama failed after {round(time.time() - start, 1)}s: {e}. Trying cloud fallbacks...")

    # 2. Try Gemini API
    gemini_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
    if gemini_key:
        logger.info("[LLM Fallback] Attempting Gemini API...")
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": temperature},
            }
            response = requests.post(url, headers={"Content-Type": "application/json"},
                                      json=payload, timeout=20)
            response.raise_for_status()
            res_json = response.json()
            result = res_json["candidates"][0]["content"]["parts"][0]["text"]
            if result and result.strip():
                logger.info("[LLM Fallback] Gemini API responded successfully.")
                return {"text": result, "source": "gemini"}
        except Exception as gemini_err:
            logger.warning(f"[LLM Fallback] Gemini API failed: {gemini_err}")

    # 3. Try Groq API
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        logger.info("[LLM Fallback] Attempting Groq API...")
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
            }
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            response.raise_for_status()
            res_json = response.json()
            result = res_json["choices"][0]["message"]["content"]
            if result and result.strip():
                logger.info("[LLM Fallback] Groq API responded successfully.")
                return {"text": result, "source": "groq"}
        except Exception as groq_err:
            logger.warning(f"[LLM Fallback] Groq API failed: {groq_err}")

    raise RuntimeError("All LLM providers (Ollama, Gemini, Groq) failed to generate a response.")