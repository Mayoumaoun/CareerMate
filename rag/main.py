from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rag.rag_service import retrieve_similar_chunks
from rag.ats_scorer import calculate_ats_score
from rag.pdf_template import CVPDFGenerator
from dotenv import load_dotenv
from groq import Groq
from fastapi.responses import StreamingResponse
import os
import json
import re
import io
import traceback

load_dotenv()

app = FastAPI()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# helper functions
def extract_personal_info(cv_text: str) -> dict:
    info = {}
    
    # Email
    email = re.search(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}', cv_text)
    info['email'] = email.group() if email else ''
    
    # Phone
    phone = re.search(r'(\+?\d[\d\s\-().]{7,15}\d)', cv_text)
    info['phone'] = phone.group().strip() if phone else ''
    
    # TODO - get links if available from the cv the user uploaded ; to make it clickable

    # LinkedIn
    linkedin = re.search(
        r'(?:linkedin\.com\s*/\s*in\s*/\s*([\w-]+)|' # full URL
        r'linkedin[:\s]+([\w/.-]+)|'                 # label: handle
        r'([\w-]+)-LinkedIn)',                       # handle-LinkedIn format
        cv_text, re.I
    )
    if linkedin:
        # get whichever group matched
        raw = (linkedin.group(1) or linkedin.group(2) or linkedin.group(3) or '').strip()
        info['linkedin'] = f"linkedin.com/in/{raw}" if raw and 'linkedin' not in raw.lower() else raw
    else:
        info['linkedin'] = ''

    # GitHub
    github = re.search(
        r'(?:github\.com\s*/\s*([\w-]+)|'   # full URL
        r'github[:\s]+([\w/.-]+)|'          # label: handle
        r'([\w-]+)-GitHub)',                # handle-GitHub format
        cv_text, re.I
    )
    if github:
        raw = (github.group(1) or github.group(2) or github.group(3) or '').strip()
        info['github'] = f"github.com/{raw}" if raw and 'github' not in raw.lower() else raw
    else:
        info['github'] = ''
    
    # TODO - is this solid enough?or should i use a more complexe logic to extract the name?
    # Name — first non-empty line usually
    lines = [l.strip() for l in cv_text.split('\n') if l.strip()]
    info['name'] = lines[0] if lines else ''
    
    # # DEBUG-temporary might be used ultèrieurement 
    # print(f"[extract_personal_info] raw cv snippet:\n{cv_text[:500]}")
    # print(f"[extract_personal_info] extracted: {info}")

    return info 

# just for testing
@app.get("/health")
def health():
    return {"status": "ok", "chunks_loaded": True}


class OptimizeRequest(BaseModel):
    cv_text: str
    jd_text: str
    required_skills: list[str] = []
    user_profile: dict = {}

class SuggestFixesRequest(BaseModel):
    cv_text: str
    jd_text: str
    required_skills: list[str] = []

class GeneratePdfRequest(BaseModel):
    optimized_cv: dict
    candidate_name: str = "Candidate"
    personal_info: dict = {}

class GenerateFromProfileRequest(BaseModel):
    profile: dict
    job_title: str = ""
    job_description: str = ""

@app.post("/suggest-fixes")
async def suggest_fixes(req: SuggestFixesRequest):
    
    # ATS score
    ats = calculate_ats_score(req.cv_text, req.jd_text, req.required_skills)
    
    # Ask Groq for suggestions only — no rewrite
    prompt = f"""You are a CV coach. Analyze this CV against the job description.
Do NOT rewrite the CV. Give actionable suggestions only.

JOB DESCRIPTION:
{req.jd_text[:500]}

ATS GAPS:
- Missing keywords: {', '.join(ats['missing_keywords'])}
- Missing sections: {', '.join(ats['missing_sections'])}
- Current ATS score: {ats['total']}/100

CV:
{req.cv_text[:1500]}

Return ONLY valid JSON:
{{
  "strengths": ["what is already good in this CV"],
  "weaknesses": ["what is missing or weak"],
  "suggestions": [
    {{
      "section": "summary",
      "issue": "what is wrong",
      "fix": "how to fix it specifically"
    }}
  ],
  "estimated_ats_if_fixed": 75
}}"""

    try:
        response = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        raw = response.choices[0].message.content
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        analysis = json.loads(json_match.group())
    except Exception:
        analysis = {"strengths": [], "weaknesses": [], "suggestions": [], "estimated_ats_if_fixed": 0}

    return {
        "ats_score": ats["total"],
        "ats_details": ats,
        "analysis": analysis
    }

@app.post("/optimize")
async def optimize(req: OptimizeRequest):

    # ATS score before optimization
    ats_before = calculate_ats_score(req.cv_text, req.jd_text, req.required_skills)

    # STEP 2: Domain mismatch guard <3
    if ats_before["total"] < 15 and len(req.required_skills) > 3:
        return {
            "error": "domain_mismatch",
            "message": "CV domain too far from job description. Please check you selected the right job.",
            "ats_score": ats_before["total"]
        }

    # STEP 3: RAG retrieval — find similar CV examples from knowledge base
    similar_chunks = retrieve_similar_chunks(req.cv_text, req.jd_text, top_k=3)
    
    rag_context = "\n\n".join([
        f"--- Example {i+1} (relevance: {round(c['similarity']*100)}%) ---\n{c['text'][:400]}"
        for i, c in enumerate(similar_chunks)
    ])
    #personal info
    personal_info = extract_personal_info(req.cv_text)

    # STEP 4: Build the grounded prompt
    prompt = f"""You are an expert CV optimization assistant.

STRICT RULE: Only use information already present in the CV and user profile below.
Never invent companies, job titles, skills, degrees, or achievements that are not in the input.
If a required skill is missing from the CV AND the profile, list it as a gap — do not add it.

TARGET JOB DESCRIPTION:
{req.jd_text[:600]}

ATS ANALYSIS — GAPS TO FIX:
- Current ATS score: {ats_before['total']}/100
- Missing keywords to integrate (only if truthfully applicable): {', '.join(ats_before['missing_keywords'])}
- Missing sections to add: {', '.join(ats_before['missing_sections'])}

SIMILAR CV EXAMPLES FROM KNOWLEDGE BASE (for style and structure reference):
{rag_context}

USER PROFILE (ground truth — do not go beyond this):
{json.dumps(req.user_profile, indent=2)[:600]}

CV TO OPTIMIZE:
{req.cv_text[:2000]}

Return ONLY a valid JSON object with exactly this structure, nothing else:
{{
  "summary": "rewritten professional summary",
  "skills": ["skill1", "skill2", "skill3"],
  "education": [
    {{
      "degree": "degree name",
      "institution": "school name",
      "period": "2023 - present"
    }}
  ],
  "experiences": [
    {{
      "type": "internship",
      "title": "job title",
      "company": "company name",
      "period": "Jan 2024 - Jun 2024",
      "bullets": ["achievement 1", "achievement 2"]
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "tech": ["tech1", "tech2"],
      "bullets": ["what it does", "your contribution"]
    }}
  ],
  "associations": [
    {{
      "role": "Sponsoring Manager",
      "organization": "DroidDay 10.0",
      "period": "2023",
      "bullets": ["responsibility or achievement"]
    }}
  ],
  "qualities": ["Team player", "Fast learner"],
  "changes_made": ["change 1 and why"],
  "remaining_gaps": ["skill truly missing"]
}}

CLASSIFICATION RULES (strictly follow):
- experiences: only paid professional roles (internships, part-time, full-time). type field = "internship", "part-time", or "full-time"
- projects: academic, personal, or hackathon projects
- associations: club memberships, event committees, sponsoring, volunteering, student org roles
- If something is ambiguous, classify by context clues (e.g. "Academic Project" → projects, "General Secretary" → associations)"""

    # STEP 5: Call Groq
    try:
        response = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        raw_response = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")

    # STEP 6: Parse and validate JSON response
    try:
        json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON found in response")
        optimized = json.loads(json_match.group())
    except Exception:
        raise HTTPException(status_code=500, detail="Model returned invalid JSON. Try again.")

    # STEP 7: Calculate ATS score after optimization
    optimized_cv_text = f"{optimized.get('summary', '')} {' '.join(optimized.get('skills', []))} {' '.join([b for exp in optimized.get('experiences', []) for b in exp.get('bullets', [])])}"
    ats_after = calculate_ats_score(optimized_cv_text, req.jd_text, req.required_skills)

    return {
        "optimized_cv": optimized,
        "personal_info": personal_info,
        #THOSE ARE DEBUGING RETURNS ONLY;mayybe will do another non public /optimize/debug to return those ultèrieurement ; but now ok => TODO
        "ats_before": ats_before["total"],
        "ats_after": ats_after["total"],
        # "ats_details": ats_before,
        # "rag_examples_used": len(similar_chunks)
    }


@app.post("/generate-pdf")
async def generate_pdf(req: GeneratePdfRequest):
    """
    Generate a professional PDF CV from optimized CV data.
    
    The optimized_cv should contain sections like:
    - summary: Professional summary text
    - skills: List of skills
    - experiences: List of work experiences
    - education: Education details
    - certifications: Certifications
    - languages: Languages spoken
    - projects: Projects completed
    - associations: Club memberships, volunteering, etc.
    - qualities: Personal qualities to highlight"""
    print("PERSONAL INFO RECEIVED:", req.personal_info)
    try:
        generator = CVPDFGenerator(candidate_name=req.candidate_name,personal_info=req.personal_info)
        pdf_bytes = generator.generate(req.optimized_cv)
        
        buffer = io.BytesIO(pdf_bytes)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="cv-optimized.pdf"'}
        )
    except Exception as e:
        error_msg = traceback.format_exc()
        print(f"PDF Generation Error:\n{error_msg}")
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {str(e)}"
        )

@app.post("/generate-from-profile")
async def generate_from_profile(req: GenerateFromProfileRequest):
    
    profile = req.profile
    job_title = req.job_title
    job_description = req.job_description

    prompt = f"""You are an expert CV writer. Generate a complete, professional CV from this user profile.

STRICT RULE: Only use information present in the profile below. Do not invent anything.

USER PROFILE:
{json.dumps(profile, indent=2, default=str)[:3000]}

TARGET POSITION: {job_title or "General professional CV"}

JOB DESCRIPTION (if provided, tailor CV to match these requirements):
{job_description[:600] if job_description else "Not provided — generate a general CV"}

Generate a CV that:
1. If a job description was provided, highlights the most relevant skills and experiences that match it
2. Rewrites experience bullets to be impactful and action-oriented
3. Includes all education, certifications, languages from the profile
4. Adds a strong professional summary based on bio + goals + target position

Return ONLY valid JSON with this structure:
{{
  "summary": "professional summary paragraph",
  "skills": ["skill1", "skill2"],
  "education": [
    {{ "degree": "...", "institution": "...", "period": "..." }}
  ],
  "experiences": [
    {{
      "type": "internship",
      "title": "job title",
      "company": "company name",
      "period": "...",
      "bullets": ["achievement 1", "achievement 2"]
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "tech": ["tech1", "tech2"],
      "bullets": ["what it does", "your contribution"]
    }}
  ],
  "certifications": [
    {{ "name": "...", "issuer": "...", "date": "..." }}
  ],
  "languages": [
    {{ "language": "French", "level": "C1" }}
  ],
  "qualities": ["quality1", "quality2"]
}}"""

    try:
        response = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        raw = response.choices[0].message.content
        
        # Try to find and parse JSON more robustly
        json_match = re.search(r'\{', raw)
        if not json_match:
            raise ValueError("No JSON found in response")
        
        # Start from first { and try to parse
        start_idx = json_match.start()
        decoder = json.JSONDecoder()
        try:
            generated, idx = decoder.raw_decode(raw[start_idx:])
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {str(e)}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    return {
        "generated_cv": generated,
        "profile_name": profile.get("name", ""),
    }


# ============== CHAT ENDPOINT ==============

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    user_profile: dict = {}
    conversation_history: list[ChatMessage] = []

@app.post("/chat")
async def chat(req: ChatRequest):
    """
    Career coaching chatbot with streaming responses.
    Personalizes answers based on user profile and conversation history.
    """
    
    try:
        # Build personalized context from user profile
        profile_context = ""
        if req.user_profile:
            name = req.user_profile.get('name', 'the user')
            level = req.user_profile.get('level', 'Student')
            skills = req.user_profile.get('skills', [])
            if isinstance(skills, list) and skills:
                skills_str = ', '.join(skills[:8])
            else:
                skills_str = ''
            
            education = req.user_profile.get('education', '')
            bio = req.user_profile.get('bio', '')
            goal = req.user_profile.get('career_goal', '')
            
            profile_context = f"""
User Context:
- Name: {name}
- Level: {level}
- Skills: {skills_str}
- Education: {education}
- Bio: {bio}
- Career Goal: {goal}

Tailor your advice specifically to their profile and goals."""
        
        system_prompt = f"""You are CareerMate AI, a friendly and expert career assistant. 
You help students and young professionals with:
- CV and resume optimization
- Cover letter writing
- Job search strategies  
- Interview preparation and mock interviews
- Career planning and skill development
- Understanding job requirements and market trends
- LinkedIn profile optimization
- Personal branding tips
- Salary negotiation advice
- Dealing with job rejection and career transitions

{profile_context}

IMPORTANT RULES:
1. Keep responses concise (3-5 sentences max unless the user asks for detail or examples)
2. Be encouraging, practical, and specific - never give generic advice
3. If asked about something unrelated to career, politely redirect
4. When suggesting CV changes, be specific about what to add/change and why
5. Always consider the user's experience level when giving advice
6. If you don't know something, say so honestly
7. Provide actionable next steps when relevant

Style: Professional but friendly, with clear structure when giving multiple points."""

        # Build messages for API call
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history (last 6 messages = 3 exchanges) for context
        for msg in req.conversation_history[-6:]:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current user message
        messages.append({"role": "user", "content": req.message})

        # Stream response from Groq
        def generate():
            """Generator function for streaming response"""
            try:
                stream = groq_client.chat.completions.create(
                    model="meta-llama/llama-4-scout-17b-16e-instruct",
                    messages=messages,
                    temperature=0.7,
                    stream=True,
                    max_tokens=500,
                    top_p=0.95,
                )
                
                for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        yield content
                        
            except Exception as e:
                yield f"\n\n[Error]: Unable to generate response - {str(e)}"

        return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Chat service error: {str(e)}"
        )