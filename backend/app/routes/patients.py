"""
Patients API Routes

REST endpoints for patient management.
"""

from fastapi import APIRouter, HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from ..services.mongodb import (
    save_patient,
    get_patient_by_id,
    get_all_patients,
    update_patient,
    delete_patient,
    get_db
)
from ..models.schemas import (
    PatientCreate,
    PatientUpdate,
    PatientListResponse,
    SuccessResponse,
    ErrorResponse
)

router = APIRouter(prefix="/api/patients", tags=["patients"])


def normalize_condition(condition: str) -> str:
    """Normalize condition name."""
    return condition.lower().replace(" ", "_")


@router.get("", response_model=PatientListResponse)
async def list_patients():
    """
    Get all patients.
    """
    try:
        patients = await get_all_patients()
        
        # Convert ObjectId to string for JSON serialization
        for patient in patients:
            if "_id" in patient:
                patient["_id"] = str(patient["_id"])
        
        return PatientListResponse(
            success=True,
            count=len(patients),
            patients=patients
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """
    Get a specific patient by ID.
    """
    try:
        patient = await get_patient_by_id(patient_id)
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Convert ObjectId to string
        if "_id" in patient:
            patient["_id"] = str(patient["_id"])
        
        return {
            "success": True,
            "patient": patient
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_patient(patient: PatientCreate):
    """
    Create a new patient.
    """
    try:
        patient_data = patient.model_dump()
        patient_data["condition"] = normalize_condition(patient_data["condition"])
        
        result = await save_patient(patient_data)
        inserted_id = str(result.inserted_id)
        
        # Build a JSON-serializable response (no ObjectId/datetime from DB)
        response_patient = {**patient_data, "_id": inserted_id}
        return {
            "success": True,
            "patient_id": inserted_id,
            "patient": response_patient,
        }
    except Exception as e:
        # Handle duplicate email
        if "duplicate key" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="A patient with this email already exists"
            )
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{patient_id}")
async def update_patient_endpoint(patient_id: str, updates: PatientUpdate):
    """
    Update a patient.
    """
    try:
        # Get only non-None fields
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Normalize condition if provided
        if "condition" in update_data:
            update_data["condition"] = normalize_condition(update_data["condition"])
        
        result = await update_patient(patient_id, update_data)
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get updated patient
        patient = await get_patient_by_id(patient_id)
        if "_id" in patient:
            patient["_id"] = str(patient["_id"])
        
        return {
            "success": True,
            "patient": patient
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{patient_id}", response_model=SuccessResponse)
async def delete_patient_endpoint(patient_id: str):
    """
    Delete a patient.
    """
    try:
        result = await delete_patient(patient_id)
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        return SuccessResponse(
            success=True,
            message="Patient deleted"
        )
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient ID format")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
