'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  Key, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Zap, 
  ShieldCheck,
  Server,
  Lock,
  Mic,
  Volume2,
  Square,
  Play,
  Layers,
  Vote,
  Banknote,
  Sliders,
  DollarSign,
  Radio,
  Sparkles,
  Type,
  RotateCcw,
  VolumeX,
  FastForward
} from 'lucide-react';
import { KineticDialogueBox } from './KineticDialogueBox';

export interface NineRouterConfigState {
  baseUrl: string;
  apiKey: string;
  model: string;
  fishAudioApiKey?: string;
  fishAudioModel?: string;
  fishAudioEnabled?: boolean;
  dialogueOnlyAudio?: boolean; // When true: mute all SFX & non-dialogue audio, keep all character spoken dialogues
  lookaheadDepth?: 2 | 3 | 4 | 5;
  fullRoundBuffering?: boolean;
  ballotSpeed?: number;
  ballotAutoPlay?: boolean;
  cctvWiretapAudioEffect?: number; // 0 to 100 (%)
  kineticSubtitlesEnabled?: boolean;
  kineticSubtitleStyle?: 'mrbeast' | 'cinematic' | 'neon';
  kineticHighlightCriticalWords?: boolean;
  kineticDynamicBoxResize?: boolean;
  kineticFontSize?: 'standard' | 'large' | 'cinematic';
  // Automatic Next Mode for OBS / YouTube recording
  autoNextMode?: boolean;
  autoNextDelay?: number; // In seconds (default 0.75s)
}

interface NineRouterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: NineRouterConfigState;
  onSaveConfig: (config: NineRouterConfigState) => void;
}

export const NineRouterSettingsModal: React.FC<NineRouterSettingsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'9router' | 'fishaudio' | 'ballot' | 'subtitles' | 'autonext'>('9router');
  const [baseUrl, setBaseUrl] = useState(currentConfig.baseUrl || 'http://localhost:20128/v1');
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [model, setModel] = useState(currentConfig.model || 'gpt-4o-mini');
  const [lookaheadDepth, setLookaheadDepth] = useState<2 | 3 | 4 | 5>(currentConfig.lookaheadDepth || 2);
  const [fullRoundBuffering, setFullRoundBuffering] = useState<boolean>(currentConfig.fullRoundBuffering ?? false);
  const [showKey, setShowKey] = useState(false);

  // Automatic Next Mode (OBS Recording)
  const [autoNextMode, setAutoNextMode] = useState<boolean>(currentConfig.autoNextMode ?? false);
  const [autoNextDelay, setAutoNextDelay] = useState<number>(
    typeof currentConfig.autoNextDelay === 'number' ? currentConfig.autoNextDelay : 0.75
  );

  // Ballot Live Feed settings
  const [ballotSpeed, setBallotSpeed] = useState<number>(currentConfig.ballotSpeed ?? 1.0);
  const [ballotAutoPlay, setBallotAutoPlay] = useState<boolean>(currentConfig.ballotAutoPlay !== false);

  // CCTV Surveillance Wiretap Filter Effect (0% to 100%)
  const [cctvWiretapAudioEffect, setCctvWiretapAudioEffect] = useState<number>(
    currentConfig.cctvWiretapAudioEffect ?? 80
  );

  // Kinetic Subtitles settings (MrBeast / Shorts Style)
  const [kineticSubtitlesEnabled, setKineticSubtitlesEnabled] = useState<boolean>(
    currentConfig.kineticSubtitlesEnabled !== false
  );
  const [kineticSubtitleStyle, setKineticSubtitleStyle] = useState<'mrbeast' | 'cinematic' | 'neon'>(
    currentConfig.kineticSubtitleStyle || 'mrbeast'
  );
  const [kineticHighlightCriticalWords, setKineticHighlightCriticalWords] = useState<boolean>(
    currentConfig.kineticHighlightCriticalWords !== false
  );
  const [kineticDynamicBoxResize, setKineticDynamicBoxResize] = useState<boolean>(
    currentConfig.kineticDynamicBoxResize !== false
  );
  const [kineticFontSize, setKineticFontSize] = useState<'standard' | 'large' | 'cinematic'>(
    currentConfig.kineticFontSize || 'large'
  );
  const [previewSpeaking, setPreviewSpeaking] = useState<boolean>(true);

  // Fish Audio settings
  const defaultFishKeys = 'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0, sk-fish-FhpR3igZk-M0oslJOI6KBwe6ipOePusmFB4A1sAUMIs';
  const [fishAudioApiKey, setFishAudioApiKey] = useState(
    currentConfig.fishAudioApiKey || defaultFishKeys
  );
  const [fishAudioModel, setFishAudioModel] = useState(
    currentConfig.fishAudioModel || 's2.1-pro-free'
  );
  const [fishAudioEnabled, setFishAudioEnabled] = useState(
    currentConfig.fishAudioEnabled !== false
  );
  // Dialogue-Only Audio Mode (Mutes all SFX & non-dialogue audio, keeps character speech)
  const [dialogueOnlyAudio, setDialogueOnlyAudio] = useState<boolean>(
    currentConfig.dialogueOnlyAudio ?? false
  );
  const [showFishKey, setShowFishKey] = useState(false);
  const [isTestingTts, setIsTestingTts] = useState(false);
  const [ttsTestSuccess, setTtsTestSuccess] = useState(false);
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'idle'; text: string }>({
    type: 'idle',
    text: '',
  });

  useEffect(() => {
    if (isOpen) {
      setBaseUrl(currentConfig.baseUrl || 'http://localhost:20128/v1');
      setApiKey(currentConfig.apiKey || '');
      setModel(currentConfig.model || 'gpt-4o-mini');
      setLookaheadDepth(currentConfig.lookaheadDepth || 2);
      setFullRoundBuffering(currentConfig.fullRoundBuffering ?? false);
      setBallotSpeed(currentConfig.ballotSpeed ?? 1.0);
      setBallotAutoPlay(currentConfig.ballotAutoPlay !== false);
      setCctvWiretapAudioEffect(currentConfig.cctvWiretapAudioEffect ?? 80);
      setFishAudioApiKey(currentConfig.fishAudioApiKey || defaultFishKeys);
      setFishAudioModel(currentConfig.fishAudioModel || 's2.1-pro-free');
      setFishAudioEnabled(currentConfig.fishAudioEnabled !== false);
      setDialogueOnlyAudio(currentConfig.dialogueOnlyAudio ?? false);
      setKineticSubtitlesEnabled(currentConfig.kineticSubtitlesEnabled !== false);
      setKineticSubtitleStyle(currentConfig.kineticSubtitleStyle || 'mrbeast');
      setKineticHighlightCriticalWords(currentConfig.kineticHighlightCriticalWords !== false);
      setKineticDynamicBoxResize(currentConfig.kineticDynamicBoxResize !== false);
      setKineticFontSize(currentConfig.kineticFontSize || 'large');
      setAutoNextMode(currentConfig.autoNextMode ?? false);
      setAutoNextDelay(typeof currentConfig.autoNextDelay === 'number' ? currentConfig.autoNextDelay : 0.75);
      setPreviewSpeaking(true);
      setStatusMessage({ type: 'idle', text: '' });
      setTtsTestSuccess(false);
    }
  }, [isOpen, currentConfig]);

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleFetchModels = async () => {
    if (!baseUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 9router Base URL first.' });
      return;
    }

    setIsLoadingModels(true);
    setStatusMessage({ type: 'idle', text: '' });

    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const models: string[] = data.models || [];
      setAvailableModels(models);

      if (models.length > 0) {
        setStatusMessage({
          type: 'success',
          text: `Successfully connected to 9router! Discovered ${models.length} available models.`,
        });
        // Auto-select first model if current model is not in list
        if (!models.includes(model)) {
          setModel(models[0]);
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Connected to 9router, but no active models were found in the model list.',
        });
      }
    } catch (err: any) {
      console.error('Fetch models error:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to connect to 9router: ${err.message}`,
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleTestFishAudio = async () => {
    if (!fishAudioApiKey.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a Fish Audio API Key first.' });
      return;
    }

    setIsTestingTts(true);
    setStatusMessage({ type: 'idle', text: '' });

    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'The Republic of Valoria presidential election broadcast system is operating normally.',
          apiKey: fishAudioApiKey.trim(),
          model: fishAudioModel.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `TTS request failed with HTTP ${res.status}`);
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onended = () => {
        setIsTestingTts(false);
        setTtsTestSuccess(true);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsTestingTts(false);
        setStatusMessage({
          type: 'error',
          text: 'Audio playback failed in browser.',
        });
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setIsTestingTts(false);
      setTtsTestSuccess(true);
      setStatusMessage({
        type: 'success',
        text: 'Fish Audio TTS connected successfully! Audio sample played.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Fish Audio Connection Failed: ${err.message}`,
      });
      setIsTestingTts(false);
    }
  };

  const handleSave = () => {
    if (!baseUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'Base URL cannot be empty.' });
      return;
    }
    if (!apiKey.trim()) {
      setStatusMessage({ type: 'error', text: 'API Key cannot be empty.' });
      return;
    }
    if (!model.trim()) {
      setStatusMessage({ type: 'error', text: 'Please select or enter a Model name.' });
      return;
    }

    onSaveConfig({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      lookaheadDepth,
      fullRoundBuffering,
      fishAudioApiKey: fishAudioApiKey.trim(),
      fishAudioModel: fishAudioModel.trim(),
      fishAudioEnabled: fishAudioEnabled,
      dialogueOnlyAudio,
      ballotSpeed,
      ballotAutoPlay,
      cctvWiretapAudioEffect,
      kineticSubtitlesEnabled,
      kineticSubtitleStyle,
      kineticHighlightCriticalWords,
      kineticDynamicBoxResize,
      kineticFontSize,
      autoNextMode,
      autoNextDelay: Number(autoNextDelay) || 0.75,
    });
    onClose();
  };

  const filteredModels = availableModels.filter(m => 
    m.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar rounded-3xl bg-slate-950 border-2 border-cyan-500/40 p-6 md:p-8 shadow-2xl shadow-cyan-950/60 flex flex-col gap-5">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border transition ${
              activeTab === '9router'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : activeTab === 'fishaudio'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : activeTab === 'ballot'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : activeTab === 'subtitles'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {activeTab === '9router' ? (
                <Cpu className="w-6 h-6" />
              ) : activeTab === 'fishaudio' ? (
                <Mic className="w-6 h-6" />
              ) : activeTab === 'ballot' ? (
                <Vote className="w-6 h-6" />
              ) : activeTab === 'subtitles' ? (
                <Sparkles className="w-6 h-6" />
              ) : (
                <FastForward className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                System &amp; Audio Settings
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Active
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Manage 9router LLM, Fish.Audio neural speech, ballot pacing, kinetic subtitles &amp; OBS auto-advance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-mono flex-wrap gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('9router'); setStatusMessage({ type: 'idle', text: '' }); }}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === '9router'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>9router</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('fishaudio'); setStatusMessage({ type: 'idle', text: '' }); }}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'fishaudio'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio &amp; Speech</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('ballot'); setStatusMessage({ type: 'idle', text: '' }); }}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'ballot'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Ballot Feed</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('subtitles'); setStatusMessage({ type: 'idle', text: '' }); }}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'subtitles'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Subtitles</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('autonext'); setStatusMessage({ type: 'idle', text: '' }); }}
            className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'autonext'
                ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Auto-Next</span>
          </button>
        </div>

        {/* Form Body: Tab 1 - 9router */}
        {activeTab === '9router' && (
          <div className="flex flex-col gap-4">
            {/* 1. Base URL */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" /> 9router Base URL / Endpoint
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBaseUrl('http://localhost:20128/v1')}
                    className="text-[10px] font-mono text-cyan-400 hover:underline px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                  >
                    Local (:20128)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaseUrl('https://api.9router.com/v1')}
                    className="text-[10px] font-mono text-cyan-400 hover:underline px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                  >
                    Cloud 9router
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:20128/v1 or https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-400 transition"
              />
            </div>

            {/* 2. API Key */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> 9router API Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[10px] font-mono text-slate-400 hover:text-slate-200"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your 9router API key (e.g. 9r_...)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-400 transition pr-10"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* 3. Fetch Models Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={isLoadingModels || !baseUrl.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-cyan-300 font-bold text-xs uppercase tracking-wider border border-cyan-500/30 transition shadow disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
                {isLoadingModels ? 'Fetching Models from 9router...' : 'Fetch Available Models from 9router'}
              </button>
            </div>

            {/* 4. Model Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" /> Active 9router Model
                </span>
                {availableModels.length > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 font-normal">
                    {availableModels.length} Models Loaded
                  </span>
                )}
              </label>

              {availableModels.length > 0 ? (
                <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-700">
                  {/* Search in fetched models */}
                  <div className="relative">
                    <input
                      type="text"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search fetched models..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-hidden focus:border-cyan-400"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Model Chips Grid */}
                  <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1.5 pr-1 custom-scrollbar">
                    {filteredModels.map((mId) => (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => setModel(mId)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition text-left ${
                          model === mId
                            ? 'bg-cyan-500 text-black font-black shadow-md shadow-cyan-500/20'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {mId}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800 flex items-center justify-between">
                    <span>Selected Model:</span>
                    <span className="text-cyan-400 font-bold">{model}</span>
                  </div>
                </div>
              ) : (
                /* Direct Input if not fetched yet */
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet, gemini-1.5-pro, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-400 transition"
                />
              )}
            </div>

            {/* 5. Lookahead Pipeline Buffer Depth */}
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> Pipeline Lookahead Buffer Depth
                </label>
                <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                  {lookaheadDepth} Steps Ahead
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Controls how many future dialogue steps and neural voices are pre-synthesized in memory ahead of the live broadcast.
              </p>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {([2, 3, 4, 5] as const).map((depth) => (
                  <button
                    key={depth}
                    type="button"
                    onClick={() => setLookaheadDepth(depth)}
                    className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                      lookaheadDepth === depth
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>{depth} Steps</span>
                    <span className={`text-[9px] ${lookaheadDepth === depth ? 'text-black/80' : 'text-slate-500'}`}>
                      {depth === 2 ? 'Fastest' : depth === 5 ? 'Ultra-Deep' : 'Deep'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Full-Round & Whole Game Autonomous Pre-Buffering */}
            <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-purple-950/40 border border-cyan-500/40 shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5 border border-cyan-500/30">
                    <Zap className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Full-Round &amp; Autonomous Whole-Game Pre-Buffering
                      </span>
                      {fullRoundBuffering && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                          ⚡ Gate Active
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-300 font-sans mt-1 leading-relaxed">
                      Pre-buffers the <strong>entire 1st round</strong> (all speeches, attacks, CCTV backroom deals, and voting confessionals) before allowing playback. Once Round 1 is ready, playback begins with 0ms delay while automatically pre-buffering all remaining rounds in the background.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFullRoundBuffering(!fullRoundBuffering)}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer shrink-0 ml-1 ${
                    fullRoundBuffering
                      ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30 font-black'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {fullRoundBuffering ? 'ENABLED' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Body: Tab 2 - Audio & Speech Settings */}
        {activeTab === 'fishaudio' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* 1. Mute All Sound Effects (Dialogue Only Mode) */}
            <div className={`flex flex-col gap-2.5 p-3.5 rounded-2xl border transition-all ${
              dialogueOnlyAudio
                ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border-amber-500/50 shadow-md shadow-amber-950/40'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className={`p-2 rounded-xl shrink-0 mt-0.5 border transition ${
                    dialogueOnlyAudio
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {dialogueOnlyAudio ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Mute All Sound Effects (Dialogue Only)
                      </span>
                      {dialogueOnlyAudio ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50">
                          ⚡ DIALOGUE ONLY ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                          ALL SFX ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-300 font-sans mt-1 leading-relaxed">
                      Silences all procedural sound effects and non-dialogue audio (gavels, attack braams, CCTV beeps, ballot dings, elimination buzzers, betrayal alarms, and fanfare). <strong>All candidate spoken dialogues (campaign speeches, debate attacks &amp; rebuttals, CCTV backroom deals, and internal voting confessionals) remain 100% audible.</strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogueOnlyAudio(!dialogueOnlyAudio)}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer shrink-0 ml-1 ${
                    dialogueOnlyAudio
                      ? 'bg-amber-500 text-black font-black shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {dialogueOnlyAudio ? 'MUTED' : 'OFF'}
                </button>
              </div>
            </div>

            {/* 2. Fish Audio API Key */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-400" /> Fish.Audio API Keys (Round-Robin Pool)
                  </label>
                  {(() => {
                    const count = fishAudioApiKey
                      .split(/[\r\n,;\s]+/)
                      .map(k => k.trim())
                      .filter(k => k.startsWith('sk-fish-') || k.length > 20).length;
                    return (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-xs ${
                        count > 1 
                          ? 'bg-purple-950/90 text-cyan-300 border-cyan-500/50' 
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        ⚡ {count} {count === 1 ? 'Key' : 'Keys (Round-Robin Active)'}
                      </span>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setShowFishKey(!showFishKey)}
                  className="text-[10px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showFishKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <textarea
                  rows={2}
                  value={showFishKey ? fishAudioApiKey : fishAudioApiKey.replace(/[a-zA-Z0-9_-]/g, '•')}
                  onChange={(e) => setFishAudioApiKey(e.target.value)}
                  placeholder="sk-fish-..., sk-fish-... (comma or newline separated for round-robin)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-purple-800/80 text-xs text-purple-200 font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-purple-400 transition resize-none custom-scrollbar"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Paste multiple API keys separated by commas or newlines for instant round-robin load balancing. Get keys at <a href="https://fish.audio/app/developers" target="_blank" rel="noreferrer" className="text-purple-400 underline">fish.audio/app/developers</a>
              </p>
            </div>

            {/* 2. Model Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-purple-400" /> TTS Model Architecture
              </label>
              <select
                value={fishAudioModel}
                onChange={(e) => setFishAudioModel(e.target.value)}
                className="w-full bg-slate-900 border border-purple-800/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-500"
              >
                <option value="s2.1-pro-free">s2.1-pro-free (Recommended — Zero Credit Free Tier)</option>
                <option value="s2.1-pro">s2.1-pro (Production / Paid Credits)</option>
                <option value="s2-pro">s2-pro</option>
                <option value="s1">s1</option>
              </select>
            </div>

            {/* 3. Audio Auto-Play Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/60">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-purple-200">Auto-Play Character Speeches</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Automatically speak candidate dialogue aloud during debate phases.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFishAudioEnabled(!fishAudioEnabled)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                  fishAudioEnabled
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {fishAudioEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 4. CCTV Leaked Wiretap Audio DSP Effect (0% to 100%) */}
            <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                    CCTV Wiretapped Surveillance Audio Filter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    cctvWiretapAudioEffect > 0
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    {cctvWiretapAudioEffect === 0 ? 'OFF (Clean Audio)' : `${cctvWiretapAudioEffect}% Strength`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCctvWiretapAudioEffect(cctvWiretapAudioEffect > 0 ? 0 : 80)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition cursor-pointer ${
                      cctvWiretapAudioEffect > 0
                        ? 'bg-emerald-500 text-black font-black shadow-xs'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {cctvWiretapAudioEffect > 0 ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Applies Web Audio bandpass telephony filtering (450Hz–3200Hz), walkie-talkie preamp saturation, and subtle RF static floor strictly during <strong>Leaked CCTV Backroom</strong> feeds. All other election speeches stay pristine clean studio audio.
              </p>

              {/* Slider (0% to 100%) */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[10px] font-mono text-slate-400 w-6">0%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={cctvWiretapAudioEffect}
                  onChange={(e) => setCctvWiretapAudioEffect(Number(e.target.value))}
                  className="flex-1 accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] font-mono text-emerald-400 font-bold w-9 text-right">
                  {cctvWiretapAudioEffect}%
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-mono mr-1">Presets:</span>
                {[
                  { label: 'Off', val: 0 },
                  { label: 'Subtle (35%)', val: 35 },
                  { label: 'Surveillance (75%)', val: 75 },
                  { label: 'Heavy Wiretap (100%)', val: 100 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCctvWiretapAudioEffect(p.val)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      cctvWiretapAudioEffect === p.val
                        ? 'bg-emerald-400 text-black font-black'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Test TTS Connection Button */}
            <button
              type="button"
              onClick={handleTestFishAudio}
              disabled={isTestingTts || !fishAudioApiKey.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-bold text-xs uppercase tracking-wider border border-purple-600 transition shadow disabled:opacity-50 cursor-pointer"
            >
              {isTestingTts ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                  <span>Synthesizing &amp; Playing Audio...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-purple-300" />
                  <span>Test Fish.Audio TTS Connection</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Form Body: Tab 3 - Ballot Live Feed */}
        {activeTab === 'ballot' && (
          <div className="flex flex-col gap-4">
            {/* 1. Animation Speed Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Cinematic Ballot Reveal &amp; Bailout Speed
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { value: 0.5, label: '0.5x Suspense', desc: 'Slow & intense for YouTube drama' },
                  { value: 0.75, label: '0.75x Dramatic', desc: 'Extended dramatic pacing' },
                  { value: 1.0, label: '1.0x Standard', desc: 'Balanced broadcast speed' },
                  { value: 1.5, label: '1.5x Fast', desc: 'High-energy fast reveal' },
                  { value: 2.0, label: '2.0x Turbo', desc: 'Maximum speed playback' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBallotSpeed(opt.value)}
                    className={`flex flex-col items-start p-2.5 sm:p-3 rounded-2xl border text-left transition cursor-pointer ${
                      ballotSpeed === opt.value
                        ? 'bg-emerald-950/80 border-emerald-400 text-white shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className={`text-xs font-mono font-black ${ballotSpeed === opt.value ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 leading-snug">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Auto-Play Ballot Feed */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-400" /> Auto-Play Live Ballot Feed
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Automatically advance through unsealed votes and -$40M bailout steps.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBallotAutoPlay(!ballotAutoPlay)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                  ballotAutoPlay
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {ballotAutoPlay ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 3. $40M Capitol Vote Bailout Details Info Card */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex items-start gap-3 text-xs text-emerald-300/90 leading-relaxed font-sans">
              <DollarSign className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-300 text-xs mb-1">
                  YouTube-Ready Bailout Auction System
                </p>
                <p className="text-[11px] text-slate-400">
                  During live vote counting, candidates in 1st place on the chopping block automatically pay $40M to remove 1 elimination vote if they hold funds. GSAP spring tweens animate the floating cash badge and smoothly rearrange leaderboard rankings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Body: Tab 4 - Kinetic Subtitles */}
        {activeTab === 'subtitles' && (
          <div className="flex flex-col gap-4">
            {/* 1. Master Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Kinetic Word-by-Word Subtitles (MrBeast Style)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Progressively highlight spoken words and retain them in dynamic dialogue boxes.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setKineticSubtitlesEnabled(!kineticSubtitlesEnabled)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                  kineticSubtitlesEnabled
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-950'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {kineticSubtitlesEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* 2. Critical Words Highlighting Switch */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-amber-400" /> Critical Words Thematic Glow
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Highlight high-impact words (&ldquo;BRIBE&rdquo;, &ldquo;LIES&rdquo;, &ldquo;$40M&rdquo;, &ldquo;CORRUPT&rdquo;) in glowing badges.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setKineticHighlightCriticalWords(!kineticHighlightCriticalWords)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                  kineticHighlightCriticalWords
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {kineticHighlightCriticalWords ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 3. Dynamic Dialogue Box Resizing */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> Dynamic Box Resizing
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Dialogue box naturally expands as words are spoken, keeping past words visible.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setKineticDynamicBoxResize(!kineticDynamicBoxResize)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer ${
                  kineticDynamicBoxResize
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {kineticDynamicBoxResize ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 4. Subtitle Font Scale */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-400" /> Broadcast Typography Scale
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'standard', label: 'Standard', desc: 'Compact & balanced' },
                  { value: 'large', label: 'Large (1080p)', desc: 'Recommended for YouTube' },
                  { value: 'cinematic', label: 'Cinematic (4K)', desc: 'Large bold broadcast' },
                ].map((scaleOpt) => (
                  <button
                    key={scaleOpt.value}
                    type="button"
                    onClick={() => setKineticFontSize(scaleOpt.value as any)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col transition cursor-pointer ${
                      kineticFontSize === scaleOpt.value
                        ? 'bg-amber-500/15 border-amber-400/80 shadow-md shadow-amber-950/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className={`text-xs font-mono font-black ${kineticFontSize === scaleOpt.value ? 'text-amber-300' : 'text-slate-300'}`}>
                      {scaleOpt.label}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      {scaleOpt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Live Interactive Subtitle Preview Box */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" /> Live Broadcast Subtitle Preview
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewSpeaking(false);
                    setTimeout(() => setPreviewSpeaking(true), 100);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/50 text-[10px] font-mono font-bold transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Replay Preview
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800">
                <KineticDialogueBox
                  key={`preview-${previewSpeaking ? 'speaking' : 'idle'}-${kineticFontSize}-${kineticHighlightCriticalWords}`}
                  text="I offered a $40M BRIBE to expose their CORRUPT LIES and defend the CONSTITUTION!"
                  isSpeaking={previewSpeaking}
                  enabled={kineticSubtitlesEnabled}
                  highlightCritical={kineticHighlightCriticalWords}
                  dynamicResize={kineticDynamicBoxResize}
                  fontSize={kineticFontSize}
                  speakerColor="#f59e0b"
                />
              </div>
            </div>
          </div>
        )}

        {/* Form Body: Tab 5 - Automatic Next Mode (OBS Recording) */}
        {activeTab === 'autonext' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Header Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-amber-950/20 to-slate-900 border border-amber-500/30 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                <FastForward className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Automatic Next Mode (Hands-Free OBS / YouTube Recording)
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    autoNextMode 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700 animate-pulse' 
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}>
                    {autoNextMode ? 'ACTIVE' : 'OFF'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  Record 40+ minute YouTube videos on OBS completely hands-free! The simulation automatically triggers the next step
                  once <strong className="text-amber-300">BOTH</strong> candidate speech audio and kinetic subtitles (100% finished) complete.
                </p>
              </div>
            </div>

            {/* 1. Toggle: Enable Automatic Next Mode */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Radio className={`w-3.5 h-3.5 ${autoNextMode ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                  Automatic Next Mode
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {autoNextMode
                    ? 'Autonomous recording active: automatically advances until the whole game is finished.'
                    : 'Manual control: press Right Arrow (→) or click Next Step.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoNextMode(!autoNextMode)}
                className={`px-4 py-2 rounded-xl text-xs font-display font-black uppercase tracking-wider transition border cursor-pointer ${
                  autoNextMode
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {autoNextMode ? 'ENABLED (AUTOPLAY)' : 'DISABLED'}
              </button>
            </div>

            {/* 2. Post-Dialogue Advance Delay (Seconds) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Post-Dialogue Advance Delay
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-amber-400 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40">
                    {autoNextDelay.toFixed(2)}s Delay
                  </span>
                  <input
                    type="number"
                    min="0.05"
                    max="5.0"
                    step="0.05"
                    value={autoNextDelay}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setAutoNextDelay(Math.min(5.0, Math.max(0.05, val)));
                    }}
                    className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-amber-300 text-xs font-mono font-bold text-center focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                Wait time after <span className="text-white font-semibold">BOTH</span> character audio dialogue and subtitle dialogue (100% animation) finish before stepping to the next event.
              </p>

              {/* Range Slider */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[10px] font-mono text-slate-500">0.05s</span>
                <input
                  type="range"
                  min="0.05"
                  max="3.0"
                  step="0.05"
                  value={autoNextDelay}
                  onChange={e => setAutoNextDelay(parseFloat(e.target.value))}
                  className="flex-1 accent-amber-400 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-500">3.00s</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Presets:</span>
                {[
                  { label: '0.25s (Instant)', val: 0.25 },
                  { label: '0.50s (Snappy)', val: 0.50 },
                  { label: '0.75s (Default)', val: 0.75 },
                  { label: '1.00s (Standard)', val: 1.00 },
                  { label: '1.50s (Cinematic)', val: 1.50 },
                ].map(preset => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setAutoNextDelay(preset.val)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                      Math.abs(autoNextDelay - preset.val) < 0.01
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Timing & Synchronization Lifecycle Diagram */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                Dual-Condition Synchronization Verification
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[10px] font-mono">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center">
                  <Volume2 className="w-4 h-4 text-cyan-400 mb-1" />
                  <span className="text-white font-bold">1. Audio Finishes</span>
                  <span className="text-slate-400 text-[9px] mt-0.5">Character speech ends</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center">
                  <Sparkles className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-white font-bold">2. Subtitles 100%</span>
                  <span className="text-slate-400 text-[9px] mt-0.5">Word pop settled (+180ms)</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col items-center">
                  <Sliders className="w-4 h-4 text-amber-300 mb-1" />
                  <span className="text-amber-300 font-bold">3. Wait {autoNextDelay.toFixed(2)}s</span>
                  <span className="text-slate-400 text-[9px] mt-0.5">Configured delay</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-600/40 flex flex-col items-center">
                  <FastForward className="w-4 h-4 text-emerald-400 mb-1" />
                  <span className="text-emerald-300 font-bold">4. Next Step</span>
                  <span className="text-slate-400 text-[9px] mt-0.5">Autonomous advance</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Message Alert */}
        {statusMessage.text && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
                : 'bg-red-950/60 border-red-700/80 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* Modal Footer / Save Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Saved locally in browser session
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider transition border border-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
