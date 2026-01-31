"""
Pydantic schemas for request/response validation.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, EmailStr


# ============ Patient Sub-Schemas (for extended patient model) ============

class PatientLocation(BaseModel):
    """Patient location/address."""
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    lat: Optional[float] = Field(default=None, description="Latitude for distance matching")
    lon: Optional[float] = Field(default=None, description="Longitude for distance matching")


class PrimaryDiagnosis(BaseModel):
    """Primary diagnosis with coding."""
    condition: str = Field(..., description="Human-readable condition name")
    snomed_code: Optional[str] = Field(default=None, description="SNOMED-CT code")
    diagnosis_date: Optional[str] = Field(default=None, description="Date of diagnosis (YYYY-MM-DD)")
    years_since_diagnosis: Optional[float] = Field(default=None, description="Years since diagnosis")


class DiseaseActivity(BaseModel):
    """Disease activity scores (for autoimmune conditions like RA)."""
    das28: Optional[float] = Field(default=None, description="Disease Activity Score 28")
    cdai: Optional[float] = Field(default=None, description="Clinical Disease Activity Index")
    sdai: Optional[float] = Field(default=None, description="Simplified Disease Activity Index")
    disease_severity: Optional[str] = Field(default=None, description="mild, moderate, moderate-severe, severe")
    last_assessed: Optional[str] = Field(default=None, description="Date of last assessment")


class PatientLabs(BaseModel):
    """Laboratory values for eligibility matching."""
    # Disease-specific markers (flags)
    rf_positive: Optional[bool] = Field(default=None, description="Rheumatoid Factor positive")
    anti_ccp_positive: Optional[bool] = Field(default=None, description="Anti-CCP antibodies positive")
    ana_positive: Optional[bool] = Field(default=None, description="ANA positive (for lupus)")
    
    # Inflammatory markers
    esr: Optional[float] = Field(default=None, description="ESR mm/hr")
    crp: Optional[float] = Field(default=None, description="CRP mg/L")
    
    # Organ function
    egfr: Optional[float] = Field(default=None, description="eGFR mL/min (kidney function)")
    alt: Optional[float] = Field(default=None, description="ALT U/L (liver)")
    ast: Optional[float] = Field(default=None, description="AST U/L (liver)")
    
    # Blood counts
    hemoglobin: Optional[float] = Field(default=None, description="Hemoglobin g/dL")
    wbc: Optional[float] = Field(default=None, description="WBC x10^9/L")
    platelets: Optional[float] = Field(default=None, description="Platelets x10^9/L")
    
    last_updated: Optional[str] = None


class PatientVitals(BaseModel):
    """Vital signs for eligibility matching."""
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    last_updated: Optional[str] = None


class CurrentMedication(BaseModel):
    """A current medication."""
    name: str
    dose: Optional[str] = None
    rxnorm_code: Optional[str] = None
    start_date: Optional[str] = None
    reason: Optional[str] = None


class TreatmentHistory(BaseModel):
    """Treatment history organized for trial matching."""
    # DMARDs (Disease-Modifying Antirheumatic Drugs)
    conventional_dmards: List[str] = Field(default=[], description="e.g., methotrexate, sulfasalazine")
    conventional_dmards_failed: int = Field(default=0, description="Number of cDMARDs failed")
    
    # Biologics
    biologics: List[str] = Field(default=[], description="e.g., adalimumab, etanercept")
    biologics_failed: int = Field(default=0, description="Number of biologics failed")
    
    # JAK inhibitors
    jak_inhibitors: List[str] = Field(default=[], description="e.g., tofacitinib, baricitinib")
    jak_inhibitors_failed: int = Field(default=0, description="Number of JAK inhibitors failed")
    
    # Current medications
    current_medications: List[CurrentMedication] = Field(default=[])
    
    # Summary fields
    total_failed_therapies: int = Field(default=0)
    biologic_naive: bool = Field(default=True, description="Never received biologics")


class Condition(BaseModel):
    """A medical condition."""
    name: str
    snomed_code: Optional[str] = None
    onset_date: Optional[str] = None
    is_active: bool = True
    is_primary: bool = False


class ExclusionCriteria(BaseModel):
    """Common trial exclusion criteria."""
    pregnancy_status: str = Field(default="unknown", description="not_pregnant, pregnant, unknown")
    nursing: bool = False
    recent_infections: bool = False
    active_malignancy: bool = False
    hiv_positive: bool = False
    hepatitis_b: bool = False
    hepatitis_c: bool = False
    tb_history: bool = False
    recent_live_vaccine: bool = Field(default=False, description="Within 4-6 weeks")
    recent_surgery: bool = Field(default=False, description="Within 4 weeks")


class Allergy(BaseModel):
    """An allergy."""
    allergen: str
    snomed_code: Optional[str] = None
    severity: Optional[str] = Field(default=None, description="mild, moderate, severe")
    reaction: Optional[str] = None


class PatientPreferences(BaseModel):
    """Patient preferences for trial matching."""
    max_travel_miles: Optional[int] = None
    available_days: List[str] = Field(default=[])
    willing_to_use_placebo: bool = True
    budget_constraints: Optional[str] = None


class ProviderInfo(BaseModel):
    """Provider/doctor information."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    npi: Optional[str] = None


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
    enrich_with_firecrawl: bool = Field(default=True, description="Enrich with Firecrawl scraping for additional trial details")


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


class BulkCrawlRequest(BaseModel):
    """Request to trigger a bulk crawl job for all patient conditions."""
    conditions: Optional[List[str]] = Field(
        default=None, 
        description="Specific conditions to crawl. If not provided, auto-detects from patients."
    )
    max_trials_per_condition: int = Field(
        default=50, 
        ge=1, 
        le=500, 
        description="Maximum trials to fetch per condition"
    )
    enrich_with_firecrawl: bool = Field(
        default=True, 
        description="Enrich with Firecrawl scraping for additional trial details"
    )


class BulkCrawlConditionResult(BaseModel):
    """Result for a single condition crawl."""
    condition: str
    fetched: int
    new: int
    updated: int
    skipped: int
    error: Optional[str] = None


class BulkCrawlResponse(BaseModel):
    """Response from bulk crawl job."""
    success: bool = True
    conditions_crawled: List[str]
    summary: Dict[str, int]
    details: List[BulkCrawlConditionResult]


# ============ Patient Schemas ============

class PatientCreate(BaseModel):
    """
    Extended schema for creating a patient with full clinical data.
    Supports both simple (backward-compatible) and detailed patient profiles.
    """
    # === Core identifiers ===
    name: str = Field(..., min_length=1, description="Patient name")
    email: Optional[EmailStr] = Field(default=None, description="Patient email")
    synthea_id: Optional[str] = Field(default=None, description="Original Synthea UUID if imported")
    
    # === Demographics ===
    age: Optional[int] = Field(default=None, ge=0, le=150, description="Patient age")
    birth_date: Optional[str] = Field(default=None, description="Birth date (YYYY-MM-DD)")
    sex: Optional[str] = Field(default=None, description="M, F, or other")
    race: Optional[str] = None
    ethnicity: Optional[str] = None
    
    # === Location ===
    location: Optional[str] = Field(default=None, description="Patient location (city, state) - backward compatible")
    location_details: Optional[PatientLocation] = Field(default=None, description="Structured location with lat/lon")
    
    # === Primary diagnosis ===
    primary_diagnosis: Optional[PrimaryDiagnosis] = None
    condition: str = Field(..., min_length=1, description="Primary condition (backward compatible)")
    
    # === Disease activity (for autoimmune conditions) ===
    disease_activity: Optional[DiseaseActivity] = None
    
    # === Labs and vitals ===
    labs: Optional[PatientLabs] = None
    vitals: Optional[PatientVitals] = None
    
    # === Treatment history ===
    treatments: Optional[TreatmentHistory] = None
    prior_treatments: List[str] = Field(default=[], description="Simple list (backward compatible)")
    
    # === Conditions and comorbidities ===
    conditions: List[Condition] = Field(default=[], description="All conditions with coding")
    comorbidities: List[str] = Field(default=[], description="Simple list (backward compatible)")
    
    # === Exclusion criteria ===
    exclusions: Optional[ExclusionCriteria] = None
    
    # === Allergies ===
    allergies: List[Allergy] = Field(default=[])
    
    # === Quick-match arrays (for efficient MongoDB queries) ===
    active_condition_codes: List[str] = Field(default=[], description="SNOMED codes for active conditions")
    active_medication_codes: List[str] = Field(default=[], description="RxNorm codes for active medications")
    
    # === Patient preferences ===
    preferences: Optional[PatientPreferences] = None
    budget_constraints: Optional[str] = Field(default=None, description="Budget constraints (backward compatible)")
    time_commitment: Optional[str] = Field(default=None, description="Available time commitment")
    
    # === Provider info ===
    provider: Optional[ProviderInfo] = None
    doctor_name: Optional[str] = Field(default=None, description="Doctor's name (backward compatible)")
    doctor_email: Optional[EmailStr] = Field(default=None, description="Doctor's email (backward compatible)")
    
    # === Metadata ===
    data_source: str = Field(default="manual", description="synthea, manual, ehr_import")


class PatientUpdate(BaseModel):
    """Schema for updating a patient (all fields optional)."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    synthea_id: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=150)
    birth_date: Optional[str] = None
    sex: Optional[str] = None
    race: Optional[str] = None
    ethnicity: Optional[str] = None
    location: Optional[str] = None
    location_details: Optional[PatientLocation] = None
    primary_diagnosis: Optional[PrimaryDiagnosis] = None
    condition: Optional[str] = None
    disease_activity: Optional[DiseaseActivity] = None
    labs: Optional[PatientLabs] = None
    vitals: Optional[PatientVitals] = None
    treatments: Optional[TreatmentHistory] = None
    prior_treatments: Optional[List[str]] = None
    conditions: Optional[List[Condition]] = None
    comorbidities: Optional[List[str]] = None
    exclusions: Optional[ExclusionCriteria] = None
    allergies: Optional[List[Allergy]] = None
    active_condition_codes: Optional[List[str]] = None
    active_medication_codes: Optional[List[str]] = None
    preferences: Optional[PatientPreferences] = None
    budget_constraints: Optional[str] = None
    time_commitment: Optional[str] = None
    provider: Optional[ProviderInfo] = None
    doctor_name: Optional[str] = None
    doctor_email: Optional[EmailStr] = None
    data_source: Optional[str] = None


class PatientResponse(BaseModel):
    """Extended patient response schema."""
    id: str = Field(..., alias="_id")
    
    # Core
    name: str
    email: Optional[str] = None
    synthea_id: Optional[str] = None
    
    # Demographics
    age: Optional[int] = None
    birth_date: Optional[str] = None
    sex: Optional[str] = None
    race: Optional[str] = None
    ethnicity: Optional[str] = None
    
    # Location (backward compatible - can be string or None)
    location: Optional[str] = None
    location_details: Optional[PatientLocation] = None
    
    # Diagnosis
    primary_diagnosis: Optional[PrimaryDiagnosis] = None
    condition: str
    
    # Disease activity
    disease_activity: Optional[DiseaseActivity] = None
    
    # Labs and vitals
    labs: Optional[PatientLabs] = None
    vitals: Optional[PatientVitals] = None
    
    # Treatments
    treatments: Optional[TreatmentHistory] = None
    prior_treatments: List[str] = []
    
    # Conditions
    conditions: List[Condition] = []
    comorbidities: List[str] = []
    
    # Exclusions and allergies
    exclusions: Optional[ExclusionCriteria] = None
    allergies: List[Allergy] = []
    
    # Quick-match arrays
    active_condition_codes: List[str] = []
    active_medication_codes: List[str] = []
    
    # Preferences
    preferences: Optional[PatientPreferences] = None
    budget_constraints: Optional[str] = None
    time_commitment: Optional[str] = None
    
    # Provider
    provider: Optional[ProviderInfo] = None
    doctor_name: Optional[str] = None
    doctor_email: Optional[str] = None
    
    # Metadata
    data_source: str = "manual"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        extra = "ignore"  # Ignore extra fields from old data


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
