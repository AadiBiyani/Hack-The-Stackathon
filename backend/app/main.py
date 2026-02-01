"""
MatchPoint - FastAPI Backend

Main application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .services.mongodb import connect_mongodb, close_mongodb
from .services.firecrawl import init_firecrawl
from .routes import trials, patients, matches


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs on startup and shutdown.
    """
    settings = get_settings()
    
    print("\n🏥 MatchPoint Backend")
    print("═" * 50)
    
    # Startup
    try:
        # Connect to MongoDB
        if not settings.mongodb_uri:
            print("⚠️  MONGODB_URI not set - database features disabled")
        else:
            await connect_mongodb(settings.mongodb_uri)
        
        # Initialize Firecrawl
        if settings.firecrawl_api_key:
            init_firecrawl(settings.firecrawl_api_key)
        else:
            print("⚠️  FIRECRAWL_API_KEY not set - enrichment disabled")
        
        print(f"\n🚀 Server ready!")
        print(f"📚 API docs: http://localhost:{settings.port}/docs\n")
        
    except Exception as e:
        print(f"❌ Startup error: {e}")
        raise
    
    yield
    
    # Shutdown
    await close_mongodb()


# Create FastAPI app
app = FastAPI(
    title="MatchPoint API",
    description="Backend API for matching patients with clinical trials",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(trials.router)
app.include_router(patients.router)
app.include_router(matches.router)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "MatchPoint API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from datetime import datetime
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "matchpoint-backend"
    }


@app.get("/api")
async def api_info():
    """API documentation endpoint."""
    return {
        "name": "MatchPoint API",
        "version": "1.0.0",
        "endpoints": {
            "trials": {
                "GET /api/trials": "List all trials (query: condition, status, limit)",
                "GET /api/trials/{nct_id}": "Get trial by NCT ID",
                "GET /api/trials/{nct_id}/markdown": "Get trial markdown content",
                "POST /api/trials/crawl": "Trigger crawl job (body: condition, max_trials)",
                "GET /api/trials/filesystem/{condition}": "Get trials as filesystem for agent"
            },
            "patients": {
                "GET /api/patients": "List all patients",
                "GET /api/patients/{id}": "Get patient by ID",
                "POST /api/patients": "Create patient",
                "PUT /api/patients/{id}": "Update patient",
                "DELETE /api/patients/{id}": "Delete patient"
            }
        }
    }
