#!/usr/bin/env python3
"""
CLI script to run the clinical trial crawler.

Usage:
    python -m app.scripts.crawl                           # Crawl default conditions
    python -m app.scripts.crawl --test                    # Test mode (3 trials)
    python -m app.scripts.crawl --condition "breast cancer"
    python -m app.scripts.crawl --condition "multiple sclerosis" --max 100
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.config import get_settings
from app.services.mongodb import connect_mongodb, close_mongodb
from app.services.firecrawl import init_firecrawl
from app.services.crawler import run_crawl, run_multi_crawl


# Default conditions to crawl
DEFAULT_CONDITIONS = [
    "multiple sclerosis",
    "breast cancer", 
    "lung cancer",
    "diabetes",
    "alzheimer"
]


async def main():
    """Main entry point for crawler CLI."""
    parser = argparse.ArgumentParser(description="Clinical Trial Crawler")
    parser.add_argument("--condition", "-c", type=str, help="Specific condition to crawl")
    parser.add_argument("--max", "-m", type=int, default=50, help="Maximum trials to fetch")
    parser.add_argument("--test", "-t", action="store_true", help="Test mode (3 trials)")
    parser.add_argument("--enrich", "-e", action="store_true", help="Enrich with Firecrawl")
    parser.add_argument("--force", "-f", action="store_true", help="Force refresh all trials")
    
    args = parser.parse_args()
    
    print("\n🏥 Clinical Trial Crawler")
    print("═" * 60)
    
    settings = get_settings()
    
    # Validate environment
    if not settings.mongodb_uri:
        print("❌ MONGODB_URI not set in .env file")
        sys.exit(1)
    
    try:
        # Initialize services
        await connect_mongodb(settings.mongodb_uri)
        
        if settings.firecrawl_api_key:
            init_firecrawl(settings.firecrawl_api_key)
        else:
            print("⚠️  FIRECRAWL_API_KEY not set - running without enrichment")
        
        # Determine what to crawl
        max_trials = 3 if args.test else args.max
        
        if args.condition:
            # Single condition
            print(f"\n📋 Crawling single condition: {args.condition}")
            await run_crawl(
                condition=args.condition,
                max_trials=max_trials,
                enrich_with_firecrawl=args.enrich,
                force_refresh=args.force
            )
        elif args.test:
            # Test mode
            print("\n🧪 Test mode - crawling multiple sclerosis only")
            await run_crawl(
                condition="multiple sclerosis",
                max_trials=3,
                enrich_with_firecrawl=args.enrich,
                force_refresh=args.force
            )
        else:
            # Multiple conditions
            print(f"\n📋 Crawling {len(DEFAULT_CONDITIONS)} conditions")
            await run_multi_crawl(
                conditions=DEFAULT_CONDITIONS,
                max_trials=max_trials,
                enrich_with_firecrawl=args.enrich,
                force_refresh=args.force
            )
        
        print("\n✅ Crawl complete!\n")
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
    finally:
        await close_mongodb()


if __name__ == "__main__":
    asyncio.run(main())
