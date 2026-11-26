from datetime import datetime, timezone
import json
import subprocess

import pytest

from HackathonDiscovery.models import normalize_competition
from HackathonDiscovery.providers import ProviderError, _extract_items, fetch_provider


def test_normalize_competition_maps_provider_fields():
    result = normalize_competition(
        "unstop",
        {
            "id": 27,
            "name": "Build for Good",
            "organization": {"name": "Community Lab"},
            "summary": "A civic technology challenge",
            "url": "https://example.com/hackathon",
            "deadline": "2099-12-31",
            "participants_count": "42",
            "themes": [{"name": "AI"}, "Civic Tech"],
            "prize_pool": {"amount": 5000, "currency": "USD"},
        },
    )

    assert result is not None
    assert result["source_id"] == "27"
    assert result["title"] == "Build for Good"
    assert result["organizer"] == "Community Lab"
    assert result["participants"] == 42
    assert result["tags"] == ["AI", "Civic Tech"]
    assert result["prize"] == "USD 5000"
    assert result["status"] == "open"
    assert result["deadline"] == datetime(2099, 12, 31, tzinfo=timezone.utc)


def test_normalize_kaggle_cli_fields():
    result = normalize_competition(
        "kaggle",
        {
            "id": 3136,
            "ref": "titanic",
            "reward": "Knowledge",
            "teamCount": 847,
            "category": "Getting Started",
        },
    )

    assert result is not None
    assert result["title"] == "Titanic"
    assert result["url"] == "https://www.kaggle.com/competitions/titanic"
    assert result["participants"] == 847
    assert result["prize"] == "Knowledge"
    assert result["tags"] == ["Getting Started"]


def test_normalize_competition_rejects_missing_or_unsafe_links():
    assert normalize_competition("unstop", {"id": 1, "title": "Missing link"}) is None
    assert normalize_competition(
        "unstop",
        {"id": 2, "title": "Unsafe link", "url": "javascript:alert(1)"},
    ) is None


def test_kaggle_competition_can_be_listed_without_a_link():
    result = normalize_competition(
        "kaggle",
        {"id": 42, "title": "Kaggle Challenge", "reward": "Knowledge"},
    )

    assert result is not None
    assert result["source_id"] == "42"
    assert result["title"] == "Kaggle Challenge"
    assert result["url"] is None


def test_status_matching_does_not_treat_incomplete_as_closed():
    result = normalize_competition(
        "kaggle",
        {
            "id": 3,
            "title": "Ongoing challenge",
            "url": "https://example.com/challenge",
            "status": "incomplete",
        },
    )
    assert result is not None
    assert result["status"] == "open"


def test_extract_items_supports_nested_provider_payloads():
    payload = {"data": {"opportunities": [{"id": 1}, {"id": 2}]}}
    assert _extract_items(payload) == [{"id": 1}, {"id": 2}]


def test_provider_uses_configured_auth_without_exposing_credentials(monkeypatch):
    observed = {}

    class Response:
        ok = True

        @staticmethod
        def json():
            return [{"id": 9, "title": "Open challenge", "url": "https://example.com/9"}]

    def fake_get(endpoint, headers, timeout):
        observed.update(endpoint=endpoint, headers=headers, timeout=timeout)
        return Response()

    monkeypatch.setenv("UNSTOP_API_URL", "https://provider.example/api")
    monkeypatch.setenv("UNSTOP_API_KEY", "test-secret")
    monkeypatch.setenv("UNSTOP_API_KEY_HEADER", "x-api-key")
    monkeypatch.setenv("UNSTOP_API_KEY_PREFIX", "")
    monkeypatch.setattr("HackathonDiscovery.providers.requests.get", fake_get)

    items, status = fetch_provider("unstop")

    assert status is None
    assert len(items) == 1
    assert observed["headers"]["x-api-key"] == "test-secret"
    assert "test-secret" not in repr(items)


def test_provider_reports_unrecognized_response_shape(monkeypatch):
    class Response:
        ok = True

        @staticmethod
        def json():
            return {"unexpected": [{"name": "Challenge"}]}

    monkeypatch.setenv("UNSTOP_API_URL", "https://provider.example/api")
    monkeypatch.setattr("HackathonDiscovery.providers.requests.get", lambda *args, **kwargs: Response())

    with pytest.raises(ProviderError, match="did not contain a recognized opportunity list"):
        fetch_provider("unstop")


def test_kaggle_provider_uses_official_cli_and_api_token(monkeypatch):
    observed = {}

    def fake_run(command, **kwargs):
        observed["command"] = command
        observed["env"] = kwargs["env"]
        return subprocess.CompletedProcess(
            command,
            0,
            stdout=json.dumps([{
                "id": 3136,
                "title": "Titanic Challenge",
                "ref": "titanic",
                "reward": "Knowledge",
                "teamCount": 847,
            }]),
            stderr="",
        )

    monkeypatch.setenv("KAGGLE_API_KEY", "test-token")
    monkeypatch.setenv("KAGGLE_USERNAME", "test-user")
    monkeypatch.setattr("HackathonDiscovery.providers.subprocess.run", fake_run)

    items, error = fetch_provider("kaggle")

    assert error is None
    assert items[0]["url"] == "https://www.kaggle.com/competitions/titanic"
    assert observed["env"]["KAGGLE_API_TOKEN"] == "test-token"
    assert observed["env"]["KAGGLE_USERNAME"] == "test-user"
    assert observed["command"][-3:] == ["list", "--format", "json"]
