"""
Email Service using Resend

Sends clinical trial match notifications to patients and doctors.
"""

import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Check if resend is available
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend package not installed. Email notifications disabled.")


def get_resend_config() -> tuple[Optional[str], str]:
    """Get Resend configuration from environment."""
    api_key = os.environ.get("RESEND_API_KEY")
    from_email = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    return api_key, from_email


def format_condition(condition: str) -> str:
    """Format condition name for display."""
    return condition.replace("_", " ").title()


def build_email_html(patient: Dict[str, Any], matches: List[Dict[str, Any]]) -> str:
    """Build a professional HTML email template."""
    
    patient_name = patient.get("name", "Patient")
    condition = format_condition(patient.get("condition", "Unknown"))
    
    # Build match cards HTML
    match_cards = ""
    for i, match in enumerate(matches[:3], 1):
        nct_id = match.get("nct_id", "Unknown")
        title = match.get("trial_title") or nct_id
        score = match.get("match_score", 0)
        reasoning = match.get("reasoning", "")
        
        # Score color
        if score >= 80:
            score_color = "#22c55e"  # green
            score_bg = "#dcfce7"
        elif score >= 60:
            score_color = "#eab308"  # yellow
            score_bg = "#fef9c3"
        else:
            score_color = "#f97316"  # orange
            score_bg = "#ffedd5"
        
        match_cards += f"""
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid {score_color};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                    <span style="background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">#{i}</span>
                    <span style="background: {score_bg}; color: {score_color}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">{score}% Match</span>
                </div>
            </div>
            <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #1e293b;">{title}</h3>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">Trial ID: {nct_id}</p>
            {f'<p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">{reasoning[:300]}{"..." if len(reasoning) > 300 else ""}</p>' if reasoning else ''}
            <a href="https://clinicaltrials.gov/study/{nct_id}" style="display: inline-block; margin-top: 12px; color: #2563eb; font-size: 13px; text-decoration: none;">View on ClinicalTrials.gov →</a>
        </div>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="text-align: center; padding: 24px 0; border-bottom: 1px solid #e2e8f0;">
            <h1 style="margin: 0; font-size: 24px; color: #0f172a;">🏥 MatchPoint - Clinical Trial Matches Found</h1>
        </div>
        
        <!-- Patient Info -->
        <div style="padding: 20px 0; border-bottom: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Patient Information</p>
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;">{patient_name}</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">Condition: {condition}</p>
        </div>
        
        <!-- Matches -->
        <div style="padding: 20px 0;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e293b;">Top Matching Trials</h2>
            {match_cards}
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px 0; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
                This is an automated notification from MatchPoint.
            </p>
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                Please consult with your healthcare provider before enrolling in any clinical trial.
            </p>
        </div>
        
    </body>
    </html>
    """
    
    return html


def build_plain_text(patient: Dict[str, Any], matches: List[Dict[str, Any]]) -> str:
    """Build plain text version of the email."""
    
    patient_name = patient.get("name", "Patient")
    condition = format_condition(patient.get("condition", "Unknown"))
    
    lines = [
        "MATCHPOINT - Clinical Trial Matches Found",
        "=" * 40,
        "",
        f"Patient: {patient_name}",
        f"Condition: {condition}",
        "",
        "TOP MATCHING TRIALS",
        "-" * 40,
    ]
    
    for i, match in enumerate(matches[:3], 1):
        nct_id = match.get("nct_id", "Unknown")
        title = match.get("trial_title") or nct_id
        score = match.get("match_score", 0)
        reasoning = match.get("reasoning", "")
        
        lines.append(f"\n#{i} - {score}% Match")
        lines.append(f"Title: {title}")
        lines.append(f"Trial ID: {nct_id}")
        if reasoning:
            lines.append(f"Why: {reasoning[:200]}...")
        lines.append(f"Link: https://clinicaltrials.gov/study/{nct_id}")
    
    lines.extend([
        "",
        "-" * 40,
        "This is an automated notification from MatchPoint.",
        "Please consult with your healthcare provider before enrolling.",
    ])
    
    return "\n".join(lines)


async def send_match_notification(
    patient: Dict[str, Any],
    matches: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Send match notification email to patient and/or doctor.
    
    Args:
        patient: Patient data including email and doctor_email
        matches: List of trial matches
        
    Returns:
        Dict with success status and details
    """
    result = {
        "sent": False,
        "recipients": [],
        "error": None,
    }
    
    # Check if Resend is available
    if not RESEND_AVAILABLE:
        result["error"] = "Resend package not installed"
        logger.warning("Cannot send email: Resend not installed")
        return result
    
    # Get configuration
    api_key, from_email = get_resend_config()
    
    if not api_key:
        result["error"] = "RESEND_API_KEY not configured"
        logger.warning("Cannot send email: RESEND_API_KEY not set")
        return result
    
    # Set API key
    resend.api_key = api_key
    
    # Collect recipients
    to_emails = []
    if patient.get("doctor_email"):
        to_emails.append(patient["doctor_email"])
    if patient.get("email") and patient.get("email") not in to_emails:
        to_emails.append(patient["email"])
    
    if not to_emails:
        result["error"] = "No recipient email addresses"
        logger.info("Cannot send email: No recipient addresses for patient")
        return result
    
    # Build email content
    html_content = build_email_html(patient, matches)
    text_content = build_plain_text(patient, matches)
    
    patient_name = patient.get("name", "Patient")
    condition = format_condition(patient.get("condition", "Unknown"))
    
    try:
        print(f"📧 Attempting to send email to: {to_emails}")
        print(f"   From: {from_email}")
        print(f"   Subject: MatchPoint - Clinical Trial Matches for {patient_name} ({condition})")
        
        response = resend.Emails.send({
            "from": from_email,
            "to": to_emails,
            "subject": f"MatchPoint: Clinical Trial Matches for {patient_name} ({condition})",
            "html": html_content,
            "text": text_content,
        })
        
        result["sent"] = True
        result["recipients"] = to_emails
        result["resend_id"] = response.get("id") if isinstance(response, dict) else str(response)
        
        print(f"✉️  Email sent successfully! Resend ID: {result['resend_id']}")
        logger.info(f"✉️  Email sent to {to_emails} for patient {patient_name}")
        
    except Exception as e:
        result["error"] = str(e)
        print(f"❌ Failed to send email: {e}")
        logger.error(f"❌ Failed to send email: {e}")
    
    return result
