from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import unquote, urlparse


def _first_value(item: dict[str, Any], names: tuple[str, ...]) -> Any:
    for name in names:
        value = item.get(name)
        if value is not None and value != "":
            return value
    return None


def _text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, dict):
        value = value.get("name") or value.get("label") or value.get("value") or value.get("amount")
    if isinstance(value, list):
        parts = [_text(part) for part in value]
        text = ", ".join(part for part in parts if part)
        return text or None
    text = str(value).strip()
    return text or None


def _deadline(value: Any) -> datetime | None:
    text = _text(value)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime.fromisoformat(f"{text}T00:00:00+00:00")
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _safe_url(value: Any) -> str | None:
    text = _text(value)
    if not text:
        return None
    parsed = urlparse(text)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return text


def _tags(value: Any) -> list[str]:
    if not isinstance(value, list):
        value = [value] if value else []
    result = []
    for item in value:
        tag = _text(item)
        if tag and tag not in result:
            result.append(tag)
    return result[:20]


def _kaggle_slug(value: Any) -> str | None:
    text = _text(value)
    if not text:
        return None
    parsed = urlparse(text)
    path = parsed.path if parsed.scheme in {"http", "https"} else text
    slug = unquote(path).strip("/").split("/")[-1]
    return slug or None


def normalize_competition(source: str, item: dict[str, Any]) -> dict[str, Any] | None:
    title = _text(_first_value(item, ("title", "name", "competition_name", "opportunity_name")))
    url_value = _first_value(item, ("url", "link", "apply_url", "registration_url", "external_url", "ref"))
    url = _safe_url(url_value)
    kaggle_slug = _kaggle_slug(url_value) if source == "kaggle" else None
    if source == "kaggle" and kaggle_slug:
        if not title:
            title = re.sub(r"[-_]+", " ", kaggle_slug).strip().title()
        if not url:
            url = _safe_url(f"https://www.kaggle.com/competitions/{kaggle_slug}")
    source_id = _text(_first_value(item, ("id", "uuid", "slug", "competition_id", "opportunity_id", "ref"))) or url
    if not title or not source_id or (not url and source != "kaggle"):
        return None

    deadline = _deadline(_first_value(item, ("deadline", "registration_deadline", "end_date", "ends_at")))
    raw_status = (_text(_first_value(item, ("status", "state"))) or "").lower()
    now = datetime.now(timezone.utc)
    status_words = set(re.findall(r"[a-z]+", raw_status))
    if status_words.intersection({"closed", "ended", "expired", "complete", "completed", "finished"}):
        status = "closed"
    elif deadline and deadline < now:
        status = "closed"
    elif deadline and (deadline - now).total_seconds() <= 7 * 86400:
        status = "closing"
    else:
        status = "open"

    participants_value = _first_value(item, ("participants", "participants_count", "registrations_count", "teamCount", "team_count"))
    if isinstance(participants_value, dict):
        participants_value = participants_value.get("count") or participants_value.get("total")
    try:
        participants = int(participants_value) if participants_value is not None else None
        if participants is not None and participants < 0:
            participants = None
    except (TypeError, ValueError):
        participants = None

    prize_value = _first_value(item, ("prize", "prize_pool", "rewards", "prize_amount", "reward"))
    if isinstance(prize_value, dict):
        amount = prize_value.get("amount") or prize_value.get("value")
        currency = prize_value.get("currency") or prize_value.get("currency_code")
        prize = f"{currency} {amount}" if currency and amount else _text(prize_value)
    else:
        prize = _text(prize_value)

    return {
        "source": source,
        "source_id": str(source_id),
        "title": title[:300],
        "organizer": _text(_first_value(item, ("organizer", "organization", "organizationName", "host", "hostName", "company"))),
        "description": (_text(_first_value(item, ("description", "summary", "tagline"))) or "")[:12000],
        "url": url,
        "prize": prize[:300] if prize else None,
        "deadline": deadline,
        "participants": participants,
        "tags": _tags(_first_value(item, ("tags", "categories", "category", "themes", "skills"))),
        "status": status,
        "location": _text(_first_value(item, ("location", "venue"))),
        "format": _text(_first_value(item, ("format", "mode", "event_type"))),
    }
