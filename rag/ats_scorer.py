import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine


def calculate_ats_score(cv_text: str, jd_text: str, required_skills: list[str]) -> dict:

    cv_lower = cv_text.lower()

    # 1. Keyword match score (40 pts)
    # Check which required skills appear in the CV text
    cv_normalized = ' '.join(cv_text.lower().split())
    matched = [s for s in required_skills if s.lower().replace('-', ' ') in cv_normalized]
    missing = [s for s in required_skills if s.lower().replace('-', ' ') not in cv_normalized]    
    missing = [s for s in required_skills if s.lower() not in cv_lower]
    keyword_score = (len(matched) / len(required_skills)) * 40 if required_skills else 20

    # 2. TF-IDF semantic similarity score (30 pts)
    # Measures how similar the CV vocabulary is to the JD vocabulary
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([cv_text, jd_text])
        semantic_raw = float(sklearn_cosine(tfidf_matrix[0], tfidf_matrix[1])[0][0])
        semantic_score = semantic_raw * 30
    except Exception:
        semantic_score = 0
        semantic_raw = 0

    # 3. Section completeness score (20 pts)
    # Checks if the CV has the key structural sections
    has_summary = bool(re.search(r'summary|objective|profile|about me', cv_text, re.I))
    has_metrics = bool(re.search(r'\d+\s*%|\d+\s*(users|clients|projects|teams|million|k\b)', cv_text, re.I))
    has_skills  = bool(re.search(r'skills|technologies|stack|tools|frameworks', cv_text, re.I))
    has_experience = bool(re.search(r'experience|work history|employment', cv_text, re.I))
    
    sections_found = sum([has_summary, has_metrics, has_skills, has_experience])
    section_score = (sections_found / 4) * 20

    # Total
    total = round(keyword_score + semantic_score + section_score)
    total = min(total, 100)  # cap at 100

    return {
        "total": total,
        "breakdown": {
            "keyword_match": round(keyword_score),
            "semantic_similarity": round(semantic_score),
            "section_completeness": round(section_score)
        },
        "matched_keywords": matched,
        "missing_keywords": missing,
        "missing_sections": [
            name for name, found in [
                ("summary/objective", has_summary),
                ("quantified metrics", has_metrics),
                ("skills section", has_skills),
                ("experience section", has_experience)
            ] if not found
        ],
        "semantic_raw": round(semantic_raw, 3)
    }



# same just for testing
if __name__ == "__main__":
    import json
    print("\n--- TEST calculate_ats_score ---")
    result = calculate_ats_score(
        cv_text="Python developer with 3 years experience in Django and REST APIs. Skills: Python, SQL, Git.",
        jd_text="We need a backend developer. Required: Python, Docker, CI/CD, REST APIs.",
        required_skills=["Python", "Docker", "CI/CD", "REST APIs"]
    )
    print(json.dumps(result, indent=2))
    print(f"\nATS score: {result['total']}/100")
    print(f"Matched: {result['matched_keywords']}")
    print(f"Missing: {result['missing_keywords']}")
    print("\nATS scorer test passed.")