from unittest.mock import MagicMock

from HackathonDiscovery import database


def test_upsert_uses_cursor_executemany(monkeypatch):
    connection = MagicMock()
    cursor = connection.cursor.return_value.__enter__.return_value
    connection_context = MagicMock()
    connection_context.__enter__.return_value = connection

    monkeypatch.setattr(database, "ensure_schema", lambda: None)
    monkeypatch.setattr(database, "_connect", lambda: connection_context)

    count = database.upsert_competitions(
        [
            {
                "source": "kaggle",
                "source_id": "titanic",
                "title": "Titanic Challenge",
                "url": "https://www.kaggle.com/competitions/titanic",
            }
        ]
    )

    assert count == 1
    cursor.executemany.assert_called_once()
