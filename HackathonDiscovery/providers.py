from __future__ import annotations

import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import requests

from HackathonDiscovery.models import normalize_competition


SOURCES = ("unstop", "kaggle")
COLLECTION_KEYS = (
    "data",
    "results",
    "items",
    "opportunities",
    "competitions",
    "competitionList",
    "hackathons",
    "content",
)


class ProviderError(Exception):
    def __init__(self, source: str, message: str):
        super().__init__(message)
        self.source = source


def _extract_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []

    for key in COLLECTION_KEYS:
        nested = payload.get(key)
        if isinstance(nested, (dict, list)):
            found = _extract_items(nested)
            if found:
                return found

    if any(key in payload for key in ("title", "name", "competition_name", "opportunity_name")):
        return [payload]
    return []


def _normalize_items(source: str, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        competition
        for item in items
        if (competition := normalize_competition(source, item)) is not None
    ]


def _fetch_kaggle_competitions() -> tuple[list[dict[str, Any]], str | None]:
    token = os.getenv("KAGGLE_API_TOKEN", "").strip() or os.getenv("KAGGLE_API_KEY", "").strip()
    username = os.getenv("KAGGLE_USERNAME", "").strip()
    legacy_key = os.getenv("KAGGLE_KEY", "").strip() or os.getenv("KAGGLE_API_KEY", "").strip()
    if not token and not (username and legacy_key):
        return [], "not_configured"

    cli_environment = os.environ.copy()
    if token:
        cli_environment["KAGGLE_API_TOKEN"] = token
    if username:
        cli_environment["KAGGLE_USERNAME"] = username
    if legacy_key:
        cli_environment["KAGGLE_KEY"] = legacy_key

    try:
        result = subprocess.run(
            [sys.executable, "-m", "kaggle", "competitions", "list", "--format", "json"],
            capture_output=True,
            check=False,
            text=True,
            timeout=30,
            env=cli_environment,
        )
    except subprocess.TimeoutExpired as error:
        raise ProviderError("kaggle", "Kaggle CLI timed out while loading competitions.") from error
    except OSError as error:
        raise ProviderError("kaggle", "Could not start the Kaggle CLI.") from error

    if result.returncode:
        if "No module named kaggle" in result.stderr:
            raise ProviderError("kaggle", "Kaggle CLI is not installed. Install the project requirements.")
        raise ProviderError("kaggle", f"Kaggle CLI failed with exit code {result.returncode}.")
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise ProviderError("kaggle", "Kaggle CLI returned invalid JSON.") from error

    items = _extract_items(payload)
    normalized = _normalize_items("kaggle", items)
    if items and not normalized:
        raise ProviderError("kaggle", "Kaggle records did not include recognizable titles and links.")
    return normalized, None


def fetch_provider(source: str) -> tuple[list[dict[str, Any]], str | None]:
    if source == "kaggle":
        return _fetch_kaggle_competitions()

    source_prefix = source.upper()
    endpoint = os.getenv(f"{source_prefix}_API_URL", "").strip()
    if not endpoint:
        return [], "not_configured"

    headers = {"Accept": "application/json"}
    api_key = os.getenv(f"{source_prefix}_API_KEY", "").strip()
    if api_key:
        header_name = os.getenv(f"{source_prefix}_API_KEY_HEADER", "Authorization").strip()
        prefix = os.getenv(f"{source_prefix}_API_KEY_PREFIX", "Bearer").strip()
        headers[header_name] = f"{prefix} {api_key}".strip()

    try:
        response = requests.get(endpoint, headers=headers, timeout=(3.05, 8))
    except requests.RequestException as error:
        raise ProviderError(source, "Provider could not be reached.") from error

    if not response.ok:
        raise ProviderError(source, f"Provider returned HTTP {response.status_code}.")
    try:
        payload = response.json()
    except ValueError as error:
        raise ProviderError(source, "Provider returned invalid JSON.") from error

    items = _extract_items(payload)
    recognized_shape = isinstance(payload, list) or (
        isinstance(payload, dict) and any(key in payload for key in COLLECTION_KEYS)
    )
    if not items and not recognized_shape:
        raise ProviderError(source, "Provider response did not contain a recognized opportunity list.")
    if isinstance(payload, list) and payload and not items:
        raise ProviderError(source, "Provider response did not contain recognizable opportunity records.")
    normalized = _normalize_items(source, items)
    if items and not normalized:
        raise ProviderError(source, "Provider records did not include recognizable titles and links.")
    return normalized, None


def fetch_all_providers() -> dict[str, tuple[list[dict[str, Any]], str | None]]:
    results: dict[str, tuple[list[dict[str, Any]], str | None]] = {}
    with ThreadPoolExecutor(max_workers=len(SOURCES)) as executor:
        futures = {executor.submit(fetch_provider, source): source for source in SOURCES}
        for future in as_completed(futures):
            source = futures[future]
            try:
                results[source] = future.result()
            except ProviderError as error:
                results[source] = ([], str(error))
    return results
