"""
Matches API: store match results from the TypeScript gateway and send Resend email.
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional

from app.services.mongodb import get_db, save_matches, get_patient_by_id, get_all_matches, get_matches_by_patient, get_cached_matches
from app.services.email import send_match_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["matches"])


@router.get("/patients/{patient_id}/cached-matches")
async def get_patient_cached_matches(patient_id: str):
    """
    Get cached matches for a patient.
    
    Returns the most recent match results stored on the patient document.
    Use this for quick retrieval without re-running the AI agent.
    """
    try:
        db = get_db()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    cached = await get_cached_matches(patient_id)
    
    if not cached:
        return {
            "success": True,
            "has_cached": False,
            "matches": [],
            "updated_at": None,
        }
    
    # Convert datetime to ISO string
    updated_at = cached.get("updated_at")
    if updated_at:
        updated_at = updated_at.isoformat()
    
    return {
        "success": True,
        "has_cached": True,
        "matches": cached.get("matches", []),
        "updated_at": updated_at,
    }


class MatchItem(BaseModel):
    nct_id: str = Field(..., description="NCT trial ID")
    trial_title: Optional[str] = None
    match_score: int = Field(..., ge=0, le=100)
    reasoning: Optional[str] = None


class MatchesPayload(BaseModel):
    patient_id: str = Field(..., description="Patient ID")
    matches: List[MatchItem] = Field(..., max_length=10)
    send_email: bool = Field(default=True, description="Send Resend email to doctor/patient")


@router.get("/matches")
async def list_matches(
    patient_id: Optional[str] = Query(default=None, description="Filter by patient ID"),
    limit: int = Query(default=100, ge=1, le=500, description="Maximum results")
):
    """
    Get all matches or filter by patient ID.
    """
    try:
        db = get_db()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database unavailable")

    if patient_id:
        matches = await get_matches_by_patient(patient_id)
    else:
        matches = await get_all_matches(limit=limit)
    
    # Convert ObjectId to string for JSON serialization
    for match in matches:
        if "_id" in match:
            match["_id"] = str(match["_id"])
        if "patient_id" in match:
            match["patient_id"] = str(match["patient_id"])
    
    return {
        "success": True,
        "count": len(matches),
        "matches": matches
    }


@router.post("/matches")
async def post_matches(payload: MatchesPayload):
    """
    Store match results from the gateway and optionally send email via Resend.
    Gateway calls this after the agent returns top 3 matches.
    """
    try:
        db = get_db()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database unavailable")

    matches_data = [m.model_dump() for m in payload.matches]
    await save_matches(payload.patient_id, matches_data)

    # Email notification
    email_result = {"sent": False, "skipped": True}
    
    if payload.send_email:
        patient = await get_patient_by_id(payload.patient_id)
        if patient:
            email_result = await send_match_notification(patient, matches_data)
            email_result["skipped"] = False
        else:
            email_result["error"] = "Patient not found"
            logger.warning(f"Cannot send email: Patient {payload.patient_id} not found")

    return {
        "success": True,
        "patient_id": payload.patient_id,
        "stored": len(matches_data),
        "email": email_result,
    }
