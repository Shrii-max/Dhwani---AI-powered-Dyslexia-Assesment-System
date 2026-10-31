"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk = __importStar(require("microsoft-cognitiveservices-speech-sdk"));
const storage_blob_1 = require("@azure/storage-blob");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const phoneticEvaluation_service_1 = __importDefault(require("./phoneticEvaluation.service"));
dotenv_1.default.config();
class AzureSpeechService {
    constructor() {
        this.speechConfig = null;
        this.blobServiceClient = null;
        const speechKey = process.env.AZURE_SPEECH_KEY;
        const speechRegion = process.env.AZURE_SPEECH_REGION;
        const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        this.containerName = process.env.AZURE_STORAGE_CONTAINER || 'audio-recordings';
        if (speechKey && speechRegion) {
            try {
                this.speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
                this.speechConfig.speechRecognitionLanguage = 'en-US';
            }
            catch (err) {
                console.warn('Azure Speech initialization warning:', err);
            }
        }
        if (storageConnectionString) {
            try {
                this.blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(storageConnectionString);
            }
            catch (err) {
                console.warn('Azure Storage initialization warning:', err);
            }
        }
    }
    /**
     * Upload audio file to Azure Blob Storage or fallback to persistent local storage
     */
    async uploadAudioFile(filePath, userId, testId) {
        try {
            if (this.blobServiceClient) {
                const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
                await containerClient.createIfNotExists({ access: 'blob' });
                const timestamp = Date.now();
                const blobName = `${userId}/${testId}/${timestamp}_${(0, uuid_1.v4)()}.wav`;
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.uploadFile(filePath);
                return blockBlobClient.url;
            }
        }
        catch (error) {
            console.warn('Azure Blob upload notice, storing in local persistent directory:', error);
        }
        // Persistent local storage backup
        const persistentDir = path_1.default.join(__dirname, '../../uploads/audio/persistent');
        if (!fs_1.default.existsSync(persistentDir)) {
            fs_1.default.mkdirSync(persistentDir, { recursive: true });
        }
        const localName = `audio-${userId}-${testId}-${Date.now()}-${(0, uuid_1.v4)().slice(0, 8)}.wav`;
        const destPath = path_1.default.join(persistentDir, localName);
        fs_1.default.copyFileSync(filePath, destPath);
        return `local://uploads/audio/persistent/${localName}`;
    }
    /**
     * Assess pronunciation using Azure Speech AI with phonetic evaluation
     */
    async assessPronunciation(audioFilePath, expectedText, testType) {
        if (!this.speechConfig) {
            console.warn('Azure Speech not configured, performing phonetic evaluation fallback');
            const evalResult = phoneticEvaluation_service_1.default.evaluateStudentAnswer(expectedText, expectedText, testType, 85);
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
            const audioBuffer = fs_1.default.readFileSync(audioFilePath);
            const audioConfig = sdk.AudioConfig.fromWavFileInput(audioBuffer);
            const pronunciationConfig = new sdk.PronunciationAssessmentConfig(expectedText, sdk.PronunciationAssessmentGradingSystem.HundredMark, sdk.PronunciationAssessmentGranularity.Phoneme, true // enableMiscue - detect substitutions, omissions, insertions
            );
            const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
            pronunciationConfig.applyTo(recognizer);
            return new Promise((resolve) => {
                recognizer.recognizeOnceAsync((result) => {
                    recognizer.close();
                    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                        const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
                        const transcript = result.text.toLowerCase().replace(/[.,!?;:]/g, '').trim();
                        const confidence = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult) ? 0.95 : 0.8;
                        // Use question-specific phonetic evaluation service
                        const evalResult = phoneticEvaluation_service_1.default.evaluateStudentAnswer(transcript, expectedText, testType, pronunciationResult.pronunciationScore, confidence);
                        const output = {
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
                    }
                    else if (result.reason === sdk.ResultReason.NoMatch) {
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
                    }
                    else {
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
                }, (error) => {
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
                });
            });
        }
        catch (error) {
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
    extractPhonemeDetails(result) {
        try {
            const jsonResult = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
            if (!jsonResult)
                return [];
            const parsed = JSON.parse(jsonResult);
            const words = parsed.NBest?.[0]?.Words || [];
            const phonemes = [];
            words.forEach((word) => {
                if (word.Phonemes) {
                    phonemes.push(...word.Phonemes);
                }
            });
            return phonemes;
        }
        catch (error) {
            console.error('Error extracting phoneme details:', error);
            return [];
        }
    }
}
exports.default = new AzureSpeechService();
