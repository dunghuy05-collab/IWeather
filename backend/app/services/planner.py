from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings
from app.models.travel_request import TravelRequest
from app.schemas.travel_plan import ConversationMessage, TravelPlanResponse

SYSTEM_PROMPT = """You are WanderMind, a practical AI travel planner.
Create useful, realistic travel plans from the user's saved travel requirements.
Respond in the same language as the user's latest message, preferably Vietnamese.
When generating an initial plan, include:
1. A short trip overview.
2. A day-by-day itinerary with morning, afternoon, and evening activities.
3. An estimated budget breakdown in the requested currency.
4. Practical assumptions and tips.
Never claim live prices, availability, or weather data unless a tool explicitly provides it.
Be concise enough for a web response and clearly label estimates.
"""


class PlannerConfigurationError(RuntimeError):
    """The LLM provider is not configured for this environment."""


class PlannerProviderError(RuntimeError):
    """The LLM provider failed to produce a response."""


class TravelPlanner:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise PlannerConfigurationError("OPENAI_API_KEY is not configured")
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.llm_timeout_seconds,
        )

    async def create_plan(
        self,
        travel_request: TravelRequest,
        conversation: Sequence[ConversationMessage] = (),
    ) -> TravelPlanResponse:
        messages: list[dict[str, str]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": self._request_prompt(travel_request)},
        ]
        messages.extend(
            {"role": message.role, "content": message.content}
            for message in conversation
        )

        try:
            completion = await self.client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=0.7,
            )
        except Exception as error:
            raise PlannerProviderError("The travel planner provider is unavailable") from error

        content = completion.choices[0].message.content if completion.choices else None
        if not content:
            raise PlannerProviderError("The travel planner returned an empty response")

        return TravelPlanResponse(
            request_id=travel_request.id,
            content=content,
            model=completion.model or settings.openai_model,
            generated_at=datetime.now(UTC),
        )

    @staticmethod
    def _request_prompt(travel_request: TravelRequest) -> str:
        request_data: dict[str, Any] = {
            "destination": travel_request.destination,
            "budget": f"{travel_request.budget} {travel_request.currency}",
            "duration_days": travel_request.duration_days,
            "travel_style": travel_request.travel_style,
            "interests": travel_request.interests,
            "notes": travel_request.notes or "None",
        }
        return "Saved travel requirements:\n" + "\n".join(
            f"- {key}: {value}" for key, value in request_data.items()
        )