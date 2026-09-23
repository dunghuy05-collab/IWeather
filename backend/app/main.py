from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, travel_plans, travel_requests
from app.core.config import settings
from app.db.session import create_database_tables


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    create_database_tables()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Backend API for the AI Personal Travel Planner.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix=settings.api_v1_prefix)
    app.include_router(travel_requests.router, prefix=settings.api_v1_prefix)
    app.include_router(travel_plans.router, prefix=settings.api_v1_prefix)

    @app.get("/", tags=["system"])
    async def root() -> dict[str, str]:
        return {
            "name": settings.app_name,
            "status": "running",
            "docs": "/docs",
        }

    return app


app = create_app()
