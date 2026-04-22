import { createHash } from 'crypto';
import { CanonicalJobOffer, ProfileSnapshot } from './job-matching.types';

export function cosineSimilarity(left: number[], right: number[]): number {
  if (!left.length || !right.length || left.length !== right.length) {
    return 0;
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function stableHash(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export function buildProfileText(snapshot: ProfileSnapshot): string {
  return [
    `Name: ${snapshot.fullName}`,
    `Bio: ${snapshot.bio}`,
    `Target role: ${snapshot.targetPosition}`,
    `Level: ${snapshot.userLevel}`,
    `Location: ${snapshot.location}`,
    `Skills: ${snapshot.skills.join(', ')}`,
    `Experiences: ${snapshot.experiences}`,
    `Education: ${snapshot.education}`,
    `Languages: ${snapshot.languages}`,
    `Certifications: ${snapshot.certifications}`,
    `Projects: ${snapshot.projects}`,
  ].join('\n');
}

export function buildJobText(job: Pick<CanonicalJobOffer, 'title' | 'company' | 'location' | 'description' | 'skillsRequired' | 'contractType' | 'remote'>): string {
  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `Remote: ${job.remote ? 'yes' : 'no'}`,
    `Contract: ${job.contractType ?? 'unknown'}`,
    `Skills: ${job.skillsRequired.join(', ')}`,
    `Description: ${job.description}`,
  ].join('\n');
}

export function deduplicateBySourceHash<T extends { sourceHash: string }>(jobs: T[]): T[] {
  const seen = new Set<string>();
  const results: T[] = [];

  for (const job of jobs) {
    if (seen.has(job.sourceHash)) {
      continue;
    }

    seen.add(job.sourceHash);
    results.push(job);
  }

  return results;
}

export function sanitizeArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);
}