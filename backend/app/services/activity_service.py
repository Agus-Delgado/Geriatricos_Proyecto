from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any
from app.models.activity import ActivityEvent


def log_event(
    db: Session,
    *,
    facility_id: UUID,
    actor_user_id: UUID,
    event_type: str,
    entity_type: str,
    entity_id: UUID,
    summary: Optional[str] = None,
    event_metadata: Optional[Any] = None,
) -> ActivityEvent:
    from fastapi.encoders import jsonable_encoder
    safe_meta = jsonable_encoder(event_metadata or {})
    event = ActivityEvent(
        facility_id=facility_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        summary=summary,
        meta=safe_meta,
    )
    db.add(event)
    # No commit aquí; el caller debe committear junto con su transacción
    return event


def list_events(
    db: Session,
    *,
    facility_id: UUID,
    since: Optional[datetime] = None,
    limit: int = 50,
    event_types: Optional[List[str]] = None,
) -> List[ActivityEvent]:
    q = db.query(ActivityEvent).filter(ActivityEvent.facility_id == facility_id)
    if since:
        q = q.filter(ActivityEvent.created_at >= since)
    if event_types:
        q = q.filter(ActivityEvent.event_type.in_(event_types))
    return q.order_by(ActivityEvent.created_at.desc()).limit(limit).all()

