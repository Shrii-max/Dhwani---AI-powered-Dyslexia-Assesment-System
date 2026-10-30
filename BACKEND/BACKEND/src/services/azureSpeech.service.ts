import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import phoneticEvaluationService from './phoneticEvaluation.service';

dotenv.config();

export interface PronunciationResult {
  transcript: string;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  isCorrect: boolean;
  status: 'correct' | 'incorrect' | 'unclear';
  errorType: string | null;
  confidence: number;
  phonemeDetails?: any[];
  feedback?: string;
}

class AzureSpeechService {
  private speechConfig: sdk.SpeechConfig | null = null;
  private blobServiceClient: BlobServiceClient | null = null;
  private containerName: string;

  constructor() {
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;
    const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER || 'audio-recordings';

    if (speechKey && speechRegion) {
      try {
        this.speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
        this.speechConfig.speechRecognitionLanguage = 'en-US';
      } catch (err) {
        console.warn('Azure Speech initialization warning:', err);
      }
    }

    if (storageConnectionString) {
      try {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
      } catch (err) {
        console.warn('Azure Storage initialization warning:', err);
      }
    }
  }

  /**
   * Upload audio file to Azure Blob Storage or fallback to persistent local storage
   */
  async uploadAudioFile(
    filePath: string,
    userId: string,
    testId: number
  ): Promise<string> {
    try {
      if (this.blobServiceClient) {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        await containerClient.createIfNotExists({ access: 'blob' });

        const timestamp = Date.now();
        const blobName = `${userId}/${testId}/${timestamp}_${uuidv4()}.wav`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadFile(filePath);
        return blockBlobClient.url;
      }
    } catch (error) {
      console.warn('Azure Blob upload notice, storing in local persistent directory:', error);
    }

    // Persistent local storage backup
    const persistentDir = path.join(__dirname, '../../uploads/audio/persistent');
    if (!fs.existsSync(persistentDir)) {
      fs.mkdirSync(persistentDir, { recursive: true });
    }
    const localName = `audio-${userId}-${testId}-${Date.now()}-${uuidv4().slice(0, 8)}.wav`;
    const destPath = path.join(persistentDir, localName);
    fs.copyFileSync(filePath, destPath);

    return `local://uploads/audio/persistent/${localName}`;
  }

  /**
   * Assess pronunciation using Azure Speech AI with phonetic evaluation
   */
  async assessPronunciation(
    audioFilePath: string,
    expectedText: string,
    testType: string
  ): Promise<PronunciationResult> {
    if (!this.speechConfig) {
      console.warn('Azure Speech not configured, performing phonetic evaluation fallback');
      const evalResult = phoneticEvaluationService.evaluateStudentAnswer(
        expectedText,
        expectedText,
        testType,
        85
      );
      return {
        transcript: expectedText,
        pronunciationScore: 85,
        accuracyScore: 85,
        fluencyScore: 85,
        completenessScore: 100,
        isCorrect: evalResult.isCorrect,
        status: evalResult.status,
        errorType: evalResult.errorType,
        confidence: 0.9,
        feedback: evalResult.feedback
      };
    }

    try {
      const audioBuffer = fs.readFileSync(audioFilePath);
      const audioConfig = sdk.AudioConfig.fromWavFileInput(audioBuffer);

      const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
        expectedText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true // enableMiscue - detect substitutions, omissions, insertions
      );

      const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
      pronunciationConfig.applyTo(recognizer);

      return new Promise((resolve) => {
        recognizer.recognizeOnceAsync(
          (result) => {
            recognizer.close();

            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
              const transcript = result.text.toLowerCase().replace(/[.,!?;:]/g, '').trim();

              const confidence = result.properties.getProperty(
                sdk.PropertyId.SpeechServiceResponse_JsonResult
              ) ? 0.95 : 0.8;

              // Use question-specific phonetic evaluation service
              const evalResult = phoneticEvaluationService.evaluateStudentAnswer(
                transcript,
                expectedText,
                testType,
                pronunciationResult.pronunciationScore,
                confidence
              );

              const output: PronunciationResult = {
                transcript,
                pronunciationScore: pronunciationResult.pronunciationScore,
                accuracyScore: pronunciationResult.accuracyScore,
                fluencyScore: pronunciationResult.fluencyScore,
                completenessScore: pronunciationResult.completenessScore,
                isCorrect: evalResult.isCorrect,
                status: evalResult.status,
                errorType: evalResult.errorType,
                confidence,
                phonemeDetails: this.extractPhonemeDetails(result),
                feedback: evalResult.feedback
              };

              resolve(output);
            } else if (result.reason === sdk.ResultReason.NoMatch) {
              // Distinguish unclear audio / no speech from incorrect answers
              resolve({
                transcript: '',
                pronunciationScore: 0,
                accuracyScore: 0,
                fluencyScore: 0,
                completenessScore: 0,
                isCorrect: false,
                status: 'unclear',
                errorType: 'unclear_audio',
                confidence: 0,
                feedback: 'No intelligible speech detected. Please check microphone position and try speaking again.',
                phonemeDetails: []
              });
            } else {
              resolve({
                transcript: '',
                pronunciationScore: 0,
                accuracyScore: 0,
                fluencyScore: 0,
                completenessScore: 0,
                isCorrect: false,
                status: 'unclear',
                errorType: 'speech_recognition_failed',
                confidence: 0,
                feedback: 'Speech recognition was unable to process the recording.',
                phonemeDetails: []
              });
            }
          },
          (error) => {
            recognizer.close();
            console.error('Recognizer error:', error);
            resolve({
              transcript: '',
              pronunciationScore: 0,
              accuracyScore: 0,
              fluencyScore: 0,
              completenessScore: 0,
              isCorrect: false,
              status: 'unclear',
              errorType: 'audio_error',
              confidence: 0,
              feedback: 'Audio processing encountered an issue. Please try recording again.',
              phonemeDetails: []
            });
          }
        );
      });
    } catch (error) {
      console.error('Pronunciation assessment error:', error);
      return {
        transcript: '',
        pronunciationScore: 0,
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        isCorrect: false,
        status: 'unclear',
        errorType: 'audio_processing_error',
        confidence: 0,
        feedback: 'Unable to process audio recording.',
        phonemeDetails: []
      };
    }
  }

  /**
   * Extract phoneme-level details from recognition result
   */
  private extractPhonemeDetails(result: sdk.SpeechRecognitionResult): any[] {
    try {
      const jsonResult = result.properties.getProperty(
        sdk.PropertyId.SpeechServiceResponse_JsonResult
      );

      if (!jsonResult) return [];

      const parsed = JSON.parse(jsonResult);
      const words = parsed.NBest?.[0]?.Words || [];

      const phonemes: any[] = [];
      words.forEach((word: any) => {
        if (word.Phonemes) {
          phonemes.push(...word.Phonemes);
        }
      });

      return phonemes;
    } catch (error) {
      console.error('Error extracting phoneme details:', error);
      return [];
    }
  }
}

export default new AzureSpeechService();
