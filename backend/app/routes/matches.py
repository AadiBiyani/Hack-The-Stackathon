"""
Matches API: store match results from the TypeScript gateway and send Resend email.
"""

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from app.services.mongodb import get_db, save_matches, get_patient_by_id

router = APIRouter(prefix="/api", tags=["matches"])


class MatchItem(BaseModel):
    nct_id: str = Field(..., description="NCT trial ID")
    trial_title: Optional[str] = None
    match_score: int = Field(..., ge=0, le=100)
    reasoning: Optional[str] = None


class MatchesPayload(BaseModel):
    patient_id: str = Field(..., description="Patient ID")
    matches: List[MatchItem] = Field(..., max_length=10)
    send_email: bool = Field(default=True, description="Send Resend email to doctor/patient")


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

    if payload.send_email:
        patient = await get_patient_by_id(payload.patient_id)
        if patient and (patient.get("doctor_email") or patient.get("email")):
            try:
                await _send_resend_email(patient, matches_data)
            except Exception as e:
                # Don't fail the request if email fails
                pass  # Log in production

    return {
        "success": True,
        "patient_id": payload.patient_id,
        "stored": len(matches_data),
    }


async def _send_resend_email(patient: dict, matches: list):
    """Send match summary to doctor and/or patient via Resend."""
    try:
        import resend
    except ImportError:
        return
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        return
    resend.api_key = api_key

    from_email = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    lines = [
        f"Patient: {patient.get('name', 'N/A')}",
        f"Condition: {patient.get('condition', 'N/A')}",
        "",
        "Top trial matches:",
    ]
    for i, m in enumerate(matches[:3], 1):
        lines.append(f"{i}. {m.get('trial_title') or m.get('nct_id')} (score: {m.get('match_score')})")
        if m.get("reasoning"):
            lines.append(f"   {m['reasoning'][:200]}...")
    body = "\n".join(lines)

    to_emails = []
    if patient.get("doctor_email"):
        to_emails.append(patient["doctor_email"])
    if patient.get("email") and patient.get("email") not in to_emails:
        to_emails.append(patient["email"])
    if not to_emails:
        return

    resend.Emails.send({
        "from": from_email,
        "to": to_emails,
        "subject": "Clinical trial match results",
        "html": f"<pre>{body}</pre>",
    })
