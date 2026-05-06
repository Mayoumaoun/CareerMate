import { RoadmapDepth, RoadmapIntensity, RoadmapMode } from "./roadmap.enums";
import { GenerationParams } from "./roadmap.types";


interface ProfileContext {
  skills: string[];
  experiences: string;
  education: string;
  projects: string;
  userLevel: string;
  targetPosition?: string;
}

interface PromptInput {
  mode: RoadmapMode;
  targetJob: string;
  params: GenerationParams;
  profile?: ProfileContext;
  jobDescription?: string;
}

export class RoadmapPromptBuilder {
  static build(input: PromptInput): string {
    const { mode, targetJob, params, profile, jobDescription } = input;

    const durationText = params.durationWeeks
      ? `The roadmap must span exactly ${params.durationWeeks} weeks.`
      : 'The roadmap should span 12 weeks by default.';

    const intensityText = this.intensityInstruction(params.intensity as RoadmapIntensity);
    const depthText = this.depthInstruction(params.depth as RoadmapDepth);

    const profileSection = profile
      ? `
## Candidate Profile
- Level: ${profile.userLevel}
- Current skills: ${profile.skills.join(', ') || 'none listed'}
- Target position: ${profile.targetPosition || 'not specified'}
- Experience: ${profile.experiences || 'none'}
- Education: ${profile.education || 'none'}
- Projects: ${profile.projects || 'none'}
${params.focusAreas?.length ? `- Focus areas requested: ${params.focusAreas.join(', ')}` : ''}
${params.currentSkillsOverride?.length ? `- Override skills: ${params.currentSkillsOverride.join(', ')}` : ''}
`
      : '';

    const jobSection = jobDescription
      ? `\n## Target Job Description\n${jobDescription}\n`
      : '';

    const modeInstruction = this.modeInstruction(mode, targetJob);

    return `You are an expert career coach and learning path designer.

${modeInstruction}
${profileSection}
${jobSection}

## Requirements
- ${durationText}
- ${intensityText}
- ${depthText}
- Perform a gap analysis between the candidate's current skills and what the target role requires.
- Each step covers one week. Group related topics together logically.
- For each step, provide 2-4 concrete learning resources (courses, articles, projects, practice).
- Prefer free resources when possible. Include platform names.
- Skills listed per step must be specific and actionable (not just "learn JavaScript" — say "async/await, Promise chaining, error handling").

## Output format
Respond ONLY with a valid JSON array. No preamble, no explanation, no markdown fences.

Schema for each element:
{
  "id": "<uuid-v4>",
  "weekNumber": <number>,
  "title": "<short step title>",
  "description": "<2-3 sentences describing what the candidate will learn and why it matters>",
  "skills": ["skill1", "skill2"],
  "resources": [
    {
      "type": "course" | "article" | "project" | "practice" | "video",
      "title": "<resource title>",
      "url": "<url or null>",
      "platform": "<platform name>",
      "estimatedHours": <number>,
      "free": <boolean>
    }
  ],
  "status": "pending",
  "completedAt": null,
  "notes": null
}`;
  }

  private static modeInstruction(mode: RoadmapMode, targetJob: string): string {
    switch (mode) {
      case RoadmapMode.TARGET_JOB:
        return `Generate a personalized learning roadmap to help the candidate become a **${targetJob}**. Use their current profile to identify gaps and tailor the roadmap accordingly.`;
      case RoadmapMode.JOB_OFFER:
        return `Generate a targeted preparation roadmap to help the candidate become ready for the specific job offer described below. Focus strictly on what this offer requires.`;
      case RoadmapMode.GENERIC:
        return `Generate a comprehensive learning roadmap on the topic of **${targetJob}**. This is a generic roadmap — no profile context is available, so cover fundamentals through advanced topics progressively.`;
    }
  }

  private static intensityInstruction(intensity?: RoadmapIntensity): string {
    switch (intensity) {
      case RoadmapIntensity.LIGHT:
        return 'Light intensity: 3-5 hours of study per week. Suitable for someone learning alongside a full schedule.';
      case RoadmapIntensity.INTENSIVE:
        return 'Intensive: 15-20 hours per week. The candidate is fully committed to this transition.';
      case RoadmapIntensity.MODERATE:
      default:
        return 'Moderate intensity: 8-10 hours of study per week.';
    }
  }

  private static depthInstruction(depth?: RoadmapDepth): string {
    switch (depth) {
      case RoadmapDepth.OVERVIEW:
        return 'Overview depth: Cover the essentials needed to get started and be productive. Skip deep internals.';
      case RoadmapDepth.DEEP_DIVE:
        return 'Deep-dive depth: Go beyond surface knowledge. Include architecture, internals, best practices, and advanced patterns.';
      case RoadmapDepth.STANDARD:
      default:
        return 'Standard depth: Cover concepts thoroughly enough to work confidently in a professional setting.';
    }
  }
}
