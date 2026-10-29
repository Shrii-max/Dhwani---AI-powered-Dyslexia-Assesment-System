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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class AzureSpeechService {
    constructor() {
        const speechKey = process.env.AZURE_SPEECH_KEY;
        const speechRegion = process.env.AZURE_SPEECH_REGION;
        const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const containerName = process.env.AZURE_STORAGE_CONTAINER || 'audio-recordings';
        if (!speechKey || !speechRegion) {
            throw new Error('Azure Speech credentials not configured');
        }
        if (!storageConnectionString) {
            throw new Error('Azure Storage connection string not configured');
        }
        this.speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
        this.speechConfig.speechRecognitionLanguage = 'en-US';
        this.blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(storageConnectionString);
        this.containerName = containerName;
    }
    /**
     * Upload audio file to Azure Blob Storage
     */
    async uploadAudioFile(filePath, userId, testId) {
        try {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            // Create container if it doesn't exist
            await containerClient.createIfNotExists({
                access: 'blob'
            });
            // Generate unique blob name
            const timestamp = Date.now();
            const blobName = `${userId}/${testId}/${timestamp}_${(0, uuid_1.v4)()}.wav`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            // Upload file
            await blockBlobClient.uploadFile(filePath);
            // Return public URL
            return blockBlobClient.url;
        }
        catch (error) {
            console.error('Error uploading to Azure Blob:', error);
            throw new Error('Failed to upload audio file');
        }
    }
    /**
     * Assess pronunciation using Azure Speech AI
     */
    async assessPronunciation(audioFilePath, expectedText, testType) {
        try {
            const audioConfig = sdk.AudioConfig.fromWavFileInput(fs_1.default.readFileSync(audioFilePath));
            const pronunciationConfig = new sdk.PronunciationAssessmentConfig(expectedText, sdk.PronunciationAssessmentGradingSystem.HundredMark, sdk.PronunciationAssessmentGranularity.Phoneme, true // enableMiscue - detect substitutions, omissions, insertions
            );
            const recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);
            pronunciationConfig.applyTo(recognizer);
            return new Promise((resolve, reject) => {
                recognizer.recognizeOnceAsync((result) => {
                    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                        const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
                        const transcript = result.text.toLowerCase().trim();
                        const expectedLower = expectedText.toLowerCase().trim();
                        // Determine if answer is correct
                        const isCorrect = this.evaluateCorrectness(transcript, expectedLower, pronunciationResult.pronunciationScore, testType);
                        // Detect error types
                        const errorType = this.detectErrorType(transcript, expectedLower, pronunciationResult);
                        const output = {
                            transcript,
                            pronunciationScore: pronunciationResult.pronunciationScore,
                            accuracyScore: pronunciationResult.accuracyScore,
                            fluencyScore: pronunciationResult.fluencyScore,
                            completenessScore: pronunciationResult.completenessScore,
                            isCorrect,
                            errorType,
                            confidence: result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult) ? 0.95 : 0.8,
                            phonemeDetails: this.extractPhonemeDetails(result)
                        };
                        recognizer.close();
                        resolve(output);
                    }
                    else if (result.reason === sdk.ResultReason.NoMatch) {
                        recognizer.close();
                        reject(new Error('No speech recognized. Please try again.'));
                    }
                    else {
                        recognizer.close();
                        reject(new Error('Speech recognition failed'));
                    }
                }, (error) => {
                    recognizer.close();
                    reject(error);
                });
            });
        }
        catch (error) {
            console.error('Pronunciation assessment error:', error);
            throw new Error('Failed to assess pronunciation');
        }
    }
    /**
     * Evaluate if the response is correct based on test type
     */
    evaluateCorrectness(transcript, expected, pronunciationScore, testType) {
        // For reading tasks, check pronunciation score threshold
        if (testType === 'READING') {
            return pronunciationScore >= 75 && this.isSimilar(transcript, expected);
        }
        // For phoneme tasks, require exact or very close match
        if (testType === 'RECORD') {
            return pronunciationScore >= 80 && this.isSimilar(transcript, expected);
        }
        // For RAN, just check if speech was recognized
        if (testType === 'RAN') {
            return pronunciationScore >= 70;
        }
        return this.isSimilar(transcript, expected);
    }
    /**
     * Check if two strings are similar (accounting for minor variations)
     */
    isSimilar(str1, str2) {
        const clean1 = str1.replace(/[^\w]/g, '').toLowerCase();
        const clean2 = str2.replace(/[^\w]/g, '').toLowerCase();
        if (clean1 === clean2)
            return true;
        // Levenshtein distance for minor spelling variations
        const distance = this.levenshteinDistance(clean1, clean2);
        const maxLength = Math.max(clean1.length, clean2.length);
        const similarity = 1 - distance / maxLength;
        return similarity >= 0.85; // 85% similarity threshold
    }
    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    /**
     * Detect type of pronunciation error
     */
    detectErrorType(transcript, expected, pronunciationResult) {
        if (transcript === expected)
            return null;
        const transcriptWords = transcript.split(' ');
        const expectedWords = expected.split(' ');
        // Omission: missing sounds/words
        if (transcriptWords.length < expectedWords.length) {
            return 'omission';
        }
        // Insertion: extra sounds/words
        if (transcriptWords.length > expectedWords.length) {
            return 'insertion';
        }
        // Substitution: replaced sounds
        if (transcript.length === expected.length) {
            return 'substitution';
        }
        // Reversal: sounds in wrong order (common in dyslexia)
        if (this.hasReversal(transcript, expected)) {
            return 'reversal';
        }
        return 'mispronunciation';
    }
    /**
     * Check if transcript has character reversals
     */
    hasReversal(str1, str2) {
        // Simple check for adjacent character swaps
        for (let i = 0; i < str1.length - 1; i++) {
            if (str1[i] === str2[i + 1] &&
                str1[i + 1] === str2[i]) {
                return true;
            }
        }
        return false;
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
