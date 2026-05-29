from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bs4 import BeautifulSoup
import requests
import uvicorn
import re
from datetime import datetime
import urllib.parse

app = FastAPI()

class ScrapeRequest(BaseModel):
    queries: list[str]
    location: str

@app.post("/scrape/tanitjobs")
async def scrape_tanitjobs(req: ScrapeRequest):
    all_jobs = []
    
    # Use a standard user-agent to avoid getting blocked
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        for query in req.queries:
            # Format the query string securely
            encoded_query = urllib.parse.quote(query)
            
            # Tanitjobs search URL (you might need to adjust the exact query params based on their current site structure)
            search_url = f"https://www.tanitjobs.com/jobs/?action=search&keywords={encoded_query}"
            
            from curl_cffi import requests as cffi_requests
            response = cffi_requests.get(search_url, headers=headers, timeout=15, impersonate="chrome110")
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all job cards. 
            # Note: '.media.well' or 'article' are common classes on Tanitjobs, but you may need to inspect the live DOM to tweak these selectors.
            job_cards = soup.select('article, .media, .job-listing, .job-item') 
            
            for card in job_cards:
                # Attempt to extract job details
                title_elem = card.select_one('h3 a, h4 a, .job-title a, .title a')
                
                if not title_elem:
                    continue
                    
                title = title_elem.text.strip()
                url = title_elem.get('href', '')
                if url and not url.startswith('http'):
                    url = "https://www.tanitjobs.com" + url
                    
                company_elem = card.select_one('.company-name, .employer, .company')
                company = company_elem.text.strip() if company_elem else "Unknown Company"
                
                location_elem = card.select_one('.location, .job-location')
                job_location = location_elem.text.strip() if location_elem else "Tunisia"
                
                desc_elem = card.select_one('.description, .job-desc, .details')
                description = desc_elem.text.strip() if desc_elem else ""
                
                # Basic keyword extraction to simulate required skills since scraper might not get them directly
                skills = []
                tech_keywords = ["React", "Nodejs", "Python", "Angular", "Java", "SQL", "Docker", "AWS", "TypeScript", "Vue", "PHP", "Laravel"]
                for tech in tech_keywords:
                    if re.search(r'\b' + re.escape(tech) + r'\b', description + " " + title, re.IGNORECASE):
                        skills.append(tech)

                # Append the extracted job to our list
                all_jobs.append({
                    "title": title,
                    "company": company,
                    "location": job_location,
                    "remote": "remote" in job_location.lower() or "remote" in title.lower(),
                    "description": description,
                    "skills": skills,
                    "posted_at": datetime.now().isoformat(),
                    "url": url,
                    "contract_type": None
                })
                
    except Exception as e:
        print(f"Scraping error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"jobs": all_jobs}

if __name__ == "__main__":
    # Run the server on port 8000
    uvicorn.run("tanitjobs_scraper:app", host="0.0.0.0", port=8000, reload=True)
