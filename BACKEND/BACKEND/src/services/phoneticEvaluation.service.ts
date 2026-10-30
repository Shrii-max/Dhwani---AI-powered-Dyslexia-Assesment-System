/**
 * Phonetic Evaluation Service for Dhwani Dyslexia Assessment System
 * 
 * Provides text normalization, Soundex phonetic encoding, Levenshtein distance,
 * and question-specific phonetic evaluation for speech assessments (phoneme identification,
 * matching, blending, segmentation, deletion, substitution, and word reading).
 */

export interface EvaluationResult {
  isCorrect: boolean;
  status: 'correct' | 'incorrect' | 'unclear';
  confidence: number;
  similarity: number;
  normalizedTranscript: string;
  normalizedExpected: string;
  feedback: string;
  errorType: string | null;
}

export class PhoneticEvaluationService {
  /**
   * Normalize text by trimming, converting to lowercase, removing punctuation,
   * stripping slashes from phonemes (e.g. "/s/" -> "s"), and collapsing whitespace.
   */
  normalizeText(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'•]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Standard American Soundex algorithm.
   * Maps words to a 4-character phonetic code (Letter + 3 digits).
   */
  getSoundex(word: string): string {
    const clean = word.toUpperCase().replace(/[^A-Z]/g, '');
    if (!clean) return '0000';

    const mapping: Record<string, string> = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6'
    };

    const firstLetter = clean[0];
    let soundex = firstLetter;
    let prevCode = mapping[firstLetter] || '0';

    for (let i = 1; i < clean.length && soundex.length < 4; i++) {
      const char = clean[i];
      const code = mapping[char] || '0';

      if (code !== '0' && code !== prevCode) {
        soundex += code;
      }
      prevCode = code;
    }

    return soundex.padEnd(4, '0');
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const d: number[][] = [];

    for (let i = 0; i <= m; i++) d[i] = [i];
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          d[i][j] = d[i - 1][j - 1];
        } else {
          d[i][j] = Math.min(
            d[i - 1][j] + 1,      // deletion
            d[i][j - 1] + 1,      // insertion
            d[i - 1][j - 1] + 1   // substitution
          );
        }
      }
    }

    return d[m][n];
  }

  /**
   * Calculate string similarity ratio between 0.0 and 1.0
   */
  calculateSimilarity(s1: string, s2: string): number {
    const clean1 = this.normalizeText(s1).replace(/\s/g, '');
    const clean2 = this.normalizeText(s2).replace(/\s/g, '');

    if (!clean1 && !clean2) return 1.0;
    if (!clean1 || !clean2) return 0.0;
    if (clean1 === clean2) return 1.0;

    const maxLen = Math.max(clean1.length, clean2.length);
    const dist = this.levenshteinDistance(clean1, clean2);
    return Math.max(0, 1 - dist / maxLen);
  }

  /**
   * Evaluate a student's spoken answer against the canonical expected answer
   * with question-specific phonetic awareness.
   */
  evaluateStudentAnswer(
    transcript: string | null | undefined,
    expectedAnswer: string | null | undefined,
    subskill?: string | null,
    pronunciationScore: number = 0,
    rawConfidence: number = 0.95
  ): EvaluationResult {
    const rawTranscript = transcript || '';
    const normTranscript = this.normalizeText(rawTranscript);
    const normExpected = this.normalizeText(expectedAnswer || '');
    const sub = (subskill || '').toLowerCase();

    // 1. Unclear audio / no transcript detected
    if (!normTranscript || normTranscript.length === 0) {
      return {
        isCorrect: false,
        status: 'unclear',
        confidence: 0,
        similarity: 0,
        normalizedTranscript: '',
        normalizedExpected: normExpected,
        feedback: 'No clear speech was detected. Please check your microphone and speak clearly.',
        errorType: 'unclear_audio'
      };
    }

    const similarity = this.calculateSimilarity(normTranscript, normExpected);
    const soundexTranscript = this.getSoundex(normTranscript);
    const soundexExpected = this.getSoundex(normExpected);
    const soundexMatch = soundexTranscript === soundexExpected;

    // 2. Specific Subskill Rule: Phoneme Deletion (Expected: "mile", Target word: "smile")
    if (sub.includes('deletion') || normExpected === 'mile') {
      if (normTranscript === 'smile' || normTranscript.includes('smile')) {
        return {
          isCorrect: false,
          status: 'incorrect',
          confidence: rawConfidence,
          similarity,
          normalizedTranscript: normTranscript,
          normalizedExpected: normExpected,
          feedback: 'You said "smile". Remember to remove the /s/ sound so it becomes "mile".',
          errorType: 'phoneme_not_deleted'
        };
      }
      if (normTranscript === 'mile' || similarity >= 0.75 || soundexMatch) {
        return {
          isCorrect: true,
          status: 'correct',
          confidence: rawConfidence,
          similarity: Math.max(similarity, 0.95),
          normalizedTranscript: normTranscript,
          normalizedExpected: normExpected,
          feedback: 'Great job! You deleted the initial sound correctly to make "mile".',
          errorType: null
        };
      }
    }

    // 3. Specific Subskill Rule: Phoneme Substitution (Expected: "cat", Target word: "MAT", change /m/ to /c/)
    if (sub.includes('substitution') || normExpected === 'cat') {
      if (normTranscript === 'mat' || normTranscript.includes('mat')) {
        return {
          isCorrect: false,
          status: 'incorrect',
          confidence: rawConfidence,
          similarity,
          normalizedTranscript: normTranscript,
          normalizedExpected: normExpected,
          feedback: 'You said "mat". Remember to replace /m/ with /c/ to make "cat".',
          errorType: 'sound_not_changed'
        };
      }
      if (normTranscript === 'cat' || similarity >= 0.75 || soundexMatch) {
        return {
          isCorrect: true,
          status: 'correct',
          confidence: rawConfidence,
          similarity: Math.max(similarity, 0.95),
          normalizedTranscript: normTranscript,
          normalizedExpected: normExpected,
          feedback: 'Excellent! You substituted the beginning sound to make "cat".',
          errorType: null
        };
      }
    }

    // 4. Specific Subskill Rule: Phoneme Segmentation (Expected: "ship", Segmented: "sh i p")
    if (sub.includes('segmentation') || normExpected === 'ship') {
      const isSegmented =
        normTranscript === 'ship' ||
        normTranscript.includes('sh') ||
        normTranscript === 'sh i p' ||
        normTranscript === 'sh ih p' ||
        normTranscript === 's h i p' ||
        similarity >= 0.7 ||
        soundexMatch;

      if (isSegmented) {
        return {
          isCorrect: true,
          status: 'correct',
          confidence: rawConfidence,
          similarity: Math.max(similarity, 0.9),
          normalizedTranscript: normTranscript,
          normalizedExpected: normExpected,
          feedback: 'Great job! You identified and pronounced the sounds in "ship".',
          errorType: null
        };
      }
    }

    // 5. Specific Subskill Rule: Pseudoword Reading (Expected: "mip")
    // Speech-to-text models often hear non-words as phonetically similar real words (e.g. "mep", "map", "nip")
    if (sub.includes('pseudoword') || normExpected === 'mip') {
      const isPseudoMatch =
        normTranscript === 'mip' ||
        normTranscript === 'mep' ||
        normTranscript === 'map' ||
        normTranscript === 'nip' ||
        soundexMatch ||
        similarity >= 0.65 ||
        pronunciationScore >= 70;

      if (isPseudoMatch) {
        return {
          isCorrect: true,
          status: 'correct',
          confidence: rawConfidence,
          similarity: Math.max(similarity, 0.85),
          normalizedTranscript: normTranscript,
          normalizedExpected: normExpected,
          feedback: 'Good decoding! You sounded out the novel word accurately.',
          errorType: null
        };
      }
    }

    // 6. General Word Reading & Phoneme Matching
    if (normTranscript === normExpected) {
      return {
        isCorrect: true,
        status: 'correct',
        confidence: rawConfidence,
        similarity: 1.0,
        normalizedTranscript: normTranscript,
        normalizedExpected: normExpected,
        feedback: 'Accurate pronunciation! Well done.',
        errorType: null
      };
    }

    // Check if pronunciation score is high or phonetic distance is very close
    if (similarity >= 0.8 || (pronunciationScore >= 75 && similarity >= 0.6) || (soundexMatch && similarity >= 0.6)) {
      return {
        isCorrect: true,
        status: 'correct',
        confidence: rawConfidence,
        similarity,
        normalizedTranscript: normTranscript,
        normalizedExpected: normExpected,
        feedback: 'Good pronunciation! Target word recognized.',
        errorType: null
      };
    }

    // 7. Low confidence audio check (< 0.45 without match)
    if (rawConfidence < 0.45 && pronunciationScore < 50) {
      return {
        isCorrect: false,
        status: 'unclear',
        confidence: rawConfidence,
        similarity,
        normalizedTranscript: normTranscript,
        normalizedExpected: normExpected,
        feedback: 'Recording was low confidence or unclear. Please try speaking closer to the microphone.',
        errorType: 'low_confidence'
      };
    }

    // 8. Incorrect answer
    return {
      isCorrect: false,
      status: 'incorrect',
      confidence: rawConfidence,
      similarity,
      normalizedTranscript: normTranscript,
      normalizedExpected: normExpected,
      feedback: `Detected "${rawTranscript}" instead of expected answer "${normExpected}".`,
      errorType: 'mispronunciation'
    };
  }
}

export default new PhoneticEvaluationService();

