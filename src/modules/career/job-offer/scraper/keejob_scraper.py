from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bs4 import BeautifulSoup
import requests
import re
import time
from datetime import datetime
import urllib.parse
import uvicorn

app = FastAPI()

class ScrapeRequest(BaseModel):
    queries: list[str]
    location: str

CONTRACT_TYPES = ["CDI", "CDD", "SIVP", "CIVP", "Freelance", "Stage"]

TECH_KEYWORDS = [
    "React", "Node.js", "Python", "Angular", "Java", "SQL", "Docker",
    "AWS", "TypeScript", "Vue", "PHP", "Laravel", ".NET", "Spring",
    "MongoDB", "PostgreSQL", "Redis", "Kubernetes", "Git", "Linux",
    "Django", "Flask", "Express", "GraphQL", "REST", "Kafka",
    "Ansible", "Terraform", "Jenkins", "Azure", "GCP", "Elasticsearch",
    "RabbitMQ", "Celery", "FastAPI", "NestJS", "Next.js", "Nuxt",
]

SOFT_SKILL_KEYWORDS = [
    "communication", "teamwork", "leadership", "problem solving",
    "autonomie", "rigueur", "organisation", "adaptabilité", "proactif",
]

SENIORITY_PATTERNS = {
    "junior": r'\b(junior|débutant|entry.?level|stagiaire)\b',
    "mid":    r'\b(confirmé|intermédiaire|mid.?level|2\s*à\s*5\s*ans)\b',
    "senior": r'\b(senior|expérimenté|lead|principal|chef|directeur|head\s+of)\b',
}

JOB_FUNCTION_KEYWORDS = {
    "Engineering":   r'\b(développ|engineer|software|backend|frontend|fullstack|full.?stack|devops|sre|cloud|infrastructure|programmeur|développeur)\b',
    "Data":          r'\b(data\s*(scientist|engineer|analyst)|machine\s*learning|big\s*data|analytics|bi\b|business\s*intelligence|intelligence\s*artificielle|ia\b|ai\b)\b',
    "Design":        r'\b(ui/?ux|design|graphi[sc]|figma|creative|webdesign|maquette)\b',
    "Marketing":     r'\b(marketing|seo|sem|growth|brand|community\s*manager|social\s*media|content\s*manager|communication\s*digitale)\b',
    "Sales":         r'\b(vente|commercial|sales|account\s*manager|business\s*develop|chargé.*affaires)\b',
    "Finance":       r'\b(financ|compta|accounting|audit|contrôle\s*de\s*gestion|trésor)\b',
    "HR":            r'\b(ressources\s*humaines|rh\b|human\s*resources|hr\b|recrutement|talent\s*acquisition)\b',
    "Operations":    r'\b(opérations?|logistics?|supply\s*chain|procurement|achat)\b',
    "Support":       r'\b(support|helpdesk|service\s*client|customer\s*success|assistance)\b',
    "QA":            r'\b(qa\b|quality\s*assurance|test(ing|eur)?|assurance\s*qualité)\b',
    "Project Mgmt":  r'\b(chef\s*de\s*projet|project\s*manage|scrum\s*master|product\s*owner|agile|coordination)\b',
    "Security":      r'\b(cyber|sécurité|security|soc\b|pentest|infosec)\b',
    "Network/Sys":   r'\b(réseau|network|système|system\s*admin|sysadmin|infrastructure)\b',
}

EDUCATION_PATTERNS = [
    (r'bac\s*\+\s*5|master|ingénieur|mastère|diplôme\s*d.ingénieur', 'Master'),
    (r'bac\s*\+\s*3|licence|bachelor', 'Bachelor'),
    (r'bac\s*\+\s*2|bts|dut|deug|technicien\s*supérieur', 'Associate'),
    (r'doctorat|phd|thèse', 'PhD'),
    (r"master'?s?\s*degree", 'Master'),
    (r"bachelor'?s?\s*degree|b\.?s\.?c?\.?|b\.?a\.?", 'Bachelor'),
]

EDUCATION_FIELD_PATTERNS = [
    (r'\b(informatique|computer\s*science|cs\b|génie\s*logiciel|software\s*engineering)\b', 'Computer Science'),
    (r'\b(génie\s*civil|civil\s*engineering)\b', 'Civil Engineering'),
    (r'\b(gestion|management|business|commerce|sciences\s*de\s*gestion)\b', 'Business'),
    (r'\b(électrique|electrical|électronique|electronic|génie\s*électrique)\b', 'Electrical Engineering'),
    (r'\b(mathématiques?|mathematics?|statistiques?|statistics?)\b', 'Mathematics'),
    (r'\b(télécom|telecom|télécommunications?)\b', 'Telecommunications'),
    (r'\b(mécanique|mechanical)\b', 'Mechanical Engineering'),
    (r'\b(comptabilité|finance|sciences\s*financières)\b', 'Finance'),
    (r'\b(marketing|publicité)\b', 'Marketing'),
]


def extract_keywords(text: str, keywords: list[str]) -> list[str]:
    found = []
    for kw in keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', text, re.IGNORECASE):
            found.append(kw)
    return found


def detect_seniority(text: str, experience_years: int | None = None) -> str | None:
    """Detect seniority from text keywords, with fallback to experience years."""
    for level, pattern in SENIORITY_PATTERNS.items():
        if re.search(pattern, text, re.IGNORECASE):
            return level
    # Fallback: infer from experience years if available
    if experience_years is not None:
        if experience_years <= 2:
            return 'junior'
        elif experience_years <= 5:
            return 'mid'
        else:
            return 'senior'
    return None


def detect_job_function(title: str, description: str) -> str | None:
    """Detect job function/department from title and description."""
    # Check title first (higher signal)
    for function, pattern in JOB_FUNCTION_KEYWORDS.items():
        if re.search(pattern, title, re.IGNORECASE):
            return function
    # Then check full description
    for function, pattern in JOB_FUNCTION_KEYWORDS.items():
        if re.search(pattern, description, re.IGNORECASE):
            return function
    return None


def detect_education(text: str) -> dict | None:
    """Extract education requirements (level + field) from text."""
    level = None
    for pattern, edu_level in EDUCATION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            level = edu_level
            break
    if not level:
        return None
    # Try to find the field of study
    field = 'General'
    for pattern, edu_field in EDUCATION_FIELD_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            field = edu_field
            break
    return {'level': level, 'field': field}


def detect_work_arrangement(text: str) -> str:
    lower = text.lower()
    if 'télétravail' in lower or 'remote' in lower or 'à distance' in lower:
        return 'remote'
    if 'hybride' in lower or 'hybrid' in lower:
        return 'hybrid'
    return 'on-site'


def parse_experience_years(text: str) -> int | None:
    """Extract required years of experience from text using multiple patterns."""
    patterns = [
        # French patterns
        r"(\d+)\s*(?:\+\s*)?ans?\s*d[''\u2019]expérience",
        r"expérience\s*(?:de\s*)?(?:minimum\s*)?(?:au\s*moins\s*)?(\d+)\s*(?:\+\s*)?ans?",
        r"minimum\s*(\d+)\s*ans?\s*(?:d[''\u2019]expérience)?",
        r"au\s*moins\s*(\d+)\s*ans?",
        r"(\d+)\s*(?:à|a|-)\s*\d+\s*ans?\s*d[''\u2019]expérience",
        r"(\d+)\s*ans?\s*(?:et\s*plus|minimum|min)",
        # English patterns
        r"(\d+)\s*\+?\s*years?\s*(?:of\s*)?experience",
        r"experience\s*(?:of\s*)?(\d+)\s*\+?\s*years?",
        r"minimum\s*(\d+)\s*years?",
        r"at\s*least\s*(\d+)\s*years?",
        r"(\d+)\s*(?:to|-)\s*\d+\s*years?\s*(?:of\s*)?experience",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            years = int(match.group(1))
            if 0 <= years <= 30:  # sanity check
                return years
    return None


def generate_excerpt(description: str, max_length: int = 300) -> str | None:
    """Generate a clean, sentence-boundary-aware excerpt from description text."""
    if not description or len(description.strip()) == 0:
        return None
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', description).strip()
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    excerpt = ''
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(excerpt) + len(sentence) + 1 > max_length:
            break
        excerpt += (' ' if excerpt else '') + sentence
    if not excerpt:
        # Fallback: truncate at last word boundary
        excerpt = text[:max_length].rsplit(' ', 1)[0] + '…'
    return excerpt


def parse_salary(text: str) -> tuple[int | None, int | None, str | None]:
    range_match = re.search(
        r'(\d[\d\s]*)\s*[-–]\s*(\d[\d\s]*)\s*(TND|EUR|USD|DT)?',
        text,
        re.IGNORECASE
    )
    if range_match:
        min_val = int(range_match.group(1).replace(' ', ''))
        max_val = int(range_match.group(2).replace(' ', ''))
        currency = (range_match.group(3) or 'TND').upper()
        currency = 'TND' if currency == 'DT' else currency
        if 300 <= min_val <= 100_000 and 300 <= max_val <= 100_000:
            return min_val, max_val, currency

    single_match = re.search(
        r'(\d[\d\s]{2,})\s*(TND|EUR|USD|DT)',
        text,
        re.IGNORECASE
    )
    if single_match:
        val = int(single_match.group(1).replace(' ', ''))
        currency = single_match.group(2).upper()
        currency = 'TND' if currency == 'DT' else currency
        if 300 <= val <= 100_000:
            return val, val, currency

    return None, None, None


def parse_location(text: str) -> str | None:
    match = re.search(
        r'([A-ZÀ-Ÿa-zà-ÿ\s\-,]+)\s+\d{1,2}\s+(?:jan|fév|mar|avr|mai|juin|juil|aoû|sep|oct|nov|déc)',
        text,
        re.IGNORECASE
    )
    if match:
        location = match.group(1).strip().strip(',')
        if len(location) > 2 and location.lower() not in ('voir', 'offre', 'de', 'la'):
            return location
    return None


def parse_company_from_text(title: str, full_text: str) -> str:
    text_after_title = full_text.replace(title, '', 1).strip()

    separators = CONTRACT_TYPES + [
        'consulting', 'services', 'communication', 'publicité', 'média',
        'industrie', 'informatique', 'recrutement', 'agence',
    ]
    sep_pattern = '|'.join(re.escape(s) for s in separators)

    match = re.split(sep_pattern, text_after_title, maxsplit=1, flags=re.IGNORECASE)
    candidate = match[0].strip() if match else text_after_title[:60]

    company = re.sub(r'\s+', ' ', candidate).strip()
    return company[:80] if company else 'Unknown'


def parse_posted_date(text: str) -> str | None:
    MONTHS_FR = {
        'jan': 1, 'fév': 2, 'mar': 3, 'avr': 4, 'mai': 5, 'juin': 6,
        'juil': 7, 'aoû': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'déc': 12,
    }
    match = re.search(
        r'(\d{1,2})\s+(jan|fév|mar|avr|mai|juin|juil|aoû|sep|oct|nov|déc)\w*\s+(\d{4})',
        text,
        re.IGNORECASE
    )
    if match:
        day   = int(match.group(1))
        month = MONTHS_FR.get(match.group(2).lower()[:3], 1)
        year  = int(match.group(3))
        return f"{year:04d}-{month:02d}-{day:02d}"

    match2 = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', text)
    if match2:
        return f"{match2.group(3)}-{match2.group(2).zfill(2)}-{match2.group(1).zfill(2)}"

    return None


def get_elem_text(card, selector: str) -> str | None:
    elem = card.select_one(selector)
    if not elem:
        return None
    text = elem.get_text(strip=True)
    return text if text else None


def fetch_job_detail(url: str, headers: dict) -> str:
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        detail = soup.select_one(
            '.job-description, .offer-description, '
            '[class*="description"], [class*="content"], article'
        )
        if detail:
            return detail.get_text(' ', strip=True)
        body = soup.find('body')
        return body.get_text(' ', strip=True) if body else ''
    except Exception as e:
        print(f"Detail fetch failed for {url}: {e}")
        return ''


@app.post("/scrape/keejob")
async def scrape_keejob(req: ScrapeRequest):
    all_jobs = []
    seen_urls = set()

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
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

            job_cards = soup.select('article, .job-item, .listing-item')

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
                url   = title_elem.get('href', '')
                if url and not url.startswith('http'):
                    url = "https://www.keejob.com" + url

                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)

                full_text = card.get_text(' ', strip=True)

                company = (
                    get_elem_text(card, 'a[href*="/companies/"], .company-name, .employer, [class*="company"]')
                    or parse_company_from_text(title, full_text)
                )

                contract = get_elem_text(card, '[class*="contract"], [class*="type"]')
                if not contract:
                    for ct in CONTRACT_TYPES:
                        if re.search(r'\b' + re.escape(ct) + r'\b', full_text, re.IGNORECASE):
                            contract = ct
                            break

                salary_min, salary_max, salary_currency = parse_salary(full_text)

            
                job_location = (
                    get_elem_text(card, '.location, .city, [class*="location"], [class*="city"]')
                    or parse_location(full_text)
                    or req.location
                )

           
                posted_at = (
                    get_elem_text(card, '[class*="date"], time')
                    or parse_posted_date(full_text)
                )

             
                detail_text = fetch_job_detail(url, headers)
                time.sleep(0.3)

                enrichment_text = detail_text if detail_text else full_text

                skills_required  = extract_keywords(enrichment_text, TECH_KEYWORDS)
                soft_skills      = extract_keywords(enrichment_text, SOFT_SKILL_KEYWORDS)
                work_arrangement = detect_work_arrangement(enrichment_text)
                experience_years = parse_experience_years(enrichment_text)
                seniority_level  = detect_seniority(enrichment_text, experience_years)
                job_function     = detect_job_function(title, enrichment_text)
                education        = detect_education(enrichment_text)

                if not seniority_level:
                    seniority_level = detect_seniority(title, experience_years)

                excerpt = generate_excerpt(enrichment_text)

                all_jobs.append({
                    "title":                     title,
                    "company":                   company,
                    "url":                       url,
                    "apply_link":                url,
                    "description":               detail_text or full_text,
                    "excerpt":                   excerpt,
                    "contract_type":             contract,
                    "work_arrangement":          work_arrangement,
                    "seniority_level":           seniority_level,
                    "job_function":              job_function,
                    "location":                  job_location,
                    "remote":                    work_arrangement == 'remote',
                    "skills":                    skills_required,
                    "preferred_skills":          [],
                    "soft_skills":               soft_skills,
                    "salary_min":                salary_min,
                    "salary_max":                salary_max,
                    "salary_currency":           salary_currency,
                    "required_experience_years": experience_years,
                    "education_required":        education,
                    "posted_at":                 posted_at,
                    "matched_query":             query,
                })

    except Exception as e:
        print(f"Scraping error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"jobs": all_jobs, "total": len(all_jobs)}


if __name__ == "__main__":
    uvicorn.run("keejob_scraper:app", host="0.0.0.0", port=8000, reload=True)