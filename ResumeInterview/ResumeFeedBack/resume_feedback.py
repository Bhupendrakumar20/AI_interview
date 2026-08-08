"""
ResumeFeedBack/feedback.py

Refactored from your original CLI script. Same prompt and Ollama call,
but the interactive `while True / input()` loop that reads file paths
from the terminal is gone — an API server can't prompt anyone for input,
so it's replaced with a single function that takes the data directly.
"""

import os
import json
import requests

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
if "localhost" in OLLAMA_URL:
    OLLAMA_URL = OLLAMA_URL.replace("localhost", "127.0.0.1")
if not OLLAMA_URL.endswith("/api/generate") and not OLLAMA_URL.endswith("/api/chat"):
    OLLAMA_URL = f"{OLLAMA_URL.rstrip('/')}/api/generate"
MODEL_NAME = os.environ.get("OLLAMA_MODEL", "gemma3:4b")

PROMPT = """
You are an ATS Resume Expert.

You are given:

1. ATS Analysis JSON
2. Job Description

Your task:

- Explain overall ATS score.
- Explain strengths.
- Explain weaknesses.
- Explain missing skills.
- Explain ATS passing chances.
- Suggest top improvements.

Rules:

- Keep answer under 250 words.
- Use simple English.
- Be honest and constructive.

ATS JSON:

{ats}


JOB DESCRIPTION:

{jd}


Answer:
"""


def ask_ollama(ats_json: dict, jd_text: str) -> str:
    prompt = PROMPT.format(
        ats=json.dumps(ats_json, indent=2),
        jd=jd_text
    )

    try:
        try:
            from llm_fallback import generate_with_fallback
        except ImportError:
            import sys
            parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if parent_dir not in sys.path:
                sys.path.append(parent_dir)
            from llm_fallback import generate_with_fallback
        return generate_with_fallback(prompt, temperature=0.3, top_p=0.9)
    except Exception as e:
        print(f"[Fallback Import/Execution Warning] Using direct Ollama request due to: {e}")
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.3, "top_p": 0.9}
            }
        )
        response.raise_for_status()
        return response.json()["response"]



# -----------------------------
# API ENTRYPOINT — this is what api.py imports
# -----------------------------
def get_ats_feedback(ats_json: dict, jd_text: str) -> str:
    """
    Takes the ATS score result (e.g. from ATSScoreChecker.score_resume)
    plus the job description text, and returns a plain-English feedback
    paragraph.
    """
    return ask_ollama(ats_json, jd_text)


# -----------------------------
# CLI — only runs when executed directly, never on import
# -----------------------------
if __name__ == "__main__":
    while True:
        print("\n============================")
        print("ATS Analyzer using Ollama")
        print("============================")

        ats_path = input("\nEnter ATS JSON path (q to quit): ")
        if ats_path.lower() == "q":
            break

        jd_path = input("Enter JD txt path: ")

        try:
            with open(ats_path, "r", encoding="utf-8") as f:
                ats_json = json.load(f)

            with open(jd_path, "r", encoding="utf-8", errors="replace") as f:
                jd_text = f.read()

            print("\nGenerating response...\n")
            result = get_ats_feedback(ats_json, jd_text)

            print("\n========== RESULT ==========\n")
            print(result)
            print("\n============================\n")

        except FileNotFoundError:
            print("\nFile not found.\n")
        except json.JSONDecodeError:
            print("\nInvalid JSON file.\n")
        except requests.exceptions.ConnectionError:
            print("\nCannot connect to Ollama.")
            print("Please run:")
            print("ollama serve\n")
        except Exception as e:
            print("\nERROR:\n")
            print(e)