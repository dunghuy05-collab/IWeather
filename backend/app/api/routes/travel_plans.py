from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.travel_request import TravelRequest
from app.schemas.travel_plan import TravelPlanChatRequest, TravelPlanResponse
from app.services.planner import (
    PlannerConfigurationError,
    PlannerProviderError,
    TravelPlanner,
)

router = APIRouter(prefix="/travel-requests", tags=["travel plans"])


def get_planner() -> TravelPlanner:
    try:
        return TravelPlanner()
    except PlannerConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Travel planner is not configured",
        ) from error


def get_travel_request(request_id: str, db: Session) -> TravelRequest:
    travel_request = db.get(TravelRequest, request_id)
    if travel_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel request not found",
        )
    return travel_request


@router.post("/{request_id}/plan", response_model=TravelPlanResponse)
async def create_travel_plan(
    request_id: str,
    db: Session = Depends(get_db),
    planner: TravelPlanner = Depends(get_planner),
) -> TravelPlanResponse:
    travel_request = get_travel_request(request_id, db)
    try:
        return await planner.create_plan(travel_request)
    except PlannerProviderError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Travel planner provider failed",
        ) from error


@router.post("/{request_id}/chat", response_model=TravelPlanResponse)
async def continue_travel_plan(
    request_id: str,
    payload: TravelPlanChatRequest,
    db: Session = Depends(get_db),
    planner: TravelPlanner = Depends(get_planner),
) -> TravelPlanResponse:
    travel_request = get_travel_request(request_id, db)
    if not payload.messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one conversation message is required",
        )
    try:
        return await planner.create_plan(travel_request, payload.messages)
    except PlannerProviderError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Travel planner provider failed",
        ) from error