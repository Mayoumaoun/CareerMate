import { Injectable } from '@nestjs/common';
import { buildJobText, buildProfileText } from './job-matching.utils';
import { CanonicalJobOffer, ProfileSnapshot } from './job-matching.types';

@Injectable()
export class SimpleEmbeddingService {
  private readonly dimensions = 96;

  embedProfile(snapshot: ProfileSnapshot): number[] {
    return this.embedText(buildProfileText(snapshot));
  }

  embedJob(job: CanonicalJobOffer): number[] {
    return this.embedText(buildJobText(job));
  }

  private embedText(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s+.#-]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1);

    for (const token of tokens) {
      let hash = 0;

      for (let index = 0; index < token.length; index += 1) {
        hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
      }

      const bucket = hash % this.dimensions;
      const weight = 1 + ((hash >>> 8) % 5) / 10;
      vector[bucket] += weight;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (!magnitude) {
      return vector;
    }

    return vector.map((value) => value / magnitude);
  }
}