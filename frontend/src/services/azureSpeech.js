import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION;

const AUTO_DETECT_LANGUAGE_CODES = ['en-US', 'ml-IN', 'ta-IN'];

const LANGUAGE_LABELS = {
    English: 'English',
    'en-US': 'English',
    en: 'English',
    Tamil: 'Tamil',
    'ta-IN': 'Tamil',
    ta: 'Tamil',
    Malayalam: 'Malayalam',
    'ml-IN': 'Malayalam',
    ml: 'Malayalam',
};

let synthesizerInstance = null;

function normalizeLanguage(language) {
    if (!language) return 'English';

    const value = String(language).trim();
    if (!value) return 'English';

    return LANGUAGE_LABELS[value] || LANGUAGE_LABELS[value.toLowerCase()] || 'English';
}

function getLocaleForLanguage(language) {
    switch (normalizeLanguage(language)) {
        case 'Tamil':
            return 'ta-IN';
        case 'Malayalam':
            return 'ml-IN';
        default:
            return 'en-US';
    }
}

function getVoiceForLanguage(language) {
    switch (normalizeLanguage(language)) {
        case 'Tamil':
            return 'ta-IN-PallaviNeural';
        case 'Malayalam':
            return 'ml-IN-MidhunNeural';
        default:
            return 'en-US-AriaNeural';
    }
}

function createBaseSpeechConfig() {
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
        throw new Error('Azure Speech configuration is missing. Set VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION.');
    }

    return SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
}

function createRecognitionSpeechConfig(locale = 'en-US') {
    const speechConfig = createBaseSpeechConfig();
    speechConfig.speechRecognitionLanguage = locale;
    return speechConfig;
}

function createSynthesisSpeechConfig(locale = 'en-US', voiceName = 'en-US-AriaNeural') {
    const speechConfig = createBaseSpeechConfig();
    speechConfig.speechSynthesisLanguage = locale;
    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    return speechConfig;
}

function safelyClose(resource) {
    try {
        resource?.close();
    } catch (error) {
        console.warn('[Azure Speech] failed to close resource', error);
    }
}

function createSynthesizer(locale = 'en-US', voiceName = 'en-US-AriaNeural') {
    if (synthesizerInstance) {
        safelyClose(synthesizerInstance);
        synthesizerInstance = null;
    }

    const speechConfig = createSynthesisSpeechConfig(locale, voiceName);
    synthesizerInstance = new SpeechSDK.SpeechSynthesizer(speechConfig);
    return synthesizerInstance;
}

export function isAzureSpeechConfigured() {
    return Boolean(AZURE_SPEECH_KEY && AZURE_SPEECH_REGION && typeof window !== 'undefined');
}

export function speakTextAzure(text, options = {}) {
    const { language = 'English', enabled = true, onStart, onEnd, onError } = options;

    if (!enabled || !text?.trim()) return false;

    if (!isAzureSpeechConfigured()) {
        onError?.('Azure Speech is not configured. Please add VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION to your environment.');
        return false;
    }

    cancelAzureSpeech();

    const normalizedLanguage = normalizeLanguage(language);
    const locale = getLocaleForLanguage(normalizedLanguage);
    const voiceName = getVoiceForLanguage(normalizedLanguage);
    const synthesizer = createSynthesizer(locale, voiceName);

    console.log('[Azure TTS] started', {
        language: normalizedLanguage,
        locale,
        voice: voiceName,
        text,
    });
    onStart?.();

    synthesizer.speakTextAsync(
        text.trim(),
        (result) => {
            try {
                if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    console.log('[Azure TTS] finished');
                    onEnd?.();
                    return;
                }

                const message = result.errorDetails || `Azure speech synthesis failed. Result reason: ${result.reason}`;
                console.error('[Azure TTS] error', message);
                onError?.(message);
            } finally {
                safelyClose(synthesizer);
                if (synthesizerInstance === synthesizer) {
                    synthesizerInstance = null;
                }
            }
        },
        (error) => {
            const message = error?.message || String(error);
            console.error('[Azure TTS] error', message);
            onError?.(message);
            safelyClose(synthesizer);
            if (synthesizerInstance === synthesizer) {
                synthesizerInstance = null;
            }
        }
    );

    return true;
}

export function cancelAzureSpeech() {
    if (!synthesizerInstance) return;

    safelyClose(synthesizerInstance);
    synthesizerInstance = null;
}

export function createAzureSpeechRecognizer({ language = 'English', onTranscript, onError, onListeningChange }) {
    if (!isAzureSpeechConfigured()) {
        onError?.('Azure Speech is not configured. Please set VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION.');
        return null;
    }

    const fallbackLanguage = normalizeLanguage(language);
    const locale = getLocaleForLanguage(fallbackLanguage);
    const speechConfig = createRecognitionSpeechConfig(locale);
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const autoDetectSourceLanguageConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(AUTO_DETECT_LANGUAGE_CODES);
    const recognizer = SpeechSDK.SpeechRecognizer.FromConfig(
        speechConfig,
        autoDetectSourceLanguageConfig,
        audioConfig
    );

    let isRecognizing = false;
    let lastTranscript = '';

    const setListeningState = (value) => {
        if (isRecognizing === value) return;
        isRecognizing = value;
        onListeningChange?.(value);
    };

    const handleError = (message) => {
        console.error('[Azure STT] error', message);
        onError?.(message);
    };

    const getDetectedLanguage = (result) => {
        const autoDetectResult = SpeechSDK.AutoDetectSourceLanguageResult.fromResult(result);
        const detectedFromResult = autoDetectResult?.language;
        const detectedProperty = result?.properties?.getProperty(
            SpeechSDK.PropertyId.SpeechServiceConnection_AutoDetectSourceLanguageResult
        );
        const detectedLanguage = detectedFromResult || detectedProperty || locale;

        if (!detectedFromResult && !detectedProperty) {
            console.warn('[Azure STT] auto language detection returned Unknown; using fallback language', locale);
        }

        return normalizeLanguage(detectedLanguage || fallbackLanguage);
    };

    recognizer.recognizing = (_, event) => {
        setListeningState(true);
        const interimText = event?.result?.text?.trim();
        if (interimText) {
            console.log('[Azure STT] recognizing text', interimText);
        }
    };

    recognizer.recognized = (_, event) => {
        const result = event.result;

        if (!result) {
            console.warn('[Azure STT] recognized event received without a result');
            return;
        }

        if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const transcript = result.text?.trim();
            const detectedLanguage = getDetectedLanguage(result);

            console.log('[Azure STT] recognized text', transcript);
            console.log('[Azure STT] detected language', detectedLanguage);

            if (transcript && transcript !== lastTranscript) {
                lastTranscript = transcript;
                onTranscript?.(transcript, detectedLanguage);
                stopRecognition();
            }
            return;
        }

        if (result.reason === SpeechSDK.ResultReason.NoMatch) {
            const noMatchDetails = SpeechSDK.NoMatchDetails.fromResult(result);
            console.warn('[Azure STT] no speech recognized', {
                reason: noMatchDetails?.reason,
                text: result.text,
            });
            return;
        }

        console.warn('[Azure STT] recognized event with unexpected result reason', result.reason);
    };

    recognizer.canceled = (_, event) => {
        setListeningState(false);

        let cancellationDetails;
        try {
            cancellationDetails = event.result ? SpeechSDK.CancellationDetails.fromResult(event.result) : null;
        } catch (error) {
            console.warn('[Azure STT] unable to read cancellation details', error);
        }

        const errorDetails = event.errorDetails || cancellationDetails?.errorDetails;
        console.error('[Azure STT] canceled', {
            reason: event.reason,
            errorCode: cancellationDetails?.ErrorCode || cancellationDetails?.errorCode,
            errorDetails,
        });

        if (errorDetails) {
            handleError(errorDetails);
        }
    };

    recognizer.sessionStopped = () => {
        console.log('[Azure STT] session stopped');
        setListeningState(false);
    };

    const startRecognition = () => {
        return new Promise((resolve, reject) => {
            if (isRecognizing) {
                resolve();
                return;
            }

            recognizer.startContinuousRecognitionAsync(
                () => {
                    console.log('[Azure STT] recognition started', {
                        fallbackLocale: locale,
                        autoDetectLanguages: AUTO_DETECT_LANGUAGE_CODES,
                    });
                    setListeningState(true);
                    resolve();
                },
                (error) => {
                    setListeningState(false);
                    handleError(error?.message || String(error) || 'Unable to start Azure speech recognition.');
                    reject(error);
                }
            );
        });
    };

    const stopRecognition = () => {
        return new Promise((resolve) => {
            if (!isRecognizing) {
                resolve();
                return;
            }

            recognizer.stopContinuousRecognitionAsync(
                () => {
                    console.log('[Azure STT] recognition stopped');
                    setListeningState(false);
                    resolve();
                },
                (error) => {
                    setListeningState(false);
                    handleError(error?.message || String(error) || 'Unable to stop Azure speech recognition.');
                    resolve();
                }
            );
        });
    };

    const disposeRecognizer = () => {
        safelyClose(recognizer);
    };

    return {
        start: startRecognition,
        stop: stopRecognition,
        dispose: disposeRecognizer,
    };
}
