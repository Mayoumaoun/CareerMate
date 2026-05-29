import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EntretienLanguage } from '../entities/entretien.entity';

@Injectable()
export class SpeechService {
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


  async transcribe(
    audioBuffer: Buffer,
    language: EntretienLanguage,
  ): Promise<string> {
    const tmpPath = path.join(os.tmpdir(), `audio_${Date.now()}.webm`);
    fs.writeFileSync(tmpPath, audioBuffer);

    try {
      const transcription = await this.groq.audio.transcriptions.create({
        file: fs.createReadStream(tmpPath),
        model: 'whisper-large-v3',
        language: language === EntretienLanguage.FR ? 'fr' : 'en',
        response_format: 'text',
      });
      return transcription as unknown as string;
    } finally {
      fs.unlinkSync(tmpPath);
    }
  }


  async synthesize(text: string, language: EntretienLanguage): Promise<Buffer> {
    const isFR = language === EntretienLanguage.FR;

    const voice = isFR
      ? 'fr-FR-VivienneMultilingualNeural'
      : 'en-US-EmmaMultilingualNeural';

    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const streams = tts.toStream(text);
      const readable = streams.audioStream;
      readable.on('data', (chunk) => chunks.push(chunk));
      readable.on('end', () => resolve(Buffer.concat(chunks)));
      readable.on('error', reject);
    });
  }
}
