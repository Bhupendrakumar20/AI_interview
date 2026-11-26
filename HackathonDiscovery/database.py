from __future__ import annotations

import os
from pathlib import Path
from threading import Lock
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


_schema_lock = Lock()
_schema_ready = False
_SCHEMA_FILE = Path(__file__).resolve().parents[1] / "database" / "competition-opportunities.sql"


def _database_url() -> str:
    value = os.getenv("DATABASE_URL", "").strip()
    if not value:
        raise RuntimeError("DATABASE_URL is not configured.")
    return value


def _connect():
    return psycopg.connect(_database_url(), row_factory=dict_row)


def ensure_schema() -> None:
    global _schema_ready
    if _schema_ready:
        return
    with _schema_lock:
        if _schema_ready:
            return
        schema = _SCHEMA_FILE.read_text(encoding="utf-8")
        with _connect() as connection:
            for statement in schema.split(";"):
                if statement.strip():
                    connection.execute(statement)
        _schema_ready = True


def upsert_competitions(items: list[dict[str, Any]]) -> int:
    if not items:
        return 0
    ensure_schema()
    values = [
        (
            item["source"],
            item["source_id"],
            item["title"],
            item.get("organizer"),
            item.get("description", ""),
            item["url"],
            item.get("prize"),
            item.get("deadline"),
            item.get("participants"),
            Jsonb(item.get("tags", [])),
            item.get("status", "open"),
            item.get("location"),
            item.get("format"),
        )
        for item in items
    ]
    with _connect() as connection:
        with connection.cursor() as cursor:
            cursor.executemany(
                """
            INSERT INTO competition_opportunities (
                source, source_id, title, organizer, description, url, prize,
                deadline, participants, tags, status, location, format
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (source, source_id) DO UPDATE SET
                title = EXCLUDED.title,
                organizer = EXCLUDED.organizer,
                description = EXCLUDED.description,
                url = EXCLUDED.url,
                prize = EXCLUDED.prize,
                deadline = EXCLUDED.deadline,
                participants = EXCLUDED.participants,
                tags = EXCLUDED.tags,
                status = EXCLUDED.status,
                location = EXCLUDED.location,
                format = EXCLUDED.format,
                updated_at = NOW(),
                last_synced_at = NOW()
            """,
                values,
            )
    return len(items)


def list_competitions(
    search: str | None,
    source: str | None,
    status: str | None,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    ensure_schema()
    conditions = []
    parameters: list[Any] = []
    if search:
        conditions.append("(title ILIKE %s OR organizer ILIKE %s OR description ILIKE %s OR tags::text ILIKE %s)")
        pattern = f"%{search}%"
        parameters.extend((pattern, pattern, pattern, pattern))
    if source:
        conditions.append("source = %s")
        parameters.append(source)
    if status == "open":
        conditions.append("status IN ('open', 'closing')")
    elif status:
        conditions.append("status = %s")
        parameters.append(status)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    with _connect() as connection:
        total = connection.execute(
            f"SELECT COUNT(*) AS count FROM competition_opportunities {where_clause}",
            parameters,
        ).fetchone()["count"]
        rows = connection.execute(
            f"""
            SELECT source, source_id, title, organizer, description, url, prize,
                   deadline, participants, tags, status, location, format, last_synced_at
            FROM competition_opportunities
            {where_clause}
            ORDER BY
                CASE status WHEN 'open' THEN 0 WHEN 'closing' THEN 1 ELSE 2 END,
                deadline ASC NULLS LAST,
                updated_at DESC
            LIMIT %s OFFSET %s
            """,
            [*parameters, limit, offset],
        ).fetchall()
    return [dict(row) for row in rows], total
