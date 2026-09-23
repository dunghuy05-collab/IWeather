from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.travel_request import TravelRequest  # noqa: F401

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(bind=test_engine)


def override_get_db() -> Generator[Session]:
    with Session(test_engine) as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def client() -> Generator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def test_root(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_health_check(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_read_travel_request(client: TestClient) -> None:
    payload = {
        "destination": "Da Nang, Vietnam",
        "budget": 1200,
        "currency": "usd",
        "duration_days": 5,
        "travel_style": "comfort",
        "interests": ["Food", "Beach", "food"],
        "notes": "Prefer a relaxed pace.",
    }

    created = client.post("/api/v1/travel-requests", json=payload)

    assert created.status_code == 201
    body = created.json()
    assert body["destination"] == "Da Nang, Vietnam"
    assert body["currency"] == "USD"
    assert body["interests"] == ["food", "beach"]

    fetched = client.get(f"/api/v1/travel-requests/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == body["id"]


def test_reject_invalid_travel_request(client: TestClient) -> None:
    response = client.post(
        "/api/v1/travel-requests",
        json={
            "destination": "X",
            "budget": 0,
            "duration_days": 0,
            "travel_style": "unknown",
            "interests": [],
        },
    )

    assert response.status_code == 422
