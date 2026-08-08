import os
import firebase_admin

from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv(".env.local")

project_id = os.getenv("FIREBASE_PROJECT_ID")
client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
private_key = os.getenv("FIREBASE_PRIVATE_KEY")

if not project_id:
    raise RuntimeError("FIREBASE_PROJECT_ID is missing")

if not client_email:
    raise RuntimeError("FIREBASE_CLIENT_EMAIL is missing")

if not private_key:
    raise RuntimeError("FIREBASE_PRIVATE_KEY is missing")


if not firebase_admin._apps:

    credential = credentials.Certificate({
        "type": "service_account",
        "project_id": project_id,
        "private_key": private_key.replace("\\n", "\n"),
        "client_email": client_email,
        "token_uri": "https://oauth2.googleapis.com/token",
    })

    firebase_admin.initialize_app(credential)


db = firestore.client()