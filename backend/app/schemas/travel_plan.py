from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class TravelPlanChatRequest(BaseModel):
    messages: list[ConversationMessage] = Field(default_factory=list, max_length=20)


class TravelPlanResponse(BaseModel):
    request_id: str
    content: str
    model: str
    generated_at: datetime