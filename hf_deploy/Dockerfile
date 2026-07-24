FROM python:3.10-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm

# Copy the Python backend source files
COPY ResumeInterview/ ./ResumeInterview/

# Hugging Face Spaces runs on port 7860 by default
ENV PORT=7860
EXPOSE 7860

CMD ["uvicorn", "ResumeInterview.api:app", "--host", "0.0.0.0", "--port", "7860"]
