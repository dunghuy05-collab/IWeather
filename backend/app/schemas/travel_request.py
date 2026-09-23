from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TravelStyle = Literal["backpacking", "comfort", "luxury", "family", "adventure", "culture"]


class TravelRequestCreate(BaseModel):
    destination: str = Field(min_length=2, max_length=120)
    budget: Decimal = Field(gt=0, le=1_000_000_000, max_digits=12, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    duration_days: int = Field(ge=1, le=365)
    travel_style: TravelStyle
    interests: list[str] = Field(min_length=1, max_length=10)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("destination", "notes")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return value.strip() if value else value

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()

    @field_validator("interests")
    @classmethod
    def normalize_interests(cls, values: list[str]) -> list[str]:
        normalized = list(dict.fromkeys(item.strip().lower() for item in values if item.strip()))
        if not normalized:
            raise ValueError("at least one valid interest is required")
        return normalized


class TravelRequestRead(TravelRequestCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime

