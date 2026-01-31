"""
Clinical Trial Crawler Service

Orchestrates the crawling process:
1. Fetches trials from ClinicalTrials.gov API
2. Checks MongoDB for existing trials (deduplication)
3. Enriches new trials with Firecrawl (optional)
4. Generates markdown content
5. Saves to MongoDB
"""

import hashlib
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

from .clinicaltrials import fetch_trials, parse_trial_data
from .firecrawl import scrape_trial_page
from .mongodb import (
    get_all_crawl_records,
    update_crawl_record,
    save_trials
)


def hash_trial_data(trial: Dict) -> str:
    """
    Generate a hash of trial data for change detection.
    
    Args:
        trial: Trial data
        
    Returns:
        MD5 hash string
    """
    data_to_hash = f"{trial.get('title', '')}{trial.get('status', '')}{trial.get('eligibility_criteria', '')}"
    return hashlib.md5(data_to_hash.encode()).hexdigest()


def normalize_condition(condition: str) -> str:
    """
    Normalize condition name for consistent storage.
    
    Args:
        condition: Raw condition name
        
    Returns:
        Normalized name (lowercase, underscores)
    """
    normalized = condition.lower()
    normalized = re.sub(r'[^a-z0-9]+', '_', normalized)
    normalized = normalized.strip('_')
    return normalized


def normalize_phase(phase: str) -> str:
    """
    Normalize phase for folder structure.
    
    Args:
        phase: Raw phase string
        
    Returns:
        Normalized phase
    """
    if not phase or phase in ('N/A', 'NA'):
        return 'other'
    
    phase_lower = phase.lower()
    
    if '1' in phase_lower and '2' in phase_lower:
        return 'phase1_2'
    if '2' in phase_lower and '3' in phase_lower:
        return 'phase2_3'
    if '1' in phase_lower:
        return 'phase1'
    if '2' in phase_lower:
        return 'phase2'
    if '3' in phase_lower:
        return 'phase3'
    if '4' in phase_lower:
        return 'phase4'
    if 'early' in phase_lower:
        return 'early_phase1'
    
    return 'other'


def generate_trial_markdown(trial: Dict) -> str:
    """
    Generate markdown content for a trial.
    
    Args:
        trial: Parsed trial data
        
    Returns:
        Markdown content string
    """
    # Format locations
    locations = trial.get('locations', [])
    if locations:
        location_list = '\n'.join([
            f"- {loc.get('city', 'Unknown')}, {loc.get('state', '')} {loc.get('country', '')} - {loc.get('facility', 'N/A')}"
            for loc in locations
        ])
    else:
        location_list = "- No locations listed"
    
    # Format contacts
    contacts = trial.get('central_contacts', [])
    if contacts:
        contact_list = '\n'.join([
            f"- {c.get('name', 'N/A')} ({c.get('role', 'N/A')}): {c.get('email', 'N/A')}, {c.get('phone', 'N/A')}"
            for c in contacts
        ])
    else:
        contact_list = "- No central contacts listed"
    
    # Format interventions
    interventions = trial.get('interventions', [])
    if interventions:
        intervention_list = '\n'.join([
            f"- **{i.get('type', 'N/A')}:** {i.get('name', 'N/A')}" + 
            (f" - {i.get('description', '')}" if i.get('description') else "")
            for i in interventions
        ])
    else:
        intervention_list = "- No interventions listed"
    
    return f"""# Trial: {trial.get('nct_id', 'Unknown')}

## Basic Info
- **Title:** {trial.get('title', 'N/A')}
- **Official Title:** {trial.get('official_title', 'N/A')}
- **Phase:** {trial.get('phase', 'N/A')}
- **Status:** {trial.get('status', 'N/A')}
- **Study Type:** {trial.get('study_type', 'N/A')}
- **Sponsor:** {trial.get('sponsor', 'N/A')}
- **Enrollment:** {trial.get('enrollment', 'N/A')} participants

## Description
{trial.get('brief_summary', 'No description available.')}

## Interventions
{intervention_list}

## Eligibility Criteria

{trial.get('eligibility_criteria', 'No eligibility criteria specified.')}

### Key Requirements
- **Minimum Age:** {trial.get('minimum_age', 'N/A')}
- **Maximum Age:** {trial.get('maximum_age', 'N/A')}
- **Sex:** {trial.get('sex', 'All')}
- **Healthy Volunteers:** {'Yes' if trial.get('healthy_volunteers') else 'No'}

## Locations
{location_list}

## Contacts
{contact_list}

## Dates
- **Start Date:** {trial.get('start_date', 'N/A')}
- **Completion Date:** {trial.get('completion_date', 'N/A')}
- **Last Updated:** {trial.get('last_updated', 'N/A')}

## Source
- **ClinicalTrials.gov:** {trial.get('source_url', 'N/A')}
- **NCT ID:** {trial.get('nct_id', 'N/A')}
"""


async def run_crawl(
    condition: str,
    max_trials: int = 50,
    enrich_with_firecrawl: bool = False,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Run the crawl job for a specific condition.
    
    Args:
        condition: Medical condition to crawl
        max_trials: Maximum number of trials to fetch
        enrich_with_firecrawl: Whether to enrich with Firecrawl
        force_refresh: Force re-crawl even if data hasn't changed
        
    Returns:
        Crawl statistics
    """
    print("\n" + "═" * 60)
    print(f"  Crawling: {condition}")
    print("═" * 60 + "\n")
    
    stats = {
        "condition": condition,
        "total_fetched": 0,
        "new_trials": 0,
        "updated_trials": 0,
        "skipped_trials": 0,
        "errors": [],
        "start_time": datetime.utcnow(),
        "end_time": None
    }
    
    try:
        # Step 1: Fetch trials from API
        print("📡 Step 1: Fetching from ClinicalTrials.gov API...")
        result = await fetch_trials(
            condition=condition,
            page_size=min(max_trials, 50)
        )
        raw_trials = result["trials"]
        stats["total_fetched"] = len(raw_trials)
        
        if not raw_trials:
            print("   No trials found for this condition")
            stats["end_time"] = datetime.utcnow()
            return stats
        
        # Step 2: Get existing crawl records for deduplication
        print("\n🔍 Step 2: Checking for existing trials (deduplication)...")
        existing_records = await get_all_crawl_records()
        print(f"   Found {len(existing_records)} existing records in database")
        
        # Step 3: Process each trial
        print("\n⚙️  Step 3: Processing trials...")
        trials_to_save = []
        normalized_condition = normalize_condition(condition)
        
        for raw_trial in raw_trials:
            parsed = parse_trial_data(raw_trial)
            source_hash = hash_trial_data(parsed)
            existing_record = existing_records.get(parsed["nct_id"])
            
            # Check if we need to process this trial
            if not force_refresh and existing_record and existing_record.get("source_hash") == source_hash:
                stats["skipped_trials"] += 1
                continue
            
            is_new = existing_record is None
            if is_new:
                stats["new_trials"] += 1
            else:
                stats["updated_trials"] += 1
            
            icon = "🆕" if is_new else "🔄"
            title_preview = parsed["title"][:50] if parsed.get("title") else "Unknown"
            print(f"   {icon} {parsed['nct_id']}: {title_preview}...")
            
            # Enrich with Firecrawl if enabled
            enriched_content = None
            if enrich_with_firecrawl:
                try:
                    scraped = await scrape_trial_page(parsed["nct_id"])
                    if scraped.get("success"):
                        enriched_content = scraped.get("markdown")
                except Exception as e:
                    print(f"      ⚠️  Firecrawl enrichment failed: {str(e)}")
            
            # Generate markdown content
            markdown_content = generate_trial_markdown(parsed)
            
            # Prepare trial document
            trial_doc = {
                **parsed,
                "condition": normalized_condition,
                "normalized_phase": normalize_phase(parsed.get("phase", "")),
                "markdown_content": markdown_content,
                "enriched_content": enriched_content,
                "source_hash": source_hash
            }
            
            trials_to_save.append(trial_doc)
            
            # Update crawl index
            await update_crawl_record(parsed["nct_id"], source_hash)
        
        # Step 4: Save to MongoDB
        if trials_to_save:
            print(f"\n💾 Step 4: Saving {len(trials_to_save)} trials to MongoDB...")
            await save_trials(trials_to_save)
            print("   ✅ Saved successfully")
        else:
            print("\n💾 Step 4: No new trials to save")
    
    except Exception as e:
        print(f"\n❌ Crawl error: {str(e)}")
        stats["errors"].append(str(e))
    
    stats["end_time"] = datetime.utcnow()
    duration = (stats["end_time"] - stats["start_time"]).total_seconds()
    
    # Print summary
    print("\n" + "═" * 60)
    print("  CRAWL SUMMARY")
    print("═" * 60)
    print(f"   Condition:     {condition}")
    print(f"   Total fetched: {stats['total_fetched']}")
    print(f"   New trials:    {stats['new_trials']}")
    print(f"   Updated:       {stats['updated_trials']}")
    print(f"   Skipped:       {stats['skipped_trials']} (no changes)")
    print(f"   Errors:        {len(stats['errors'])}")
    print(f"   Duration:      {duration:.2f}s\n")
    
    return stats


async def run_multi_crawl(
    conditions: List[str],
    **kwargs
) -> List[Dict[str, Any]]:
    """
    Run crawl for multiple conditions.
    
    Args:
        conditions: List of conditions to crawl
        **kwargs: Additional options passed to run_crawl
        
    Returns:
        List of crawl results
    """
    results = []
    
    for condition in conditions:
        result = await run_crawl(condition, **kwargs)
        results.append(result)
    
    return results
