/**
 * Audio Utilities for Speech Capture & WAV Encoding
 * Conforms to standard 16kHz 16-bit Mono PCM for Speech Recognition
 */

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const mono = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    mono[i] = (left[i] + right[i]) / 2;
  }
  return mono;
}

function resample(samples: Float32Array, oldRate: number, targetRate: number): Float32Array {
  if (oldRate === targetRate) return samples;
  const ratio = oldRate / targetRate;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const origIndex = i * ratio;
    const indexFloor = Math.floor(origIndex);
    const indexCeil = Math.min(samples.length - 1, Math.ceil(origIndex));
    const fraction = origIndex - indexFloor;
    result[i] = samples[indexFloor] * (1 - fraction) + samples[indexCeil] * fraction;
  }
  return result;
}

/**
 * Encodes an AudioBuffer into standard 16kHz 16-bit Mono PCM RIFF WAV format
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const targetRate = 16000;
  const numChannels = 1;
  const bitDepth = 16;
  const format = 1; // PCM

  const monoData = downmixToMono(buffer);
  const samples = resample(monoData, buffer.sampleRate, targetRate);

  const dataByteLength = samples.length * 2;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1 = Mono)
  view.setUint32(24, targetRate, true); // SampleRate (16000)
  view.setUint32(28, targetRate * numChannels * (bitDepth / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample (16)

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  // 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Convert any WebM/OGG MediaRecorder Blob to standard 16kHz PCM WAV
 */
export async function convertBlobToWav(audioBlob: Blob): Promise<Blob> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return audioBlob;

    const audioCtx = new AudioContextClass();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    const wavBlob = audioBufferToWav(decoded);
    await audioCtx.close();
    return wavBlob;
  } catch (err) {
    console.warn('WAV conversion fallback to original blob:', err);
    return audioBlob;
  }
}

