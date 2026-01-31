"""
Pydantic schemas for request/response validation.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


# ============ Trial Schemas ============

class TrialLocation(BaseModel):
    """Trial location schema."""
    facility: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip: Optional[str] = None


class TrialContact(BaseModel):
    """Trial contact schema."""
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class TrialIntervention(BaseModel):
    """Trial intervention schema."""
    type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None


class TrialResponse(BaseModel):
    """Trial response schema."""
    nct_id: str
    title: Optional[str] = None
    official_title: Optional[str] = None
    status: Optional[str] = None
    phase: Optional[str] = None
    study_type: Optional[str] = None
    sponsor: Optional[str] = None
    enrollment: Optional[int] = None
    brief_summary: Optional[str] = None
    eligibility_criteria: Optional[str] = None
    minimum_age: Optional[str] = None
    maximum_age: Optional[str] = None
    sex: Optional[str] = None
    healthy_volunteers: Optional[bool] = None
    locations: List[TrialLocation] = []
    central_contacts: List[TrialContact] = []
    interventions: List[TrialIntervention] = []
    condition: Optional[str] = None
    normalized_phase: Optional[str] = None
    source_url: Optional[str] = None
    markdown_content: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TrialListResponse(BaseModel):
    """Response for listing trials."""
    success: bool = True
    count: int
    trials: List[Dict[str, Any]]


class CrawlRequest(BaseModel):
    """Request to trigger a crawl job."""
    condition: str = Field(..., description="Medical condition to crawl")
    max_trials: int = Field(default=50, ge=1, le=1000, description="Maximum trials to fetch")
    enrich_with_firecrawl: bool = Field(default=False, description="Enrich with Firecrawl scraping")


class CrawlResponse(BaseModel):
    """Response from crawl job."""
    success: bool = True
    stats: Dict[str, Any]


class FilesystemResponse(BaseModel):
    """Response with trials formatted as filesystem."""
    success: bool = True
    condition: str
    trial_count: int
    filesystem: Dict[str, str]


# ============ Patient Schemas ============

class PatientCreate(BaseModel):
    """Schema for creating a patient."""
    name: str = Field(..., min_length=1, description="Patient name")
    email: Optional[EmailStr] = Field(default=None, description="Patient email")
    age: Optional[int] = Field(default=None, ge=0, le=150, description="Patient age")
    condition: str = Field(..., min_length=1, description="Medical condition")
    prior_treatments: List[str] = Field(default=[], description="List of prior treatments")
    comorbidities: List[str] = Field(default=[], description="List of comorbidities")
    location: Optional[str] = Field(default=None, description="Patient location (city, state)")
    budget_constraints: Optional[str] = Field(default=None, description="Budget constraints")
    time_commitment: Optional[str] = Field(default=None, description="Available time commitment")
    doctor_name: Optional[str] = Field(default=None, description="Doctor's name")
    doctor_email: Optional[EmailStr] = Field(default=None, description="Doctor's email")


class PatientUpdate(BaseModel):
    """Schema for updating a patient."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    age: Optional[int] = Field(default=None, ge=0, le=150)
    condition: Optional[str] = None
    prior_treatments: Optional[List[str]] = None
    comorbidities: Optional[List[str]] = None
    location: Optional[str] = None
    budget_constraints: Optional[str] = None
    time_commitment: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_email: Optional[EmailStr] = None


class PatientResponse(BaseModel):
    """Patient response schema."""
    id: str = Field(..., alias="_id")
    name: str
    email: Optional[str] = None
    age: Optional[int] = None
    condition: str
    prior_treatments: List[str] = []
    comorbidities: List[str] = []
    location: Optional[str] = None
    budget_constraints: Optional[str] = None
    time_commitment: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_email: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True


class PatientListResponse(BaseModel):
    """Response for listing patients."""
    success: bool = True
    count: int
    patients: List[Dict[str, Any]]


# ============ Match Schemas ============

class MatchResponse(BaseModel):
    """Match response schema."""
    id: str = Field(..., alias="_id")
    patient_id: str
    nct_id: str
    trial_title: Optional[str] = None
    match_score: int = Field(..., ge=0, le=100)
    reasoning: Optional[str] = None
    status: str = "pending"
    created_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True


class MatchListResponse(BaseModel):
    """Response for listing matches."""
    success: bool = True
    count: int
    matches: List[Dict[str, Any]]


# ============ Generic Schemas ============

class ErrorResponse(BaseModel):
    """Error response schema."""
    success: bool = False
    error: str


class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool = True
    message: str
