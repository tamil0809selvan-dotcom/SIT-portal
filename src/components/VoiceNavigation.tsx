// ──────────────────────────────────────────────
// Voice Assistant Component: Navigation & Faculty Voice Data Entry
// Supports English and Tanglish with Robust Matching & Confirmation
// ──────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Volume2,
  AlertCircle,
  CheckCircle2,
  Globe,
  ArrowRight,
  Edit3,
  Save,
  RefreshCw,
  User,
  Users,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { resolveVoiceIntent, isDataEntryCommand } from '../utils/voiceCommands.ts';
import { parseVoiceEntry, ParsedVoiceEntry } from '../utils/voiceEntryParser.ts';
import { SUBJECTS, SubjectName, StudentRecord } from '../types';
import {
  createAudioRecorder,
  transcribeAudioWithSarvam,
  checkSarvamBackendStatus,
  isSarvamQuotaExhaustedSession,
  clearSarvamQuotaSession,
  AudioRecorderController,
} from '../services/sarvamSTT';

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const VoiceNavigation: React.FC = () => {
  const { role, logout } = useAuth();
  const {
    records,
    updateAttendance,
    updateInternal1,
    updateInternal2,
    saveAttendance,
    saveInternal1,
    saveInternal2,
    saveDirectMark,
    saveDirectAttendance,
    refreshData,
  } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  // Modal and Recognition State
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [manualTranscriptInput, setManualTranscriptInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'idle' | 'listening' | 'success' | 'error' | 'confirming' | 'ambiguous'>('idle');
  const [language, setLanguage] = useState<'en-IN' | 'ta-IN'>('en-IN');
  const [isSupported, setIsSupported] = useState(true);
  const [isSavingData, setIsSavingData] = useState(false);

  // ── Sarvam AI Integration & Fallback State ──
  const [activeProvider, setActiveProvider] = useState<'sarvam' | 'browser'>('browser');
  const [isSarvamConfigured, setIsSarvamConfigured] = useState(false);
  const [sarvamQuotaExhausted, setSarvamQuotaExhausted] = useState(false);
  const audioRecorderRef = useRef<AudioRecorderController | null>(null);

  // Faculty Data Entry Confirmation & Ambiguity State
  const [pendingEntry, setPendingEntry] = useState<ParsedVoiceEntry | null>(null);
  const pendingEntryRef = useRef<ParsedVoiceEntry | null>(null);
  useEffect(() => {
    pendingEntryRef.current = pendingEntry;
  }, [pendingEntry]);

  const recognitionRef = useRef<any>(null);
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check Web Speech API support & Sarvam Backend Status on mount
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    audioRecorderRef.current = createAudioRecorder();

    checkSarvamBackendStatus().then(({ configured }) => {
      setIsSarvamConfigured(configured);
      const quotaExhausted = isSarvamQuotaExhaustedSession();
      setSarvamQuotaExhausted(quotaExhausted);
      if (configured && !quotaExhausted) {
        setActiveProvider('sarvam');
      } else {
        setActiveProvider('browser');
      }
    });
  }, []);

  // Keyboard shortcut: Press Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Closes the voice assistant modal:
   * - Stops speech recognition & releases active microphone session cleanly.
   * - Never resets attendance or marks data in DataContext.
   */
  const handleCloseModal = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsTranscribing(false);
    setIsOpen(false);
    setPendingEntry(null);
    setIsEditingTranscript(false);
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  }, []);

  const stopListeningRef = useRef<() => Promise<void> | void>(() => {});

  /**
   * Evaluates spoken or edited text:
   * 1. Separates navigation commands from data-entry commands.
   * 2. If navigation: navigates directly without opening data entry form or searching students.
   * 3. If data entry: parses fields, handles ambiguity, loads current values, and shows confirmation.
   */
  const processSpokenInput = useCallback(
    (spokenText: string) => {
      const cleanText = spokenText.trim();
      if (!cleanText) {
        setStatusType('error');
        setFeedback('No words were heard. Please speak or enter text.');
        return;
      }

      setTranscript(cleanText);
      const lower = cleanText.toLowerCase();

      // ── Spoken Cancellation, Close, or Stop ──
      if (
        lower === 'close' ||
        lower === 'close assistant' ||
        lower === 'exit' ||
        lower === 'cancel' ||
        lower === 'moodu' ||
        lower === 'cancel pannu'
      ) {
        handleCloseModal();
        return;
      }

      if (lower === 'stop' || lower === 'stop listening') {
        stopListeningRef.current();
        setFeedback('Listening stopped. Tap microphone or select an action.');
        return;
      }

      // ── Spoken Confirmation / Discard if in Confirmation State ──
      if (pendingEntryRef.current) {
        if (lower === 'clear' || lower === 'reset' || lower === 'discard') {
          setPendingEntry(null);
          setStatusType('idle');
          setFeedback('Cleared pending entry.');
          return;
        }

        if (
          lower === 'confirm' ||
          lower === 'save' ||
          lower === 'save pannu' ||
          lower === 'confirm pannu' ||
          lower === 'yes' ||
          lower === 'proceed' ||
          lower === 'ok'
        ) {
          if (pendingEntryRef.current.isValid) {
            handleConfirmSaveData();
            return;
          } else {
            setFeedback('Cannot save yet: some fields are still missing. Please complete the fields.');
            return;
          }
        }
      }

      // Context from current URL
      const path = location.pathname;
      const isInternal1Page = path.includes('/internal1');
      const isInternal2Page = path.includes('/internal2');
      const isAttendancePage = path.includes('/attendance');

      // Check whether this is a Data Entry Command vs a pure Navigation Command
      const isEntry = isDataEntryCommand(cleanText);

      // ── Scenario A: Navigation Command ──
      // If user asks to open a page, navigate ONLY. Do NOT search students or open data entry form.
      if (!isEntry) {
        const navResult = resolveVoiceIntent(cleanText, role);

        if (navResult.matched) {
          setStatusType('success');
          setFeedback(navResult.confidenceMessage || `Navigating to ${navResult.label}…`);

          autoCloseTimeoutRef.current = setTimeout(() => {
            if (navResult.action === 'logout') {
              logout();
              navigate('/', { replace: true });
            } else if (navResult.path) {
              navigate(navResult.path);
            }
            handleCloseModal();
          }, 1000);
          return;
        }
      }

      // ── Scenario B: Faculty Data Entry Command ──
      if (role === 'faculty') {
        const parsed = parseVoiceEntry(cleanText, records, {
          currentPagePath: path,
          examNumber: isInternal2Page ? 2 : isInternal1Page ? 1 : undefined,
        });

        // Check if student match is ambiguous (e.g. user said "Kumar" matching 9 students)
        if (parsed.isStudentAmbiguous && parsed.candidateStudents.length > 1) {
          setPendingEntry(parsed);
          setStatusType('ambiguous');
          setFeedback(`Multiple students match "${parsed.ambiguousQuery || 'your query'}". Please select the correct student below:`);
          return;
        }

        // If a student was resolved or a value was specified
        if (parsed.student !== null || parsed.value !== null) {
          setPendingEntry(parsed);
          setStatusType('confirming');

          if (parsed.isValid) {
            setFeedback('Command parsed. Please review the current vs updated values below before confirming.');
          } else {
            const missing = parsed.missingFields.join(', ');
            setFeedback(`Some information is missing (${missing}). Please fill in the required fields below.`);
          }
          return;
        }

        // Fallback: If not recognized as data entry or navigation
        setStatusType('error');
        setFeedback(`Could not recognize command from "${cleanText}". Try saying "Open Internal Exam 1" or "Student Karthick Rajan, Data Structure, Internal Exam 2, 85 marks".`);
      } else {
        // Students are strictly read-only
        if (isEntry) {
          setStatusType('error');
          setFeedback('Data entry is restricted to faculty only. Students cannot edit attendance or marks.');
          return;
        }

        setStatusType('error');
        setFeedback(`Command not recognized from "${cleanText}". Try saying "Open marks" or "Attendance page-ku po".`);
      }
    },
    [location.pathname, role, records, logout, navigate, handleCloseModal]
  );

  /**
   * Safely stops speech recognition and/or audio recording, cleans up event handlers.
   */
  const stopListening = useCallback(async () => {
    if (audioRecorderRef.current && audioRecorderRef.current.isRecording()) {
      setIsListening(false);
      setIsTranscribing(true);
      setStatusType('listening');
      setFeedback('Transcribing audio with Sarvam AI…');

      try {
        const audioBlob = await audioRecorderRef.current.stop();
        if (!audioBlob) {
          setIsTranscribing(false);
          setStatusType('idle');
          setFeedback('No speech was captured. Tap microphone to try again.');
          return;
        }

        const result = await transcribeAudioWithSarvam(audioBlob, {
          languageCode: language,
          mode: 'transcribe',
        });

        setIsTranscribing(false);

        if (result.success && result.transcript && result.transcript.trim()) {
          const cleanTranscript = result.transcript.trim();
          setTranscript(cleanTranscript);
          processSpokenInput(cleanTranscript);
        } else if (result.success && (!result.transcript || !result.transcript.trim())) {
          setStatusType('idle');
          setFeedback('No speech was detected. Tap microphone to try again.');
        } else if (result.fallback) {
          if (result.quotaExhausted) {
            setSarvamQuotaExhausted(true);
            setActiveProvider('browser');
            setStatusType('error');
            setFeedback('Sarvam AI free credits exhausted. Switched to browser fallback for this session. Please speak again.');
          } else {
            setActiveProvider('browser');
            setStatusType('error');
            const errStr = typeof result.error === 'string'
              ? result.error
              : (result.error as any)?.message || 'Sarvam unavailable. Switched to browser fallback. Please speak again.';
            setFeedback(errStr);
          }
        } else {
          setStatusType('error');
          setFeedback(typeof result.error === 'string' ? result.error : 'Could not transcribe speech. Please try speaking again.');
        }
      } catch (err: any) {
        console.error('[VoiceNavigation] Sarvam transcription error:', err);
        setIsTranscribing(false);
        setActiveProvider('browser');
        setStatusType('error');
        setFeedback('Error with Sarvam STT. Switched to browser fallback.');
      }
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsTranscribing(false);
  }, [language, processSpokenInput]);

  useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  /**
   * Starts speech recognition using Sarvam AI STT (primary) or Browser SpeechRecognition (fallback).
   */
  const startListening = useCallback(async () => {
    if (isListening || isTranscribing) {
      return;
    }

    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }

    // ── Primary Provider: Sarvam AI STT ──
    if (activeProvider === 'sarvam' && isSarvamConfigured && !sarvamQuotaExhausted) {
      try {
        if (!audioRecorderRef.current) {
          audioRecorderRef.current = createAudioRecorder();
        }

        // Clean up any legacy speech recognition if active
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
          recognitionRef.current = null;
        }

        await audioRecorderRef.current.start();
        setIsListening(true);
        setStatusType('listening');
        setTranscript('');
        setIsEditingTranscript(false);
        setPendingEntry(null);
        setFeedback('Listening via Sarvam AI… Speak your command now, then click "Done Speaking".');
        return;
      } catch (err: any) {
        console.warn('[VoiceNavigation] Failed to start Sarvam recorder:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setStatusType('error');
          setFeedback('Microphone permission was denied. Please allow microphone access in your browser settings.');
          setIsListening(false);
          return;
        }
        // If recording failure, automatically switch to browser fallback
        setActiveProvider('browser');
        setStatusType('error');
        setFeedback('Microphone recorder failed. Switched to browser speech recognition fallback.');
      }
    }

    // ── Fallback Provider: Browser SpeechRecognition ──
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatusType('error');
      setFeedback('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or enter commands manually.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusType('listening');
        setTranscript('');
        setIsEditingTranscript(false);
        setPendingEntry(null);
        setFeedback('Listening via Browser SpeechRecognition… Speak now in English or Tanglish');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          processSpokenInput(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceNavigation] SpeechRecognition error:', event.error);
        setIsListening(false);
        recognitionRef.current = null;

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setStatusType('error');
          setFeedback('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setStatusType('error');
          setFeedback('No speech was detected. Please click "Try Speaking Again" and speak into your microphone.');
        } else if (event.error === 'network') {
          setStatusType('error');
          setFeedback('Network error with speech recognition service. Please check your internet connection.');
        } else if (event.error === 'aborted') {
          setStatusType('idle');
          setFeedback('Listening stopped.');
        } else {
          setStatusType('error');
          setFeedback(`Recognition issue: ${event.error || 'unknown'}. Please click "Try Speaking Again".`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('[VoiceNavigation] Start error:', err);
      setIsListening(false);
      recognitionRef.current = null;
      setStatusType('error');
      setFeedback(err?.message || 'Failed to initialize microphone.');
    }
  }, [
    activeProvider,
    isSarvamConfigured,
    sarvamQuotaExhausted,
    language,
    isListening,
    isTranscribing,
    processSpokenInput,
  ]);

  const handleRetrySarvam = () => {
    clearSarvamQuotaSession();
    setSarvamQuotaExhausted(false);
    if (isSarvamConfigured) {
      setActiveProvider('sarvam');
      setFeedback('Sarvam AI session reset. Tap microphone to speak.');
    } else {
      setFeedback('Sarvam API key not configured on backend.');
    }
    setStatusType('idle');
  };

  const handleOpenModal = () => {
    stopListening();
    setIsOpen(true);
    setTranscript('');
    setIsEditingTranscript(false);
    setPendingEntry(null);
    setFeedback('Tap microphone to speak, or use sample commands below.');
    setStatusType('idle');

    // Re-verify quota session state
    const quotaExhausted = isSarvamQuotaExhaustedSession();
    setSarvamQuotaExhausted(quotaExhausted);
    if (isSarvamConfigured && !quotaExhausted) {
      setActiveProvider('sarvam');
    }

    setTimeout(() => {
      startListening();
    }, 150);
  };

  const handleApplyManualEdit = () => {
    setIsEditingTranscript(false);
    processSpokenInput(manualTranscriptInput);
  };

  /**
   * When user clicks on one of the ambiguous student candidates:
   * Sets that student, re-checks current saved database value, and updates confirmation step.
   */
  const handleSelectCandidateStudent = (stu: StudentRecord) => {
    if (!pendingEntry) return;

    let currentSaved: number | null = null;
    if (pendingEntry.entryType === 'attendance') {
      currentSaved = stu.attendance;
    } else if (pendingEntry.entryType === 'marks' && pendingEntry.subject && pendingEntry.examType) {
      currentSaved =
        pendingEntry.examType === 'internal1'
          ? stu.internal1?.[pendingEntry.subject] ?? null
          : stu.internal2?.[pendingEntry.subject] ?? null;
    }

    setPendingEntry({
      ...pendingEntry,
      student: stu,
      isStudentAmbiguous: false,
      candidateStudents: [stu],
      currentSavedValue: currentSaved,
      missingFields: pendingEntry.missingFields.filter((f) => f !== 'student'),
      isValid: pendingEntry.value !== null && (pendingEntry.entryType === 'attendance' || (!!pendingEntry.subject && !!pendingEntry.examType)),
    });
    setStatusType('confirming');
    setFeedback(`Selected ${stu.studentId} — ${stu.name}. Please review and confirm.`);
  };

  /**
   * Confirms and persists the voice-derived data entry to Supabase using direct DataContext functions.
   */
  const handleConfirmSaveData = async () => {
    const entry = pendingEntryRef.current || pendingEntry;
    if (!entry || !entry.student || entry.value === null) {
      return;
    }

    if (role !== 'faculty') {
      setStatusType('error');
      setFeedback('Unauthorized: Only faculty members can write attendance or marks.');
      return;
    }

    setIsSavingData(true);
    const stu = entry.student;
    const val = entry.value;

    try {
      if (entry.entryType === 'attendance') {
        const result = await saveDirectAttendance(stu.studentId, val);
        if (result.success) {
          setStatusType('success');
          setFeedback(`Successfully saved attendance (${val}%) for ${stu.name} (${stu.studentId}) in Supabase!`);
          autoCloseTimeoutRef.current = setTimeout(() => {
            handleCloseModal();
          }, 2000);
        } else {
          setStatusType('error');
          setFeedback(`Failed to save attendance: ${result.errors[0] || 'Database write error'}`);
        }
      } else if (entry.entryType === 'marks') {
        const subj = entry.subject;
        const exam = entry.examType;

        if (!subj || !exam) {
          setStatusType('error');
          setFeedback('Please specify both the Subject and Exam Type before saving.');
          setIsSavingData(false);
          return;
        }

        const examLabel = exam === 'internal1' ? 'Internal Exam 1' : 'Internal Exam 2';
        const result = await saveDirectMark(stu.studentId, exam, subj, val);
        if (result.success) {
          setStatusType('success');
          setFeedback(`Successfully saved ${examLabel} marks (${val}) for ${stu.name} in "${subj}" to Supabase!`);
          autoCloseTimeoutRef.current = setTimeout(() => {
            handleCloseModal();
          }, 2000);
        } else {
          setStatusType('error');
          setFeedback(`Failed to save marks: ${result.errors[0] || 'Database write error'}`);
        }
      }
    } catch (err: any) {
      console.error('[VoiceNavigation] Error saving voice data:', err);
      setStatusType('error');
      setFeedback(err?.message || 'Unexpected server error saving to Supabase.');
    } finally {
      setIsSavingData(false);
    }
  };

  return (
    <>
      {/* ── Microphone Trigger Button in Header ── */}
      <button
        onClick={handleOpenModal}
        title="Voice Assistant: Navigation & Faculty Data Entry"
        aria-label="Activate voice assistant"
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
          isListening
            ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm animate-pulse'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm hover:border-slate-300'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {isListening && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isListening ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
        </span>
        <Mic className={`w-4 h-4 ${isListening ? 'text-rose-600' : 'text-royal-600'}`} />
        <span className="hidden md:inline font-medium">Voice</span>
      </button>

      {/* ── Voice Assistant Overlay / Modal ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden transform transition-all"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-modal-title"
          >
            {/* Top Bar with Clearly Visible Close (X) Button */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-royal-600 text-white flex items-center justify-center shadow-md shadow-royal-500/20 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 id="voice-modal-title" className="text-sm font-bold text-slate-800 truncate">
                    Voice Assistant {role === 'faculty' && <span className="hidden sm:inline font-normal text-slate-500">• Entry</span>}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    English & Tanglish Control
                  </p>
                </div>
              </div>

              {/* Language Switcher + Close Button */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en-IN');
                      if (isListening) stopListening();
                    }}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      language === 'en-IN'
                        ? 'bg-white text-royal-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('ta-IN');
                      if (isListening) stopListening();
                    }}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      language === 'ta-IN'
                        ? 'bg-white text-royal-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    தமிழ்
                  </button>
                </div>

                {/* ── REQUIRED: Clearly Visible Close (X) Button in Top-Right Corner ── */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Close voice assistant"
                  title="Close voice assistant (Esc)"
                  data-testid="voice-assistant-close-button"
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-700 border border-slate-300 hover:border-rose-500 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* ── Active STT Provider Indicator & Quota Status ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-slate-100/70 border-b border-slate-200/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Provider:</span>
                {activeProvider === 'sarvam' && !sarvamQuotaExhausted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Sarvam AI STT (Primary)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                    <Globe className="w-3 h-3 text-amber-600" />
                    Browser Speech (Fallback)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {sarvamQuotaExhausted ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Quota Exhausted (Cached for session)
                    </span>
                    <button
                      type="button"
                      onClick={handleRetrySarvam}
                      className="text-[11px] font-semibold text-royal-600 hover:text-royal-800 underline flex items-center gap-1"
                      title="Clear session quota cache and retry Sarvam AI"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry Sarvam
                    </button>
                  </div>
                ) : isSarvamConfigured ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) stopListening();
                      setActiveProvider(activeProvider === 'sarvam' ? 'browser' : 'sarvam');
                    }}
                    className="text-[11px] font-medium text-slate-500 hover:text-royal-600 underline"
                    title="Toggle active voice recognition provider"
                  >
                    Switch to {activeProvider === 'sarvam' ? 'Browser' : 'Sarvam'}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">
                    (Sarvam key not configured on backend)
                  </span>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-center space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Animated Microphone Circle */}
              <div className="flex justify-center py-1">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={!isSupported || isSavingData || isTranscribing}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isTranscribing
                      ? 'bg-amber-500 text-white shadow-amber-500/30'
                      : isListening
                      ? 'bg-rose-500 text-white shadow-rose-500/40 ring-8 ring-rose-100 animate-pulse'
                      : statusType === 'success'
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : 'bg-royal-600 hover:bg-royal-700 text-white shadow-royal-600/30'
                  }`}
                  aria-label={isTranscribing ? 'Transcribing audio' : isListening ? 'Stop listening' : 'Start listening'}
                >
                  {isTranscribing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : isListening ? (
                    <Mic className="w-8 h-8 animate-bounce" />
                  ) : statusType === 'success' ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Status & Cancel Control while active */}
              <div className="min-h-[46px] flex flex-col items-center justify-center">
                {isTranscribing ? (
                  <div className="flex items-center gap-2 text-royal-600 font-semibold text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin text-royal-600" />
                    <span>Transcribing with Sarvam AI (saaras:v4)…</span>
                  </div>
                ) : isListening ? (
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="flex items-center justify-center gap-2 text-rose-600 font-semibold text-sm">
                      <span className="flex gap-1 items-end h-4">
                        <span className="w-1 h-2 bg-rose-500 rounded-full animate-pulse" />
                        <span className="w-1 h-4 bg-rose-500 rounded-full animate-pulse delay-75" />
                        <span className="w-1 h-3 bg-rose-500 rounded-full animate-pulse delay-150" />
                      </span>
                      <span>
                        {activeProvider === 'sarvam'
                          ? 'Listening via Sarvam AI… Speak now'
                          : 'Listening… Speak command now'}
                      </span>
                    </div>
                    {/* ── Stop/Transcribe Button ── */}
                    <button
                      type="button"
                      onClick={stopListening}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      title={activeProvider === 'sarvam' ? 'Finish and transcribe audio' : 'Stop listening'}
                    >
                      <MicOff className="w-3.5 h-3.5 text-rose-600" />
                      <span>{activeProvider === 'sarvam' ? 'Done Speaking (Transcribe)' : 'Stop Listening'}</span>
                    </button>
                  </div>
                ) : statusType === 'success' ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{typeof feedback === 'string' ? feedback : (feedback as any)?.message || String(feedback || '')}</span>
                  </div>
                ) : statusType === 'error' ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1.5 text-red-600 font-medium text-xs max-w-sm text-center">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{typeof feedback === 'string' ? feedback : (feedback as any)?.message || String(feedback || '')}</span>
                    </div>
                    {/* Retry button on error / no-speech */}
                    <button
                      type="button"
                      onClick={startListening}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold transition-all shadow-xs cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5 text-royal-600" />
                      <span>Try Speaking Again</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{typeof feedback === 'string' ? feedback : (feedback as any)?.message || String(feedback || '')}</p>
                )}
              </div>

              {/* ── Recognized Transcript Box (with Edit option) ── */}
              {transcript && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Heard Transcript:
                    </span>
                    {!isEditingTranscript ? (
                      <button
                        type="button"
                        onClick={() => {
                          setManualTranscriptInput(transcript);
                          setIsEditingTranscript(true);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-royal-600 hover:text-royal-700"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Transcript
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingTranscript(false)}
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {!isEditingTranscript ? (
                    <p className="text-sm font-semibold text-slate-800 break-words">
                      "{transcript}"
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={manualTranscriptInput}
                        onChange={(e) => setManualTranscriptInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-royal-500"
                        placeholder="Correct transcript here…"
                      />
                      <button
                        type="button"
                        onClick={handleApplyManualEdit}
                        className="px-3 py-1.5 bg-royal-600 text-white rounded-lg text-xs font-semibold hover:bg-royal-700 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Ambiguous Student Selection Options ── */}
              {statusType === 'ambiguous' && pendingEntry && pendingEntry.candidateStudents.length > 1 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <Users className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Multiple students match your query. Please select the correct student:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pendingEntry.candidateStudents.map((stu) => (
                      <button
                        key={stu.studentId}
                        type="button"
                        onClick={() => handleSelectCandidateStudent(stu)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-amber-100/50 border border-amber-200/80 text-left transition-all hover:border-amber-400 shadow-xs"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{stu.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{stu.studentId} (S.No {stu.sno})</p>
                        </div>
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Faculty Data Entry Review & Confirmation Card ── */}
              {pendingEntry && !pendingEntry.isStudentAmbiguous && (
                <div className="bg-royal-50/60 border border-royal-200/80 rounded-2xl p-4 text-left space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-royal-200/60 pb-2">
                    <span className="text-xs font-bold text-royal-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-royal-600" />
                      Review Voice Data Entry
                    </span>
                    <span className="text-[11px] font-semibold text-royal-700 bg-royal-100/80 px-2 py-0.5 rounded-md capitalize">
                      {pendingEntry.entryType || 'Data'}
                    </span>
                  </div>

                  {/* Field: Target Student */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Target Student:
                    </label>
                    {pendingEntry.student ? (
                      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-800">
                          {pendingEntry.student.studentId} — {pendingEntry.student.name}
                        </span>
                        <span className="text-slate-400">S.No {pendingEntry.student.sno}</span>
                      </div>
                    ) : (
                      <select
                        onChange={(e) => {
                          const stu = records.find((r) => r.studentId === e.target.value);
                          if (stu) {
                            handleSelectCandidateStudent(stu);
                          }
                        }}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 focus:outline-none"
                      >
                        <option value="">⚠️ Select Missing Student…</option>
                        {records.map((r) => (
                          <option key={r.studentId} value={r.studentId}>
                            {r.studentId} - {r.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Field: Type & Exam */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Entry Field:
                      </label>
                      <select
                        value={pendingEntry.entryType || 'marks'}
                        onChange={(e) => {
                          const val = e.target.value as 'attendance' | 'marks';
                          setPendingEntry((prev) => (prev ? { ...prev, entryType: val } : null));
                        }}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                      >
                        <option value="attendance">Attendance</option>
                        <option value="marks">Internal Marks</option>
                      </select>
                    </div>

                    {pendingEntry.entryType === 'marks' && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">
                          Exam Type:
                        </label>
                        <select
                          value={pendingEntry.examType || 'internal1'}
                          onChange={(e) => {
                            const val = e.target.value as 'internal1' | 'internal2';
                            setPendingEntry((prev) => (prev ? { ...prev, examType: val } : null));
                          }}
                          className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                        >
                          <option value="internal1">Internal Exam 1</option>
                          <option value="internal2">Internal Exam 2</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Field: Subject (for marks) */}
                  {pendingEntry.entryType === 'marks' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Subject:
                      </label>
                      <select
                        value={pendingEntry.subject || ''}
                        onChange={(e) => {
                          const subj = e.target.value as SubjectName;
                          setPendingEntry((prev) => (prev ? { ...prev, subject: subj } : null));
                        }}
                        className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border bg-white ${
                          !pendingEntry.subject ? 'border-amber-300 text-amber-900 bg-amber-50' : 'border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="">⚠️ Select Subject…</option>
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Current Database Value vs New Value */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600">
                        {pendingEntry.entryType === 'attendance' ? 'Attendance Value:' : 'Mark Value:'}
                      </span>
                      <span className="text-slate-500 font-medium">
                        Current in database:{' '}
                        <strong className="text-slate-700">
                          {pendingEntry.currentSavedValue !== null
                            ? `${pendingEntry.currentSavedValue}${pendingEntry.entryType === 'attendance' ? '%' : ''}`
                            : 'None (unentered)'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pendingEntry.value !== null ? pendingEntry.value : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                          setPendingEntry((prev) => (prev ? { ...prev, value: val } : null));
                        }}
                        className="w-28 text-sm font-bold text-slate-800 px-3 py-2 rounded-xl border border-slate-200 bg-white text-center focus:outline-none focus:ring-1 focus:ring-royal-500"
                        placeholder="e.g. 85"
                      />
                      <span className="text-xs text-slate-400">
                        {pendingEntry.entryType === 'attendance' ? '% out of 100%' : '/ 100'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Confirm & Save */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-royal-200/60">
                    <button
                      type="button"
                      onClick={() => setPendingEntry(null)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSaveData}
                      disabled={
                        isSavingData ||
                        !pendingEntry.student ||
                        pendingEntry.value === null ||
                        (pendingEntry.entryType === 'marks' && (!pendingEntry.subject || !pendingEntry.examType))
                      }
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                    >
                      {isSavingData ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {isSavingData ? 'Saving…' : 'Confirm & Save to Supabase'}
                    </button>
                  </div>
                </div>
              )}

              {/* Unsupported Browser Warning */}
              {!isSupported && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Your browser does not natively support the Web Speech API. For full voice navigation and entry, please use Google Chrome, Microsoft Edge, or Safari.
                  </span>
                </div>
              )}

              {/* Sample Voice Commands */}
              {!pendingEntry && (
                <div className="pt-2 border-t border-slate-100 text-left">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2.5">
                    <Volume2 className="w-3.5 h-3.5 text-royal-600" />
                    Sample Voice Commands (Say or Tap):
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {(role === 'faculty'
                      ? [
                          { label: 'Student Karthick Rajan, Data Structure, Internal Exam 2, 85 marks', dest: 'Data Entry' },
                          { label: 'Student Karthick Rajan, attendance 92 percent', dest: 'Data Entry' },
                          { label: 'Open Internal Exam 1', dest: 'Navigation' },
                          { label: 'Internal Exam 2 page-ku po', dest: 'Navigation' },
                          { label: 'Attendance page open pannu', dest: 'Navigation' },
                          { label: 'Marks page open pannu', dest: 'Navigation' },
                        ]
                      : [
                          { label: 'Open Internal Exam 1', dest: 'Navigation' },
                          { label: 'Internal Exam 2 page-ku po', dest: 'Navigation' },
                          { label: 'Attendance page open pannu', dest: 'Navigation' },
                          { label: 'Dashboard-ku po', dest: 'Navigation' },
                          { label: 'Profile open pannu', dest: 'Navigation' },
                          { label: 'Settings-ku po', dest: 'Navigation' },
                        ]
                    ).map((cmd) => (
                      <button
                        key={cmd.label}
                        type="button"
                        onClick={() => processSpokenInput(cmd.label)}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-left transition-all hover:border-royal-300 group"
                      >
                        <span className="truncate font-medium">{cmd.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-royal-600 transition-colors shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
              <span className="text-slate-400 flex items-center gap-1 truncate">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Active:</span> <strong>{language === 'en-IN' ? 'English' : 'தமிழ்'}</strong>
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 rounded-xl font-semibold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all shadow-xs cursor-pointer"
                  title="Close voice assistant panel"
                >
                  Close Panel
                </button>

                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isTranscribing || isSavingData}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                    isTranscribing
                      ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                      : isListening
                      ? activeProvider === 'sarvam'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                      : 'bg-royal-600 hover:bg-royal-700 text-white shadow-xs'
                  }`}
                >
                  {isTranscribing
                    ? 'Transcribing…'
                    : isListening
                    ? activeProvider === 'sarvam'
                      ? 'Done Speaking'
                      : 'Stop Listening'
                    : 'Start Listening'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceNavigation;
