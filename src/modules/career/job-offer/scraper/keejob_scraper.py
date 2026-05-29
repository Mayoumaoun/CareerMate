from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bs4 import BeautifulSoup
import requests
import re
from datetime import datetime
import urllib.parse
import uvicorn

app = FastAPI()

class ScrapeRequest(BaseModel):
    queries: list[str]
    location: str

@app.post("/scrape/keejob")
async def scrape_keejob(req: ScrapeRequest):
    all_jobs = []

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        for query in req.queries:
            encoded_query = urllib.parse.quote(query)
            search_url = f"https://www.keejob.com/offres-emploi/?keywords={encoded_query}"

            response = requests.get(search_url, headers=headers, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Each job is inside an <article> or a block with an <h3><a> title
            job_cards = soup.select('article, .job-item, .listing-item')

            # Fallback: find all h3 links that point to /offres-emploi/
            if not job_cards:
                job_links = soup.select('h3 a[href*="/offres-emploi/"]')
                for link in job_links:
                    card = link.find_parent(['article', 'div', 'li'])
                    if card and card not in job_cards:
                        job_cards.append(card)

            for card in job_cards:
                title_elem = card.select_one('h3 a, h2 a')
                if not title_elem:
                    continue

                title = title_elem.get_text(strip=True)
                url = title_elem.get('href', '')
                if url and not url.startswith('http'):
                    url = "https://www.keejob.com" + url

                # Company name
                company_elem = card.select_one('a[href*="/companies/"]')
                company = company_elem.get_text(strip=True) if company_elem else "Unknown"

                # Description / full text of card
                full_text = card.get_text(' ', strip=True)

                # Location: Keejob lists city names as plain text
                location_elem = card.select_one('.location, .city, [class*="location"]')
                job_location = location_elem.get_text(strip=True) if location_elem else req.location

                # Contract type: look for CDI / CDD / SIVP / CIVP in the card text
                contract = None
                for ct in ["CDI", "CDD", "SIVP", "CIVP", "Freelance", "Stage"]:
                    if ct.lower() in full_text.lower():
                        contract = ct
                        break

                # Date
                date_elem = card.select_one('[class*="date"], time')
                posted_at = date_elem.get_text(strip=True) if date_elem else datetime.now().strftime("%d/%m/%Y")

                # Skills extraction
                skills = []
                tech_keywords = ["React", "Node.js", "Python", "Angular", "Java", "SQL",
                                 "Docker", "AWS", "TypeScript", "Vue", "PHP", "Laravel", ".NET", "Spring"]
                for tech in tech_keywords:
                    if re.search(r'\b' + re.escape(tech) + r'\b', full_text, re.IGNORECASE):
                        skills.append(tech)

                all_jobs.append({
                    "title": title,
                    "company": company,
                    "location": job_location,
                    "remote": "remote" in full_text.lower() or "télétravail" in full_text.lower(),
                    "description": full_text[:300],
                    "skills": skills,
                    "posted_at": posted_at,
                    "url": url,
                    "contract_type": contract
                })

    except Exception as e:
        print(f"Scraping error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"jobs": all_jobs, "total": len(all_jobs)}


if __name__ == "__main__":
    uvicorn.run("keejob_scraper:app", host="0.0.0.0", port=8000, reload=True)