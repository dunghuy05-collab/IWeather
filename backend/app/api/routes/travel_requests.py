from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.travel_request import TravelRequest
from app.schemas.travel_request import TravelRequestCreate, TravelRequestRead

router = APIRouter(prefix="/travel-requests", tags=["travel requests"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=TravelRequestRead, status_code=status.HTTP_201_CREATED)
def create_travel_request(payload: TravelRequestCreate, db: DatabaseSession) -> TravelRequest:
    travel_request = TravelRequest(**payload.model_dump())
    db.add(travel_request)
    db.commit()
    db.refresh(travel_request)
    return travel_request


@router.get("", response_model=list[TravelRequestRead])
def list_travel_requests(db: DatabaseSession) -> list[TravelRequest]:
    statement = select(TravelRequest).order_by(TravelRequest.created_at.desc())
    return list(db.scalars(statement))


@router.get("/{request_id}", response_model=TravelRequestRead)
def get_travel_request(request_id: str, db: DatabaseSession) -> TravelRequest:
    travel_request = db.get(TravelRequest, request_id)
    if travel_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel request not found",
        )
    return travel_request
