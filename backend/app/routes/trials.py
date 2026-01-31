"""
Trials API Routes

REST endpoints for trial data and crawl operations.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ..services.mongodb import (
    get_all_trials,
    get_trial_by_nct_id,
    get_trials_by_condition
)
from ..services.crawler import run_crawl
from ..models.schemas import (
    TrialListResponse,
    CrawlRequest,
    CrawlResponse,
    FilesystemResponse,
    ErrorResponse
)

router = APIRouter(prefix="/api/trials", tags=["trials"])


@router.get("", response_model=TrialListResponse)
async def list_trials(
    condition: Optional[str] = Query(default=None, description="Filter by condition"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum results")
):
    """
    Get all trials or filter by condition/status.
    """
    try:
        if condition:
            trials = await get_trials_by_condition(condition, status=status, limit=limit)
        else:
            trials = await get_all_trials(limit=limit)
        
        # Convert ObjectId to string for JSON serialization
        for trial in trials:
            if "_id" in trial:
                trial["_id"] = str(trial["_id"])
        
        return TrialListResponse(
            success=True,
            count=len(trials),
            trials=trials
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{nct_id}")
async def get_trial(nct_id: str):
    """
    Get a specific trial by NCT ID.
    """
    try:
        trial = await get_trial_by_nct_id(nct_id)
        
        if not trial:
            raise HTTPException(status_code=404, detail=f"Trial {nct_id} not found")
        
        # Convert ObjectId to string
        if "_id" in trial:
            trial["_id"] = str(trial["_id"])
        
        return {
            "success": True,
            "trial": trial
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{nct_id}/markdown")
async def get_trial_markdown(nct_id: str):
    """
    Get trial markdown content for agent filesystem.
    """
    try:
        trial = await get_trial_by_nct_id(nct_id)
        
        if not trial:
            raise HTTPException(status_code=404, detail=f"Trial {nct_id} not found")
        
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(
            content=trial.get("markdown_content", ""),
            media_type="text/markdown"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crawl", response_model=CrawlResponse)
async def trigger_crawl(request: CrawlRequest):
    """
    Trigger a crawl job for a condition.
    """
    try:
        print(f"🕷️  API: Starting crawl for {request.condition}")
        
        stats = await run_crawl(
            condition=request.condition,
            max_trials=request.max_trials,
            enrich_with_firecrawl=request.enrich_with_firecrawl
        )
        
        # Convert datetime objects for JSON serialization
        if stats.get("start_time"):
            stats["start_time"] = stats["start_time"].isoformat()
        if stats.get("end_time"):
            stats["end_time"] = stats["end_time"].isoformat()
        
        return CrawlResponse(
            success=True,
            stats=stats
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filesystem/{condition}", response_model=FilesystemResponse)
async def get_filesystem(condition: str):
    """
    Get all trials for a condition formatted as filesystem structure.
    This is what the agent will use for bash-tool navigation.
    """
    try:
        trials = await get_trials_by_condition(condition, status="RECRUITING")
        
        # Build filesystem structure
        filesystem = {}
        
        for trial in trials:
            cond = trial.get("condition", "unknown")
            phase = trial.get("normalized_phase", "other")
            nct_id = trial.get("nct_id", "unknown")
            
            path = f"trials/{cond}/{phase}/{nct_id}.md"
            filesystem[path] = trial.get("markdown_content", "")
        
        return FilesystemResponse(
            success=True,
            condition=condition,
            trial_count=len(trials),
            filesystem=filesystem
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
