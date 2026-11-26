from fastapi.testclient import TestClient

from ResumeInterview.api import app


def test_competition_routes_are_registered_on_resume_api():
    routes = app.openapi()["paths"]

    assert "get" in routes["/api/competitions"]
    assert "post" in routes["/api/competitions/sync"]
    assert "get" in routes["/api/competitions/health"]


def test_competition_health_route_is_served_by_resume_api():
    response = TestClient(app).get("/api/competitions/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
