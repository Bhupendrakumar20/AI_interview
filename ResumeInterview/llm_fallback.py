import os
import requests
from dotenv import load_dotenv

# Load .env.local from the grandparent directory (project root)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
env_local_path = os.path.join(parent_dir, ".env.local")
if os.path.exists(env_local_path):
    load_dotenv(env_local_path)
else:
    load_dotenv()

def generate_with_fallback(prompt: str, temperature: float = 0.3, top_p: float = 0.9) -> str:
    """
    Tries to generate text using the following fallback chain:
    1. Ollama (local)
    2. Gemini API (cloud, via GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)
    3. Groq API (cloud, via GROQ_API_KEY)
    """
    # 1. Try Ollama
    ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
    if not ollama_url.endswith("/api/generate") and not ollama_url.endswith("/api/chat"):
        ollama_url = f"{ollama_url.rstrip('/')}/api/generate"
    model_name = os.environ.get("OLLAMA_MODEL", "gemma3:4b")

    print(f"[LLM Fallback] Attempting Ollama with model {model_name}...")
    try:
        response = requests.post(
            ollama_url,
            json={
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": top_p
                }
            },
            timeout=180 # reasonably short timeout for local ollama
        )
        response.raise_for_status()
        result = response.json().get("response")
        if result:
            print("[LLM Fallback] Ollama response received successfully.")
            return result
        raise Exception("Ollama returned empty response.")
    except Exception as e:
        print(f"[LLM Fallback] Ollama failed: {e}. Checking cloud fallbacks...")

    # 2. Try Gemini API
    gemini_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY") or os.environ.get("GROQ_API_KEY")
    # Wait, check if gemini_key looks like a Groq key (starts with gsk_). If so, we skip to Groq or let it fall through.
    if gemini_key and not gemini_key.startswith("gsk_"):
        print("[LLM Fallback] Attempting Gemini API...")
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": temperature
                }
            }
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            response.raise_for_status()
            res_json = response.json()
            result = res_json["candidates"][0]["content"]["parts"][0]["text"]
            if result:
                print("[LLM Fallback] Gemini API response received successfully.")
                return result
        except Exception as gemini_err:
            print(f"[LLM Fallback] Gemini API failed: {gemini_err}")

    # 3. Try Groq API
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        print("[LLM Fallback] Attempting Groq API...")
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature
            }
            response = requests.post(url, headers=headers, json=payload, timeout=20)
            response.raise_for_status()
            res_json = response.json()
            result = res_json["choices"][0]["message"]["content"]
            if result:
                print("[LLM Fallback] Groq API response received successfully.")
                return result
        except Exception as groq_err:
            print(f"[LLM Fallback] Groq API failed: {groq_err}")

    # If all fail, raise exception
    raise RuntimeError("All LLM providers (Ollama, Gemini, Groq) failed to generate a response.")
