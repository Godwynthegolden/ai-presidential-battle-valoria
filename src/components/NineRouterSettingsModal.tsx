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
  Lock
} from 'lucide-react';

export interface NineRouterConfigState {
  baseUrl: string;
  apiKey: string;
  model: string;
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
  const [baseUrl, setBaseUrl] = useState(currentConfig.baseUrl || 'http://localhost:20128/v1');
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [model, setModel] = useState(currentConfig.model || 'gpt-4o-mini');
  const [showKey, setShowKey] = useState(false);

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
      setStatusMessage({ type: 'idle', text: '' });
    }
  }, [isOpen, currentConfig]);

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
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                9router Configuration
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Required
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Connect your local or hosted 9router OpenAI-compatible endpoint.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
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
                <div className="max-h-36 overflow-y-auto flex flex-wrap gap-1.5 pr-1 custom-scrollbar">
                  {filteredModels.map((mId) => (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => setModel(mId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition text-left ${
                        model === mId
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
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
        </div>

        {/* Modal Footer / Save Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Saved locally in session
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
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
