// ──────────────────────────────────────────────
// Client-side Service for Sarvam AI Speech-to-Text
// Communicates with backend proxy (/api/sarvam-stt) with automatic browser fallback
// ──────────────────────────────────────────────

const QUOTA_STORAGE_KEY = 'sit_sarvam_quota_exhausted';

export interface SarvamTranscribeResult {
  success: boolean;
  transcript?: string;
  languageCode?: string;
  provider: 'sarvam' | 'browser';
  fallback?: boolean;
  quotaExhausted?: boolean;
  error?: string;
}

export interface SarvamStatusResponse {
  configured: boolean;
  provider: string;
}

/**
 * Checks whether Sarvam quota is marked as exhausted for this session.
 */
export function isSarvamQuotaExhaustedSession(): boolean {
  try {
    return sessionStorage.getItem(QUOTA_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks Sarvam quota as exhausted for the current browser session.
 */
export function markSarvamQuotaExhaustedSession(): void {
  try {
    sessionStorage.setItem(QUOTA_STORAGE_KEY, 'true');
  } catch {
    // ignore storage restrictions
  }
}

/**
 * Clears the session quota flag so the user can re-try Sarvam.
 */
export function clearSarvamQuotaSession(): void {
  try {
    sessionStorage.removeItem(QUOTA_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Checks backend Sarvam configuration status without exposing any secrets.
 */
export async function checkSarvamBackendStatus(): Promise<{ configured: boolean }> {
  try {
    const res = await fetch('/api/sarvam-status');
    if (!res.ok) return { configured: false };
    const data: SarvamStatusResponse = await res.json();
    return { configured: Boolean(data.configured) };
  } catch {
    return { configured: false };
  }
}

/**
 * Helper to safely extract a readable string error message from arbitrary API response data.
 */
function extractErrorMessage(data: any, defaultMsg: string): string {
  if (!data) return defaultMsg;
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string') return data.message;
  if (data.message && typeof data.message.message === 'string') return data.message.message;
  if (typeof data.error === 'string') return data.error;
  if (data.error && typeof data.error.message === 'string') return data.error.message;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((d: any) => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
  }
  try {
    return JSON.stringify(data.message || data.error || data);
  } catch {
    return defaultMsg;
  }
}

/**
 * Sends recorded audio blob to the backend Sarvam proxy.
 */
export async function transcribeAudioWithSarvam(
  audioBlob: Blob,
  options?: {
    languageCode?: 'ta-IN' | 'en-IN';
    mode?: 'transcribe' | 'translate' | 'codemix';
  }
): Promise<SarvamTranscribeResult> {
  // If quota was already marked as exhausted in this session, return fallback immediately
  if (isSarvamQuotaExhaustedSession()) {
    return {
      success: false,
      provider: 'browser',
      fallback: true,
      quotaExhausted: true,
      error: 'Sarvam AI quota exhausted for this session. Using browser fallback.',
    };
  }

  // Audio size sanity check
  if (!audioBlob || audioBlob.size < 400) {
    return {
      success: false,
      provider: 'browser',
      fallback: true,
      error: 'Audio was too short or empty. Please speak your command again.',
    };
  }

  const langCode = options?.languageCode || 'ta-IN';
  const mode = options?.mode || 'transcribe';

  try {
    const response = await fetch('/api/sarvam-stt', {
      method: 'POST',
      headers: {
        'content-type': audioBlob.type || 'audio/wav',
        'x-language-code': langCode,
        'x-stt-mode': mode,
      },
      body: audioBlob,
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = { message: `Server returned non-JSON response (status ${response.status}).` };
    }

    if (response.ok && data?.success && typeof data.transcript === 'string') {
      return {
        success: true,
        transcript: data.transcript,
        languageCode: data.language_code || langCode,
        provider: 'sarvam',
      };
    }

    // Check for quota exhaustion
    const quotaExhausted = Boolean(data?.quotaExhausted) || response.status === 402 || response.status === 429;
    if (quotaExhausted) {
      markSarvamQuotaExhaustedSession();
    }

    const safeError = extractErrorMessage(data, 'Sarvam STT failed. Using browser speech recognition.');

    return {
      success: false,
      provider: 'browser',
      fallback: true,
      quotaExhausted,
      error: safeError,
    };
  } catch (err: any) {
    console.warn('[SarvamSTT Client] Network or fetch error:', err);
    return {
      success: false,
      provider: 'browser',
      fallback: true,
      error: `Network error connecting to Sarvam STT service: ${err?.message || 'Server unreachable'}. Using browser fallback.`,
    };
  }
}

/**
 * Creates an audio recorder using AudioContext (16kHz WAV) with automatic MediaRecorder fallback.
 */
export interface AudioRecorderController {
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
  isRecording: () => boolean;
}

/**
 * Encodes Float32 PCM audio samples into a standard 16-bit 16kHz mono WAV file buffer.
 */
function encodeWavBuffer(samples: Float32Array, sampleRate = 16000): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(v: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, 1, true); // num channels (1 = mono)
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * 1 * 2)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Convert float -1.0..+1.0 into 16-bit signed PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

export function createAudioRecorder(): AudioRecorderController {
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let processorNode: ScriptProcessorNode | null = null;
  let recordedSamples: Float32Array[] = [];

  // Fallback MediaRecorder fields
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];

  let recording = false;
  let useAudioContext = true;

  const cleanupTracks = () => {
    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStream = null;
    }
  };

  return {
    async start() {
      recording = false;
      recordedSamples = [];
      audioChunks = [];

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          useAudioContext = true;
          audioContext = new AudioCtx({ sampleRate: 16000 });
          sourceNode = audioContext.createMediaStreamSource(mediaStream);
          // 4096 buffer size, 1 input channel, 1 output channel
          processorNode = audioContext.createScriptProcessor(4096, 1, 1);

          processorNode.onaudioprocess = (e) => {
            if (!recording) return;
            const channelData = e.inputBuffer.getChannelData(0);
            recordedSamples.push(new Float32Array(channelData));
          };

          sourceNode.connect(processorNode);
          processorNode.connect(audioContext.destination);
          recording = true;
          return;
        } catch (ctxErr) {
          console.warn('[AudioRecorder] AudioContext setup failed, falling back to MediaRecorder:', ctxErr);
          useAudioContext = false;
        }
      } else {
        useAudioContext = false;
      }

      // MediaRecorder fallback
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      mediaRecorder.start(200);
      recording = true;
    },

    async stop(): Promise<Blob | null> {
      if (!recording) return null;
      recording = false;

      if (useAudioContext && audioContext) {
        if (processorNode) {
          processorNode.disconnect();
          processorNode.onaudioprocess = null;
          processorNode = null;
        }
        if (sourceNode) {
          sourceNode.disconnect();
          sourceNode = null;
        }
        cleanupTracks();
        try {
          await audioContext.close();
        } catch {}
        audioContext = null;

        let totalLength = 0;
        for (const chunk of recordedSamples) {
          totalLength += chunk.length;
        }
        if (totalLength < 1600) {
          // Less than 0.1 sec of audio
          return null;
        }

        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of recordedSamples) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        recordedSamples = [];

        const wav = encodeWavBuffer(merged, 16000);
        return new Blob([wav], { type: 'audio/wav' });
      }

      // Fallback MediaRecorder stop
      return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
          cleanupTracks();
          resolve(null);
          return;
        }

        mediaRecorder.onstop = () => {
          const mimeType = mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(audioChunks, { type: mimeType });
          cleanupTracks();
          mediaRecorder = null;
          audioChunks = [];
          resolve(blob.size > 200 ? blob : null);
        };

        try {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.requestData();
          }
          mediaRecorder.stop();
        } catch {
          cleanupTracks();
          resolve(null);
        }
      });
    },

    cancel() {
      recording = false;
      if (processorNode) {
        try {
          processorNode.disconnect();
          processorNode.onaudioprocess = null;
        } catch {}
        processorNode = null;
      }
      if (sourceNode) {
        try {
          sourceNode.disconnect();
        } catch {}
        sourceNode = null;
      }
      if (audioContext) {
        try {
          audioContext.close();
        } catch {}
        audioContext = null;
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch {}
      }
      mediaRecorder = null;
      cleanupTracks();
      recordedSamples = [];
      audioChunks = [];
    },

    isRecording() {
      return recording;
    },
  };
}
