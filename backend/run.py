#!/usr/bin/env python3
"""
Run the FastAPI server.

Usage:
    python run.py
    
Or with uvicorn directly:
    uvicorn app.main:app --reload --port 8000
"""

import uvicorn
from dotenv import load_dotenv

load_dotenv()

from app.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug
    )
