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
  DollarSign
} from 'lucide-react';

export interface NineRouterConfigState {
  baseUrl: string;
  apiKey: string;
  model: string;
  fishAudioApiKey?: string;
  fishAudioModel?: string;
  fishAudioEnabled?: boolean;
  lookaheadDepth?: 2 | 3 | 4 | 5;
  ballotSpeed?: number;
  ballotAutoPlay?: boolean;
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
  const [activeTab, setActiveTab] = useState<'9router' | 'fishaudio' | 'ballot'>('9router');
  const [baseUrl, setBaseUrl] = useState(currentConfig.baseUrl || 'http://localhost:20128/v1');
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [model, setModel] = useState(currentConfig.model || 'gpt-4o-mini');
  const [lookaheadDepth, setLookaheadDepth] = useState<2 | 3 | 4 | 5>(currentConfig.lookaheadDepth || 2);
  const [showKey, setShowKey] = useState(false);

  // Ballot Live Feed settings
  const [ballotSpeed, setBallotSpeed] = useState<number>(currentConfig.ballotSpeed ?? 1.0);
  const [ballotAutoPlay, setBallotAutoPlay] = useState<boolean>(currentConfig.ballotAutoPlay !== false);

  // Fish Audio settings
  const [fishAudioApiKey, setFishAudioApiKey] = useState(
    currentConfig.fishAudioApiKey || 'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0'
  );
  const [fishAudioModel, setFishAudioModel] = useState(
    currentConfig.fishAudioModel || 's2.1-pro-free'
  );
  const [fishAudioEnabled, setFishAudioEnabled] = useState(
    currentConfig.fishAudioEnabled !== false
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
      setBallotSpeed(currentConfig.ballotSpeed ?? 1.0);
      setBallotAutoPlay(currentConfig.ballotAutoPlay !== false);
      setFishAudioApiKey(currentConfig.fishAudioApiKey || 'sk-fish-5Zz7hVlOft5sr46Nz1jPf4LhAPdSBJ0Ar08dxdBdCq0');
      setFishAudioModel(currentConfig.fishAudioModel || 's2.1-pro-free');
      setFishAudioEnabled(currentConfig.fishAudioEnabled !== false);
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
      fishAudioApiKey: fishAudioApiKey.trim(),
      fishAudioModel: fishAudioModel.trim(),
      fishAudioEnabled: fishAudioEnabled,
      ballotSpeed,
      ballotAutoPlay,
    });
    onClose();
  };

  const filteredModels = availableModels.filter(m => 
    m.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-950 border-2 border-cyan-500/40 p-6 md:p-8 shadow-2xl shadow-cyan-950/60 flex flex-col gap-5 overflow-hidden">
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
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {activeTab === '9router' ? (
                <Cpu className="w-6 h-6" />
              ) : activeTab === 'fishaudio' ? (
                <Mic className="w-6 h-6" />
              ) : (
                <Vote className="w-6 h-6" />
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
                Manage 9router LLM endpoints, Fish.Audio speech synthesis &amp; ballot animation pacing.
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
        <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => { setActiveTab('9router'); setStatusMessage({ type: 'idle', text: '' }); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === '9router'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>9router LLM</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('fishaudio'); setStatusMessage({ type: 'idle', text: '' }); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'fishaudio'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Fish.Audio</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('ballot'); setStatusMessage({ type: 'idle', text: '' }); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition cursor-pointer ${
              activeTab === 'ballot'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Ballot Feed</span>
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
          </div>
        )}

        {/* Form Body: Tab 2 - Fish.Audio TTS */}
        {activeTab === 'fishaudio' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* 1. Fish Audio API Key */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" /> Fish.Audio API Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowFishKey(!showFishKey)}
                  className="text-[10px] font-mono text-slate-400 hover:text-slate-200"
                >
                  {showFishKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showFishKey ? 'text' : 'password'}
                  value={fishAudioApiKey}
                  onChange={(e) => setFishAudioApiKey(e.target.value)}
                  placeholder="sk-fish-..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-800/80 text-sm text-purple-200 font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-purple-400 transition pr-10"
                />
                <Lock className="w-4 h-4 text-purple-500/60 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Get your key at <a href="https://fish.audio/app/developers" target="_blank" rel="noreferrer" className="text-purple-400 underline">fish.audio/app/developers</a>
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

            {/* 4. Test TTS Connection Button */}
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
                  Automatically advance through unsealed votes and -$40 bailout steps.
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

            {/* 3. $40 Capitol Vote Bailout Details Info Card */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex items-start gap-3 text-xs text-emerald-300/90 leading-relaxed font-sans">
              <DollarSign className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-300 text-xs mb-1">
                  YouTube-Ready Bailout Auction System
                </p>
                <p className="text-[11px] text-slate-400">
                  During live vote counting, candidates in 1st place on the chopping block automatically pay $40 to remove 1 elimination vote if they hold funds. GSAP spring tweens animate the floating cash badge and smoothly rearrange leaderboard rankings.
                </p>
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
