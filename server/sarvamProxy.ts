// ──────────────────────────────────────────────
// Backend Secure Proxy Plugin for Sarvam AI Speech-to-Text
// Keeps SARVAM_API_KEY exclusively on the server — NEVER exposed to the frontend
// ──────────────────────────────────────────────

import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

export function sarvamProxyPlugin(): Plugin {
  return {
    name: 'sarvam-stt-proxy',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];

        // ── Endpoint 1: Health & Config Status (GET /api/sarvam-status) ──
        if (url === '/api/sarvam-status' && req.method === 'GET') {
          const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
          const apiKey = (env.SARVAM_API_KEY || process.env.SARVAM_API_KEY || '').trim();
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              configured: apiKey.length > 0,
              provider: 'sarvam',
            })
          );
          return;
        }

        // ── Endpoint 2: Secure Speech-to-Text Proxy (POST /api/sarvam-stt) ──
        if (url === '/api/sarvam-stt' && req.method === 'POST') {
          const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
          const apiKey = (env.SARVAM_API_KEY || process.env.SARVAM_API_KEY || '').trim();

          if (!apiKey) {
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: 'SARVAM_KEY_NOT_CONFIGURED',
                message: 'Sarvam API key is not configured on the backend. Falling back to browser speech recognition.',
                fallback: true,
              })
            );
            return;
          }

          try {
            // Buffer the incoming audio stream from the client browser
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const audioBuffer = Buffer.concat(chunks);

            if (audioBuffer.length === 0) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: 'EMPTY_AUDIO',
                  message: 'No audio data received.',
                })
              );
              return;
            }

            const contentType = (req.headers['content-type'] as string) || 'audio/webm';
            const langCode = (req.headers['x-language-code'] as string) || 'ta-IN';
            const mode = (req.headers['x-stt-mode'] as string) || 'transcribe';

            // Build FormData for Sarvam AI REST API
            const formData = new FormData();
            const audioBlob = new Blob([audioBuffer], { type: contentType });
            const ext = contentType.includes('mp4') || contentType.includes('m4a')
              ? 'mp4'
              : contentType.includes('wav')
              ? 'wav'
              : 'webm';
            formData.append('file', audioBlob, `input_voice.${ext}`);
            formData.append('model', 'saaras:v4');
            formData.append('mode', mode);
            if (langCode && langCode !== 'unknown') {
              formData.append('language_code', langCode);
            }

            console.log(`[Sarvam STT Backend] Forwarding ${audioBuffer.length} bytes to Sarvam AI (model: saaras:v4, lang: ${langCode})...`);

            const sarvamRes = await fetch('https://api.sarvam.ai/speech-to-text', {
              method: 'POST',
              headers: {
                'api-subscription-key': apiKey,
              },
              body: formData,
            });

            const statusCode = sarvamRes.status;
            const resText = await sarvamRes.text();
            let resJson: any = null;
            try {
              resJson = JSON.parse(resText);
            } catch {
              resJson = { raw: resText };
            }

            console.log(`[Sarvam STT Backend] Sarvam API response status: ${statusCode}`, resJson);

            // Check for quota exhaustion / insufficient credits (402, 429, or quota-related error messages)
            const isQuotaExhausted =
              statusCode === 402 ||
              statusCode === 429 ||
              (statusCode === 403 &&
                (resText.toLowerCase().includes('quota') ||
                  resText.toLowerCase().includes('credit') ||
                  resText.toLowerCase().includes('limit') ||
                  resText.toLowerCase().includes('exceeded')));

            if (statusCode >= 200 && statusCode < 300 && resJson?.transcript !== undefined) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  transcript: resJson.transcript,
                  language_code: resJson.language_code || langCode,
                  request_id: resJson.request_id,
                  provider: 'sarvam',
                })
              );
              return;
            }

            let extractedMsg = '';
            if (typeof resJson?.message === 'string') {
              extractedMsg = resJson.message;
            } else if (resJson?.message && typeof resJson.message.message === 'string') {
              extractedMsg = resJson.message.message;
            } else if (typeof resJson?.error === 'string') {
              extractedMsg = resJson.error;
            } else if (resJson?.error && typeof resJson.error.message === 'string') {
              extractedMsg = resJson.error.message;
            } else if (typeof resJson?.detail === 'string') {
              extractedMsg = resJson.detail;
            } else if (Array.isArray(resJson?.detail)) {
              extractedMsg = resJson.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
            } else if (resJson && typeof resJson === 'object') {
              extractedMsg = resJson.error?.message || resJson.message?.message || JSON.stringify(resJson);
            } else {
              extractedMsg = `Sarvam STT returned status ${statusCode}. Switching to fallback.`;
            }

            if (typeof extractedMsg !== 'string' || !extractedMsg.trim()) {
              extractedMsg = `Sarvam STT returned status ${statusCode}. Switching to fallback.`;
            }

            // Quota or API error -> send fallback instructions to frontend
            res.statusCode = isQuotaExhausted ? 402 : 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: isQuotaExhausted ? 'SARVAM_QUOTA_EXHAUSTED' : 'SARVAM_ERROR',
                message: isQuotaExhausted
                  ? 'Sarvam AI free credits exhausted or quota exceeded. Switching to browser speech recognition fallback.'
                  : extractedMsg,
                quotaExhausted: isQuotaExhausted,
                fallback: true,
              })
            );
          } catch (err: any) {
            console.error('[Sarvam STT Backend] Exception during transcription:', err);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: 'SARVAM_NETWORK_ERROR',
                message: `Network error connecting to Sarvam AI: ${err?.message || 'Server timeout'}. Switching to fallback.`,
                fallback: true,
              })
            );
          }
          return;
        }

        next();
      });
    },
  };
}
