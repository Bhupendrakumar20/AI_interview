import json
from tracemalloc import stop
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# ==========================
# CONFIGURATION
# ==========================



QUESTION_BANK = "question_bank.json"

FAISS_INDEX = "interview_questions.faiss"

METADATA_FILE = "metadata.json"

_embedder = None

def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        print("\n⏳ Loading AI Model...")
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        print("✅ AI Model Loaded Successfully\n")
    return _embedder

# ==========================
# LOAD MODEL
# ==========================

print("Loading embedding model...")

model = get_embedder()

print("Model Loaded.")

# ==========================
# LOAD QUESTIONS
# ==========================

print("Loading question bank...")

with open(QUESTION_BANK, "r", encoding="utf-8") as f:
    documents = json.load(f)

print(f"Loaded {len(documents)} questions.")
embeddings = []
metadata = []

print("Generating embeddings...")

for i, doc in enumerate(documents):

    text = f"""
Category:
{doc["category"]}

Question:
{doc["question"]}
"""
    embedding = model.encode(
        text,
        normalize_embeddings=True
    )

    embeddings.append(embedding)

    metadata.append({
        "id": doc["id"],
        "category": doc["category"],
        "question": doc["question"]
    })

embeddings = np.array(embeddings).astype("float32")

print("Embeddings Generated.")




dimension = embeddings.shape[1]

index = faiss.IndexFlatIP(dimension)

index.add(embeddings)

print("FAISS index built.")

print("Total vectors:", index.ntotal)

# ==========================
# SAVE INDEX
# ==========================

faiss.write_index(index, FAISS_INDEX)

print("FAISS index saved.")

# ==========================
# SAVE METADATA
# ==========================

with open(METADATA_FILE, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=4, ensure_ascii=False)

print("Metadata saved.")

print("=" * 60)
print("Completed Successfully!")
print("=" * 60)