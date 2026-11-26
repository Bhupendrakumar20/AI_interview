from __future__ import annotations

import logging
import os
from pathlib import Path
from threading import Lock
from typing import Any

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query

from HackathonDiscovery.database import ensure_schema, list_competitions, upsert_competitions
from HackathonDiscovery.providers import SOURCES, fetch_all_providers


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env.local", override=False)
load_dotenv(ROOT_DIR / ".env", override=False)

logger = logging.getLogger(__name__)
app = FastAPI(title="PrepWise Hackathon Discovery API", version="1.0.0")
_sync_lock = Lock()


def _database_ready() -> None:
    try:
        ensure_schema()
    except (RuntimeError, psycopg.Error) as error:
        logger.exception("Competition database is unavailable.")
        raise HTTPException(
            status_code=503,
            detail="Competition database is unavailable or not configured.",
        ) from error


@app.get("/health")
def health() -> dict[str, Any]:
    configured_sources = [
        source
        for source in SOURCES
        if (
            source == "kaggle"
            and (
                os.getenv("KAGGLE_API_TOKEN")
                or os.getenv("KAGGLE_API_KEY")
                or (os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY"))
            )
        )
        or (
            source != "kaggle"
            and os.getenv(f"{source.upper()}_API_URL")
        )
    ]
    return {
        "status": "ok",
        "database_configured": bool(os.getenv("DATABASE_URL")),
        "configured_sources": configured_sources,
    }


@app.get("/api/competitions")
def get_competitions(
    search: str | None = Query(default=None, max_length=120),
    source: str | None = Query(default=None, pattern="^(unstop|kaggle)$"),
    status: str | None = Query(default=None, pattern="^(open|closing|closed)$"),
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    _database_ready()
    try:
        items, total = list_competitions(search, source, status, limit, offset)
    except psycopg.Error as error:
        logger.exception("Could not query competition listings.")
        raise HTTPException(status_code=503, detail="Could not read competition listings.") from error
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@app.post("/api/competitions/sync")
def sync_competitions() -> dict[str, Any]:
    _database_ready()
    if not _sync_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A competition refresh is already running.")
    try:
        results = fetch_all_providers()
        provider_report = []
        all_items = []
        for source in SOURCES:
            items, error = results[source]
            if error == "not_configured":
                provider_report.append({
                    "source": source,
                    "status": "not_configured",
                    "count": 0,
                    "error": None,
                })
                continue
            if error:
                provider_report.append({
                    "source": source,
                    "status": "error",
                    "count": 0,
                    "error": error,
                })
                continue
            all_items.extend(items)
            provider_report.append({
                "source": source,
                "status": "ok",
                "count": len(items),
                "error": None,
            })

        try:
            upsert_competitions(all_items)
        except psycopg.Error as error:
            logger.exception("Could not store refreshed competition listings.")
            raise HTTPException(
                status_code=503,
                detail="Could not save refreshed competition listings.",
            ) from error

        return {"synced": len(all_items), "providers": provider_report}
    finally:
        _sync_lock.release()
