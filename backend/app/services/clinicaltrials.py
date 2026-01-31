"""
ClinicalTrials.gov API Service

Fetches clinical trial data from the official US government API.
API Docs: https://clinicaltrials.gov/data-api/api
"""

import httpx
from typing import Optional, List, Dict, Any

CLINICALTRIALS_API = "https://clinicaltrials.gov/api/v2/studies"


def format_condition_for_api(condition: str) -> str:
    """
    Convert normalized condition name to API-friendly format.
    
    Examples:
        alzheimers_disease -> Alzheimer's Disease
        multiple_sclerosis -> Multiple Sclerosis
        breast_cancer -> Breast Cancer
    """
    # Replace underscores with spaces
    formatted = condition.replace("_", " ")
    
    # Title case
    formatted = formatted.title()
    
    # Handle special cases for better API matching
    replacements = {
        "Alzheimers": "Alzheimer's",
        "Parkinsons": "Parkinson's",
        "Type 2 Diabetes": "Diabetes Mellitus, Type 2",
        "Diabetes Type 2": "Diabetes Mellitus, Type 2",
    }
    
    for old, new in replacements.items():
        if old in formatted:
            formatted = formatted.replace(old, new)
    
    return formatted


async def fetch_trials(
    condition: str,
    status: str = "RECRUITING",
    page_size: int = 50,
    page_token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fetch trials from ClinicalTrials.gov API.
    
    Args:
        condition: Medical condition to search for (can be normalized or human-readable)
        status: Trial status (default: RECRUITING)
        page_size: Number of results per page (max 1000)
        page_token: Token for pagination
        
    Returns:
        Dict with trials, nextPageToken, and totalCount
    """
    # Convert normalized condition to API-friendly format
    api_condition = format_condition_for_api(condition)
    
    params = {
        "query.cond": api_condition,
        "filter.overallStatus": status,
        "pageSize": str(page_size),
    }
    
    if page_token:
        params["pageToken"] = page_token
    
    print(f"📡 Fetching from ClinicalTrials.gov: {api_condition} ({status})")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(CLINICALTRIALS_API, params=params, timeout=30.0)
        response.raise_for_status()
        data = response.json()
    
    trials = data.get("studies", [])
    print(f"   Found {len(trials)} trials")
    
    return {
        "trials": trials,
        "next_page_token": data.get("nextPageToken"),
        "total_count": data.get("totalCount", 0)
    }


async def fetch_all_trials(condition: str, max_trials: int = 100) -> List[Dict]:
    """
    Fetch all trials for a condition (handles pagination).
    
    Args:
        condition: Medical condition
        max_trials: Maximum trials to fetch
        
    Returns:
        List of all trials
    """
    all_trials = []
    page_token = None
    
    while len(all_trials) < max_trials:
        page_size = min(50, max_trials - len(all_trials))
        result = await fetch_trials(
            condition=condition,
            page_size=page_size,
            page_token=page_token
        )
        
        all_trials.extend(result["trials"])
        
        if not result["next_page_token"] or len(result["trials"]) == 0:
            break
        
        page_token = result["next_page_token"]
    
    return all_trials


async def fetch_trial_by_id(nct_id: str) -> Dict:
    """
    Fetch a single trial by NCT ID.
    
    Args:
        nct_id: The NCT identifier (e.g., NCT03600779)
        
    Returns:
        Trial data
    """
    url = f"{CLINICALTRIALS_API}/{nct_id}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=30.0)
        response.raise_for_status()
        return response.json()


def parse_trial_data(raw_trial: Dict) -> Dict[str, Any]:
    """
    Parse raw API trial data into a cleaner structure.
    
    Args:
        raw_trial: Raw trial from API
        
    Returns:
        Parsed trial data
    """
    protocol = raw_trial.get("protocolSection", {})
    identification = protocol.get("identificationModule", {})
    status_module = protocol.get("statusModule", {})
    design = protocol.get("designModule", {})
    eligibility = protocol.get("eligibilityModule", {})
    contacts = protocol.get("contactsLocationsModule", {})
    description = protocol.get("descriptionModule", {})
    sponsor_module = protocol.get("sponsorCollaboratorsModule", {})
    outcomes = protocol.get("outcomesModule", {})
    arms = protocol.get("armsInterventionsModule", {})
    
    # Extract phases
    phases = design.get("phases", [])
    phase_str = ", ".join(phases) if phases else "N/A"
    
    return {
        "nct_id": identification.get("nctId"),
        "title": identification.get("briefTitle"),
        "official_title": identification.get("officialTitle"),
        
        # Status info
        "status": status_module.get("overallStatus"),
        "start_date": status_module.get("startDateStruct", {}).get("date"),
        "completion_date": status_module.get("completionDateStruct", {}).get("date"),
        "last_updated": status_module.get("lastUpdateSubmitDate"),
        
        # Design info
        "phase": phase_str,
        "study_type": design.get("studyType"),
        "enrollment": design.get("enrollmentInfo", {}).get("count"),
        
        # Eligibility
        "eligibility_criteria": eligibility.get("eligibilityCriteria"),
        "minimum_age": eligibility.get("minimumAge"),
        "maximum_age": eligibility.get("maximumAge"),
        "sex": eligibility.get("sex"),
        "healthy_volunteers": eligibility.get("healthyVolunteers"),
        
        # Description
        "brief_summary": description.get("briefSummary"),
        "detailed_description": description.get("detailedDescription"),
        
        # Sponsor
        "sponsor": sponsor_module.get("leadSponsor", {}).get("name"),
        "collaborators": [c.get("name") for c in sponsor_module.get("collaborators", [])],
        
        # Locations
        "locations": [
            {
                "facility": loc.get("facility"),
                "city": loc.get("city"),
                "state": loc.get("state"),
                "country": loc.get("country"),
                "zip": loc.get("zip")
            }
            for loc in contacts.get("locations", [])
        ],
        
        # Contacts
        "central_contacts": [
            {
                "name": c.get("name"),
                "role": c.get("role"),
                "email": c.get("email"),
                "phone": c.get("phone")
            }
            for c in contacts.get("centralContacts", [])
        ],
        
        # Interventions
        "interventions": [
            {
                "type": i.get("type"),
                "name": i.get("name"),
                "description": i.get("description")
            }
            for i in arms.get("interventions", [])
        ],
        
        # Outcomes
        "primary_outcomes": [
            {
                "measure": o.get("measure"),
                "time_frame": o.get("timeFrame")
            }
            for o in outcomes.get("primaryOutcomes", [])
        ],
        
        # Source URL
        "source_url": f"https://clinicaltrials.gov/study/{identification.get('nctId')}"
    }
