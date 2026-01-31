"""
MongoDB Service

Handles database connections and operations for clinical trial data.
Uses Motor for async MongoDB operations.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId

# Global MongoDB client and database
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def connect_mongodb(uri: str, db_name: str = "clinical_trials") -> AsyncIOMotorDatabase:
    """
    Connect to MongoDB.
    
    Args:
        uri: MongoDB connection string
        db_name: Database name
        
    Returns:
        Database instance
    """
    global _client, _db
    
    if not uri:
        raise ValueError("MONGODB_URI is required")
    
    _client = AsyncIOMotorClient(uri)
    _db = _client[db_name]
    
    # Test connection
    await _client.admin.command("ping")
    print(f"🍃 Connected to MongoDB: {db_name}")
    
    # Create indexes
    await create_indexes()
    
    return _db


def get_db() -> AsyncIOMotorDatabase:
    """Get the database instance."""
    if _db is None:
        raise RuntimeError("MongoDB not connected. Call connect_mongodb() first.")
    return _db


async def close_mongodb() -> None:
    """Close MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        print("🍃 MongoDB connection closed")


async def create_indexes() -> None:
    """Create necessary indexes for performance."""
    db = get_db()
    
    # Trials collection indexes
    await db.trials.create_index("nct_id", unique=True)
    await db.trials.create_index([("condition", 1), ("phase", 1)])
    await db.trials.create_index("status")
    await db.trials.create_index("last_updated", sparse=True)
    
    # Crawl index collection
    await db.crawl_index.create_index("nct_id", unique=True)
    
    # Patients collection indexes
    await db.patients.create_index("email", unique=True, sparse=True)
    await db.patients.create_index("condition")
    
    # Matches collection indexes
    await db.matches.create_index([("patient_id", 1), ("created_at", -1)])
    await db.matches.create_index("nct_id")
    
    print("   📇 Indexes created")


# ============ Trial Operations ============

async def save_trial(trial: Dict[str, Any]) -> Any:
    """
    Save a trial to the database (upsert).
    
    Args:
        trial: Trial data
        
    Returns:
        Update result
    """
    db = get_db()
    
    trial["updated_at"] = datetime.utcnow()
    
    result = await db.trials.update_one(
        {"nct_id": trial["nct_id"]},
        {
            "$set": trial,
            "$setOnInsert": {"created_at": datetime.utcnow()}
        },
        upsert=True
    )
    
    return result


async def save_trials(trials: List[Dict[str, Any]]) -> Any:
    """
    Save multiple trials (bulk upsert).
    
    Args:
        trials: List of trial data
        
    Returns:
        Bulk write result
    """
    db = get_db()
    
    from pymongo import UpdateOne
    
    operations = []
    for trial in trials:
        trial["updated_at"] = datetime.utcnow()
        operations.append(
            UpdateOne(
                {"nct_id": trial["nct_id"]},
                {
                    "$set": trial,
                    "$setOnInsert": {"created_at": datetime.utcnow()}
                },
                upsert=True
            )
        )
    
    if operations:
        result = await db.trials.bulk_write(operations)
        return result
    
    return None


async def get_trial_by_nct_id(nct_id: str) -> Optional[Dict]:
    """Get a trial by NCT ID."""
    db = get_db()
    return await db.trials.find_one({"nct_id": nct_id})


async def get_trials_by_condition(
    condition: str,
    status: Optional[str] = None,
    limit: int = 100
) -> List[Dict]:
    """Get trials by condition."""
    db = get_db()
    
    # Case-insensitive regex match
    query = {"condition": {"$regex": condition, "$options": "i"}}
    
    if status:
        query["status"] = status
    
    cursor = db.trials.find(query).sort("last_updated", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def get_all_trials(limit: int = 1000) -> List[Dict]:
    """Get all trials."""
    db = get_db()
    cursor = db.trials.find({}).sort("last_updated", -1).limit(limit)
    return await cursor.to_list(length=limit)


# ============ Crawl Index Operations ============

async def get_crawl_record(nct_id: str) -> Optional[Dict]:
    """Check if a trial has been crawled."""
    db = get_db()
    return await db.crawl_index.find_one({"nct_id": nct_id})


async def get_all_crawl_records() -> Dict[str, Dict]:
    """Get all crawl records as a dict keyed by nct_id."""
    db = get_db()
    cursor = db.crawl_index.find({})
    records = await cursor.to_list(length=10000)
    return {r["nct_id"]: r for r in records}


async def update_crawl_record(nct_id: str, source_hash: str) -> None:
    """Update crawl record."""
    db = get_db()
    
    await db.crawl_index.update_one(
        {"nct_id": nct_id},
        {
            "$set": {
                "source_hash": source_hash,
                "last_scraped": datetime.utcnow()
            }
        },
        upsert=True
    )


# ============ Patient Operations ============

async def save_patient(patient: Dict[str, Any]) -> Any:
    """Save a new patient. Does not mutate the input dict."""
    db = get_db()
    
    data = dict(patient)
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = datetime.utcnow()
    
    result = await db.patients.insert_one(data)
    return result


async def get_patient_by_id(patient_id: str) -> Optional[Dict]:
    """Get a patient by ID."""
    db = get_db()
    return await db.patients.find_one({"_id": ObjectId(patient_id)})


async def get_all_patients() -> List[Dict]:
    """Get all patients."""
    db = get_db()
    cursor = db.patients.find({})
    return await cursor.to_list(length=1000)


async def get_unique_patient_conditions() -> List[str]:
    """Get unique conditions from all patients."""
    db = get_db()
    conditions = await db.patients.distinct("condition")
    # Filter out None/empty values
    return [c for c in conditions if c]


async def update_patient(patient_id: str, updates: Dict[str, Any]) -> Any:
    """Update a patient."""
    db = get_db()
    
    updates["updated_at"] = datetime.utcnow()
    
    result = await db.patients.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": updates}
    )
    return result


async def delete_patient(patient_id: str) -> Any:
    """Delete a patient."""
    db = get_db()
    return await db.patients.delete_one({"_id": ObjectId(patient_id)})


# ============ Match Operations ============

async def save_match(match: Dict[str, Any]) -> Any:
    """Save a match."""
    db = get_db()
    
    match["created_at"] = datetime.utcnow()
    
    result = await db.matches.insert_one(match)
    return result


async def save_matches(patient_id: str, matches: List[Dict[str, Any]]) -> Any:
    """Save multiple matches for a patient (from gateway)."""
    db = get_db()
    pid = ObjectId(patient_id)
    docs = []
    for m in matches:
        docs.append({
            "patient_id": pid,
            "nct_id": m.get("nct_id", ""),
            "trial_title": m.get("trial_title"),
            "match_score": int(m.get("match_score", 0)),
            "reasoning": m.get("reasoning"),
            "status": "pending",
            "created_at": datetime.utcnow(),
        })
    if not docs:
        return None
    result = await db.matches.insert_many(docs)
    return result


async def get_matches_by_patient(patient_id: str) -> List[Dict]:
    """Get matches for a patient."""
    db = get_db()
    
    cursor = db.matches.find(
        {"patient_id": ObjectId(patient_id)}
    ).sort("match_score", -1)
    
    return await cursor.to_list(length=100)
