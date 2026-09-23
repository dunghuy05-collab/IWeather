from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TravelRequest(Base):
    __tablename__ = "travel_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    destination: Mapped[str] = mapped_column(String(120), index=True)
    budget: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    duration_days: Mapped[int]
    travel_style: Mapped[str] = mapped_column(String(40))
    interests: Mapped[list[str]] = mapped_column(JSON)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

