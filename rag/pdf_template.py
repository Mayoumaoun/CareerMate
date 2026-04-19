import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)


class CVPDFGenerator:
    def __init__(self, candidate_name: str = "Candidate", personal_info: dict = None):
        self.candidate_name = candidate_name
        self.personal_info = personal_info or {}
        self.styles = self._create_styles()

    def _create_styles(self):
        from reportlab.lib.styles import StyleSheet1
        styles = StyleSheet1()

        styles.add(ParagraphStyle(
            name='CandidateName',
            fontSize=22,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#1a1a2e'),
            alignment=TA_CENTER,
            spaceAfter=20
        ))

        styles.add(ParagraphStyle(
            name='ContactLine',
            fontSize=9,
            fontName='Helvetica',
            textColor=colors.HexColor('#444444'),
            alignment=TA_CENTER,
            spaceAfter=12,
            leading=11
        ))

        styles.add(ParagraphStyle(
            name='Section',
            fontSize=11.5,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#2d6a4f'),
            spaceBefore=10,
            spaceAfter=4
        ))

        styles.add(ParagraphStyle(
            name='SubTitle',
            fontSize=10.5,
            fontName='Helvetica-Bold',
            textColor=colors.black,
            spaceAfter=1
        ))

        styles.add(ParagraphStyle(
            name='Company',
            fontSize=9.5,
            fontName='Helvetica-Oblique',
            textColor=colors.grey,
            spaceAfter=3
        ))

        styles.add(ParagraphStyle(
            name='Body',
            fontSize=10,
            fontName='Helvetica',
            leading=13,
            spaceAfter=4
        ))

        styles.add(ParagraphStyle(
            name='Bullet',
            fontSize=10,
            fontName='Helvetica',
            leftIndent=12,
            leading=12,
            spaceAfter=2
        ))

        return styles

    # def generate(self, cv_data: dict, personal_info: dict = None) -> bytes:
    def generate(self, cv_data: dict) -> bytes:

        try:
            buffer = io.BytesIO()

            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=1.5 * cm,
                leftMargin=1.5 * cm,
                topMargin=1.5 * cm,
                bottomMargin=1.5 * cm
            )

            story = []

            #nom candidat
            name = self.personal_info.get('name', self.candidate_name)
            story.append(Paragraph(name, self.styles['CandidateName']))
            # story.append(Spacer(1, 6)) 

            #mail,phone, linkedin, github
            if self.personal_info:
                contact_parts = []
                if self.personal_info.get('email'):
                    contact_parts.append(self.personal_info['email'])
                if self.personal_info.get('phone'):
                    contact_parts.append(self.personal_info['phone'])
                if self.personal_info.get('linkedin'):
                    contact_parts.append(self.personal_info['linkedin'])
                if self.personal_info.get('github'):
                    contact_parts.append(self.personal_info['github'])
                
                if contact_parts:
                    story.append(Paragraph('   |   '.join(contact_parts), self.styles['ContactLine']))
            story.append(Spacer(1, 4)) 
            story.append(HRFlowable(
                width="100%",
                thickness=2,
                color=colors.HexColor('#2d6a4f'),
                spaceAfter=10
            ))

            #summury
            if cv_data.get('summary'):
                story.append(Paragraph("PROFESSIONAL SUMMARY", self.styles['Section']))
                story.append(Paragraph(cv_data['summary'], self.styles['Body']))

            #skills
            if cv_data.get('skills'):
                story.append(Paragraph("SKILLS", self.styles['Section']))

                # Filter out languages from skills (they go in their own section)
                possible_languages = ["Arabic", "English", "French", "Spanish", "German"]
                tech_skills = [s for s in cv_data['skills'] if s not in possible_languages]

                if tech_skills:
                    cols = 3
                    rows = [tech_skills[i:i + cols] for i in range(0, len(tech_skills), cols)]
                    # Pad last row
                    while len(rows[-1]) < cols:
                        rows[-1].append('')

                    table = Table(rows, hAlign='LEFT', colWidths=[6*cm, 6*cm, 6*cm])
                    table.setStyle(TableStyle([
                        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 0), (-1, -1), 9),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ]))
                    story.append(table)

            #education
            if cv_data.get('education'):
                story.append(Paragraph("EDUCATION", self.styles['Section']))
                for edu in cv_data['education']:
                    degree = edu.get('degree', '')
                    institution = edu.get('institution', '')
                    period = edu.get('period', '')
                    
                    title_text = degree
                    if period:
                        title_text += f" ({period})"
                    if title_text:
                        story.append(Paragraph(title_text, self.styles['SubTitle']))
                    if institution:
                        story.append(Paragraph(institution, self.styles['Company']))
                    story.append(Spacer(1, 4))

            #experience
            if cv_data.get('experiences'):
                story.append(Paragraph("EXPERIENCE", self.styles['Section']))

                for exp in cv_data['experiences']:
                    title = exp.get('title', '')
                    company = exp.get('company', '')
                    bullets = exp.get('bullets', [])

                    if title:
                        story.append(Paragraph(title, self.styles['SubTitle']))
                    if company:
                        story.append(Paragraph(company, self.styles['Company']))
                    for bullet in bullets:
                        story.append(Paragraph(f"• {bullet}", self.styles['Bullet']))

                    story.append(Spacer(1, 8))
            
            #projets
            if cv_data.get('projects'):
                story.append(Paragraph("PROJECTS", self.styles['Section']))
                # story.append(HRFlowable(width="100%", thickness=0.5,
                #                         color=colors.HexColor('#cccccc'), spaceAfter=6))
                for proj in cv_data['projects']:
                    tech_str = f" — <i>{', '.join(proj.get('tech', []))}</i>" if proj.get('tech') else ''
                    story.append(Paragraph(f"<b>{proj.get('name', '')}</b>{tech_str}", self.styles['SubTitle']))
                    for bullet in proj.get('bullets', []):
                        story.append(Paragraph(f"•  {bullet}", self.styles['Bullet']))
                    story.append(Spacer(1, 5))

            #associations,roles,memberships
            if cv_data.get('associations'):
                story.append(Paragraph("ASSOCIATIVE ENGAGEMENT", self.styles['Section']))
                # story.append(HRFlowable(width="100%", thickness=0.5,
                #                         color=colors.HexColor('#cccccc'), spaceAfter=6))
                for assoc in cv_data['associations']:
                    period_str = f" ({assoc['period']})" if assoc.get('period') else ''
                    story.append(Paragraph(
                        f"<b>{assoc.get('role', '')}</b> — {assoc.get('organization', '')}{period_str}",
                        self.styles['SubTitle']))
                    for bullet in assoc.get('bullets', []):
                        story.append(Paragraph(f"•  {bullet}", self.styles['Bullet']))
                    story.append(Spacer(1, 5))

            #languages
            possible_languages = ["Arabic", "English", "French", "Spanish", "German", "Chinese", "Japanese", "Russian"]
            languages = [s for s in cv_data.get('skills', []) if s in possible_languages]
            if languages:
                story.append(Paragraph("LANGUAGES", self.styles['Section']))
                story.append(Paragraph(", ".join(languages), self.styles['Body']))

            #qualités
            if cv_data.get('qualities'):
                story.append(Paragraph("QUALITIES", self.styles['Section']))
                story.append(Paragraph(", ".join(cv_data['qualities']), self.styles['Body']))

            doc.build(story)
            buffer.seek(0)
            return buffer.getvalue()

        except Exception as e:
            raise Exception(f"PDF error: {str(e)}")