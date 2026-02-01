"""
Trials API Routes

REST endpoints for trial data and crawl operations.
"""

import asyncio
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ..services.mongodb import (
    get_all_trials,
    get_trial_by_nct_id,
    get_trials_by_condition,
    get_unique_patient_conditions,
    get_trials_count,
    get_patients_count,
    get_matches_count
)
from ..services.crawler import run_crawl
from ..models.schemas import (
    TrialListResponse,
    CrawlRequest,
    CrawlResponse,
    FilesystemResponse,
    ErrorResponse,
    BulkCrawlRequest,
    BulkCrawlResponse,
    BulkCrawlConditionResult
)

router = APIRouter(prefix="/api/trials", tags=["trials"])


@router.get("/stats")
async def get_stats():
    """
    Get database statistics (counts) without fetching all documents.
    """
    try:
        trials_count, patients_count, matches_count = await asyncio.gather(
            get_trials_count(),
            get_patients_count(),
            get_matches_count()
        )
        
        return {
            "success": True,
            "stats": {
                "trials": trials_count,
                "patients": patients_count,
                "matches": matches_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@router.post("/crawl/bulk", response_model=BulkCrawlResponse)
async def trigger_bulk_crawl(request: BulkCrawlRequest):
    """
    Trigger a bulk crawl job for multiple conditions.
    
    If no conditions are provided, automatically detects unique conditions
    from all patients in the database.
    """
    try:
        # Get conditions to crawl
        if request.conditions and len(request.conditions) > 0:
            conditions = request.conditions
        else:
            # Auto-detect from patients
            conditions = await get_unique_patient_conditions()
            
        if not conditions:
            return BulkCrawlResponse(
                success=True,
                conditions_crawled=[],
                summary={
                    "total_fetched": 0,
                    "new_added": 0,
                    "updated": 0,
                    "duplicates_skipped": 0
                },
                details=[]
            )
        
        print(f"🕷️  API: Starting bulk crawl for {len(conditions)} conditions: {conditions}")
        
        # Crawl each condition (sequentially to avoid rate limiting)
        details = []
        total_fetched = 0
        total_new = 0
        total_updated = 0
        total_skipped = 0
        
        for condition in conditions:
            try:
                print(f"   📥 Crawling: {condition}")
                
                stats = await run_crawl(
                    condition=condition,
                    max_trials=request.max_trials_per_condition,
                    enrich_with_firecrawl=request.enrich_with_firecrawl
                )
                
                fetched = stats.get("total_fetched", 0)
                new = stats.get("new_trials", 0)
                updated = stats.get("updated_trials", 0)
                skipped = stats.get("skipped", 0)
                
                details.append(BulkCrawlConditionResult(
                    condition=condition,
                    fetched=fetched,
                    new=new,
                    updated=updated,
                    skipped=skipped
                ))
                
                total_fetched += fetched
                total_new += new
                total_updated += updated
                total_skipped += skipped
                
                # Small delay between conditions to be nice to the API
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"   ❌ Error crawling {condition}: {e}")
                details.append(BulkCrawlConditionResult(
                    condition=condition,
                    fetched=0,
                    new=0,
                    updated=0,
                    skipped=0,
                    error=str(e)
                ))
        
        print(f"🕷️  API: Bulk crawl complete. {total_new} new trials added.")
        
        return BulkCrawlResponse(
            success=True,
            conditions_crawled=conditions,
            summary={
                "total_fetched": total_fetched,
                "new_added": total_new,
                "updated": total_updated,
                "duplicates_skipped": total_skipped
            },
            details=details
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filesystem/{condition}", response_model=FilesystemResponse)
async def get_filesystem(
    condition: str,
    limit: int = Query(default=15, ge=1, le=50, description="Max trials to include")
):
    """
    Get trials for a condition formatted as filesystem structure.
    This is what the agent will use for bash-tool navigation.
    
    Limits trials to prevent context overflow in the agent.
    Includes a summary index file for quick navigation.
    """
    try:
        # Get all trials but limit what we send to the agent
        trials = await get_trials_by_condition(condition, status="RECRUITING", limit=limit)
        
        # Build filesystem structure
        filesystem = {}
        
        # Create an index/summary file for quick reference
        index_lines = [
            f"# Clinical Trials for {condition.replace('_', ' ').title()}",
            f"",
            f"Total trials: {len(trials)}",
            f"",
            f"## Quick Reference",
            f"",
            f"| NCT ID | Title | Phase | Status | Location |",
            f"|--------|-------|-------|--------|----------|",
        ]
        
        for trial in trials:
            cond = trial.get("condition", "unknown")
            phase = trial.get("normalized_phase", "other")
            nct_id = trial.get("nct_id", "unknown")
            title = trial.get("title", "Unknown")[:50]
            status = trial.get("status", "Unknown")
            locations = trial.get("locations", [])
            location_str = locations[0].get("city", "N/A") if locations else "N/A"
            
            # Add to index
            index_lines.append(f"| {nct_id} | {title}... | {phase} | {status} | {location_str} |")
            
            # Add full markdown file
            path = f"trials/{cond}/{phase}/{nct_id}.md"
            filesystem[path] = trial.get("markdown_content", "")
        
        index_lines.append("")
        index_lines.append("## How to Use")
        index_lines.append("- Use `cat trials/{condition}/{phase}/{NCT_ID}.md` to read full trial details")
        index_lines.append("- Check eligibility criteria carefully for patient matching")
        
        # Add index file
        filesystem["trials/INDEX.md"] = "\n".join(index_lines)
        
        return FilesystemResponse(
            success=True,
            condition=condition,
            trial_count=len(trials),
            filesystem=filesystem
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
