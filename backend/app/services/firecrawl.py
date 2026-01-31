"""
Firecrawl Service

Handles web scraping and content extraction using Firecrawl.
Used to enrich trial data with additional information not available in the API.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from firecrawl import FirecrawlApp

# Global Firecrawl client
_firecrawl_client: Optional[FirecrawlApp] = None


def init_firecrawl(api_key: str) -> None:
    """
    Initialize Firecrawl client.
    
    Args:
        api_key: Firecrawl API key
    """
    global _firecrawl_client
    
    if not api_key:
        raise ValueError("FIRECRAWL_API_KEY is required")
    
    _firecrawl_client = FirecrawlApp(api_key=api_key)
    print("🔥 Firecrawl client initialized")


def get_firecrawl_client() -> FirecrawlApp:
    """Get the Firecrawl client instance."""
    if _firecrawl_client is None:
        raise RuntimeError("Firecrawl not initialized. Call init_firecrawl() first.")
    return _firecrawl_client


async def scrape_url(url: str, options: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Scrape a URL and return markdown content.
    
    Args:
        url: URL to scrape
        options: Additional scrape options
        
    Returns:
        Scraped content with markdown
    """
    client = get_firecrawl_client()
    
    print(f"🔥 Scraping: {url}")
    
    try:
        scrape_options = {"formats": ["markdown"]}
        if options:
            scrape_options.update(options)
        
        result = client.scrape_url(url, scrape_options)
        
        return {
            "success": True,
            "url": url,
            "markdown": result.get("markdown", ""),
            "metadata": result.get("metadata", {}),
            "scraped_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"   Scrape failed: {str(e)}")
        return {
            "success": False,
            "url": url,
            "error": str(e),
            "scraped_at": datetime.utcnow().isoformat()
        }


async def scrape_trial_page(nct_id: str) -> Dict[str, Any]:
    """
    Scrape a clinical trial page for additional details.
    
    Args:
        nct_id: NCT identifier
        
    Returns:
        Enriched trial data
    """
    url = f"https://clinicaltrials.gov/study/{nct_id}"
    return await scrape_url(url)


async def batch_scrape(urls: List[str], concurrency: int = 2) -> List[Dict[str, Any]]:
    """
    Batch scrape multiple URLs.
    
    Args:
        urls: Array of URLs to scrape
        concurrency: Number of concurrent scrapes
        
    Returns:
        Array of scraped results
    """
    import asyncio
    
    results = []
    
    # Process in batches to respect rate limits
    for i in range(0, len(urls), concurrency):
        batch = urls[i:i + concurrency]
        batch_results = await asyncio.gather(
            *[scrape_url(url) for url in batch],
            return_exceptions=True
        )
        
        for result in batch_results:
            if isinstance(result, Exception):
                results.append({
                    "success": False,
                    "error": str(result)
                })
            else:
                results.append(result)
        
        # Small delay between batches
        if i + concurrency < len(urls):
            await asyncio.sleep(1)
    
    return results


async def search_web(query: str, limit: int = 5) -> Dict[str, Any]:
    """
    Search the web for clinical trial information.
    
    Args:
        query: Search query
        limit: Number of results
        
    Returns:
        Search results
    """
    client = get_firecrawl_client()
    
    print(f"🔍 Searching: {query}")
    
    try:
        result = client.search(query, {
            "limit": limit,
            "scrapeOptions": {
                "formats": ["markdown"]
            }
        })
        
        return {
            "success": True,
            "query": query,
            "results": result.get("data", []),
            "searched_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"   Search failed: {str(e)}")
        return {
            "success": False,
            "query": query,
            "error": str(e),
            "searched_at": datetime.utcnow().isoformat()
        }
