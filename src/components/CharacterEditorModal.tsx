'use client';

import React, { useState, useEffect } from 'react';
import { Candidate, Archetype, CandidateSvgIcon } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { ImageCropperModal } from './ImageCropperModal';
import { NineRouterConfigState } from './NineRouterSettingsModal';
import { 
  X, 
  Sparkles, 
  Wand2, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Save, 
  Check, 
  Layers, 
  Palette, 
  Terminal, 
  User, 
  HelpCircle,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Cpu
} from 'lucide-react';

const SVG_ICONS: Array<{ type: CandidateSvgIcon; label: string }> = [
  { type: 'landmark', label: 'Landmark' },
  { type: 'scale', label: 'Scale' },
  { type: 'shield', label: 'Shield' },
  { type: 'dollar', label: 'Dollar' },
  { type: 'cpu', label: 'Tech CPU' },
  { type: 'hammer', label: 'Labor Hammer' },
  { type: 'leaf', label: 'Ecology Leaf' },
  { type: 'eye', label: 'Watchful Eye' },
  { type: 'flame', label: 'Torch / Flame' },
  { type: 'zap', label: 'Lightning Zap' },
  { type: 'crown', label: 'Crown' },
  { type: 'globe', label: 'Globe' },
  { type: 'swords', label: 'Swords' },
  { type: 'radio', label: 'Surveillance / Radio' },
  { type: 'award', label: 'Medal / Award' },
  { type: 'activity', label: 'Pulse / Activity' },
  { type: 'star', label: 'Star' },
  { type: 'building', label: 'Corporate Tower' },
  { type: 'users', label: 'Grassroots Users' },
  { type: 'briefcase', label: 'Briefcase' },
];

const COLOR_PRESETS = [
  { name: 'Azure Blue', primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.5)', text: '#60a5fa', glow: 'rgba(59, 130, 246, 0.3)', gradient: 'from-blue-600/20 to-slate-900' },
  { name: 'Emerald Green', primary: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.5)', text: '#34d399', glow: 'rgba(16, 185, 129, 0.3)', gradient: 'from-emerald-600/20 to-slate-900' },
  { name: 'Crimson Red', primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.5)', text: '#f87171', glow: 'rgba(239, 68, 68, 0.3)', gradient: 'from-red-600/20 to-slate-900' },
  { name: 'Royal Purple', primary: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.5)', text: '#c084fc', glow: 'rgba(168, 85, 247, 0.3)', gradient: 'from-purple-600/20 to-slate-900' },
  { name: 'Amber Gold', primary: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.5)', text: '#fbbf24', glow: 'rgba(245, 158, 11, 0.3)', gradient: 'from-amber-600/20 to-slate-900' },
  { name: 'Cyber Cyan', primary: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.5)', text: '#22d3ee', glow: 'rgba(6, 182, 212, 0.3)', gradient: 'from-cyan-600/20 to-slate-900' },
  { name: 'Rose Pink', primary: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.5)', text: '#fb7185', glow: 'rgba(244, 63, 94, 0.3)', gradient: 'from-rose-600/20 to-slate-900' },
  { name: 'Obsidian Slate', primary: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.5)', text: '#cbd5e1', glow: 'rgba(148, 163, 184, 0.3)', gradient: 'from-slate-600/20 to-slate-900' },
];

const ARCHETYPES: Array<{ id: Archetype; label: string }> = [
  { id: 'populist', label: 'Populist' },
  { id: 'technocrat', label: 'Technocrat' },
  { id: 'hawk', label: 'Hawk' },
  { id: 'reformer', label: 'Reformer' },
  { id: 'capitalist', label: 'Capitalist' },
  { id: 'socialist', label: 'Labor / Socialist' },
  { id: 'environmentalist', label: 'Environmentalist' },
  { id: 'conspiracy', label: 'Investigative' },
  { id: 'careerist', label: 'Careerist Politician' },
  { id: 'traditionalist', label: 'Traditionalist / Jurist' },
  { id: 'wildcard', label: 'Wildcard Provocateur' },
];

interface CharacterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateToEdit?: Candidate | null;
  onSaveCandidate: (candidate: Candidate) => void;
  onDeleteCandidate?: (candidateId: string) => void;
  onResetCandidateToDefault?: (candidateId: string) => void;
  nineRouterConfig?: NineRouterConfigState;
}

export const CharacterEditorModal: React.FC<CharacterEditorModalProps> = ({
  isOpen,
  onClose,
  candidateToEdit,
  onSaveCandidate,
  onDeleteCandidate,
  onResetCandidateToDefault,
  nineRouterConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'ai_generate'>('editor');
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(nineRouterConfig?.model || '');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Candidate Form State
  const [form, setForm] = useState<Candidate>(() => candidateToEdit || {
    id: `custom_${Date.now()}`,
    name: 'New Presidential Contender',
    codename: 'new_contender',
    archetype: 'populist',
    archetypeTitle: 'Grassroots Reformer',
    titleRole: 'Independent Candidate',
    slogan: 'A Bold New Voice for the Republic of Valoria',
    ideology: 'Direct democracy and anti-establishment reform.',
    personality: 'Charismatic, outspoken, and strategic.',
    speakingStyle: 'Passionate, direct, and populist.',
    motivations: 'To dismantle backroom political machines.',
    strengths: ['Public speaking', 'Grassroots organizing'],
    weaknesses: ['Stubborn', 'Impatient with compromise'],
    behavioralTendencies: ['Calls out corruption directly'],
    rivalArchetypes: ['careerist', 'capitalist'],
    color: COLOR_PRESETS[0],
    avatar: {
      icon: 'User',
      svgType: 'landmark',
    },
    systemPrompt: 'You are a bold presidential contender in the Republic of Valoria. Speak with authenticity, intelligence, and conviction.',
    isCustom: true,
  });

  // Sync form when candidateToEdit changes
  useEffect(() => {
    if (candidateToEdit) {
      setForm(candidateToEdit);
    } else {
      setForm({
        id: `custom_${Date.now()}`,
        name: 'New Presidential Contender',
        codename: 'new_contender',
        archetype: 'populist',
        archetypeTitle: 'Grassroots Reformer',
        titleRole: 'Independent Candidate',
        slogan: 'A Bold New Voice for the Republic of Valoria',
        ideology: 'Direct democracy and anti-establishment reform.',
        personality: 'Charismatic, outspoken, and strategic.',
        speakingStyle: 'Passionate, direct, and populist.',
        motivations: 'To dismantle backroom political machines.',
        strengths: ['Public speaking', 'Grassroots organizing'],
        weaknesses: ['Stubborn', 'Impatient with compromise'],
        behavioralTendencies: ['Calls out corruption directly'],
        rivalArchetypes: ['careerist', 'capitalist'],
        color: COLOR_PRESETS[0],
        avatar: {
          icon: 'User',
          svgType: 'landmark',
        },
        systemPrompt: 'You are a bold presidential contender in the Republic of Valoria. Speak with authenticity, intelligence, and conviction.',
        isCustom: true,
      });
      setActiveTab('ai_generate');
    }
  }, [candidateToEdit, isOpen]);

  // Fetch available models from 9router
  const fetchModels = async () => {
    if (!nineRouterConfig?.baseUrl) {
      setFetchModelsError('9router Base URL not set. Please configure in Settings.');
      return;
    }

    setIsFetchingModels(true);
    setFetchModelsError(null);

    try {
      const res = await fetch(`/api/models?baseUrl=${encodeURIComponent(nineRouterConfig.baseUrl)}&apiKey=${encodeURIComponent(nineRouterConfig.apiKey || '')}`);
      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Invalid response from /api/models: ${rawText.slice(0, 100)}`);
      }

      if (data.models && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        if (!selectedModel || !data.models.includes(selectedModel)) {
          setSelectedModel(nineRouterConfig.model && data.models.includes(nineRouterConfig.model) ? nineRouterConfig.model : data.models[0]);
        }
      } else {
        setFetchModelsError(data.error || 'No models returned by 9router endpoint.');
      }
    } catch (err: any) {
      setFetchModelsError(err.message || 'Failed to connect to 9router /api/models.');
    } finally {
      setIsFetchingModels(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen, nineRouterConfig?.baseUrl, nineRouterConfig?.apiKey]);

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      setGenerateError('Please enter a character description or concept.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch('/api/llm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_character',
          candidateId: 'generator',
          round: 1,
          activeCandidateIds: [],
          customPrompt: aiPrompt,
          config: nineRouterConfig ? {
            baseUrl: nineRouterConfig.baseUrl,
            apiKey: nineRouterConfig.apiKey,
            model: selectedModel || nineRouterConfig.model,
          } : undefined,
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Invalid response from AI generation server: ${rawText.slice(0, 100)}`);
      }

      if (!res.ok || !data.candidateProfile) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to generate candidate.`);
      }

      setForm(prev => ({
        ...prev,
        ...data.candidateProfile,
        id: prev.isCustom ? prev.id : data.candidateProfile.id,
        isCustom: true,
      }));
      setActiveTab('editor');
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate character with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    onSaveCandidate(form);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl p-5 md:p-7 shadow-2xl flex flex-col gap-5 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <CandidateAvatar candidate={form} size="sm" showBadge={false} />
            <div>
              <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                {candidateToEdit ? `Edit: ${form.name}` : 'Create Political Contender'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Customize candidate persona, SVG/photo avatar, political dossier, and AI behavior.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  activeTab === 'editor'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Parameter Editor
              </button>
              <button
                onClick={() => setActiveTab('ai_generate')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  activeTab === 'ai_generate'
                    ? 'bg-purple-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" /> AI Generator
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: AI Generator */}
        {activeTab === 'ai_generate' && (
          <div className="flex flex-col gap-5 p-4 rounded-2xl bg-purple-950/20 border border-purple-900/40">
            <div className="flex items-start justify-between">
              <div>
                <span className="flex items-center gap-1.5 text-sm font-bold text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-400" /> AI Political Dossier Generator
                </span>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Describe any candidate concept, and 9router will generate their full political ideology, slogan, and debate persona.
                </p>
              </div>
            </div>

            {/* Model Selection Dropdown */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>9router AI Model for Character Creation:</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-purple-400 font-mono">
                    {isFetchingModels ? 'Fetching from 9router...' : `${availableModels.length} models loaded`}
                  </span>
                  <button
                    type="button"
                    onClick={fetchModels}
                    disabled={isFetchingModels}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-white border border-slate-800 transition"
                    title="Refresh 9router models list"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {isFetchingModels ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>Loading live model catalog from 9router...</span>
                </div>
              ) : availableModels.length > 0 ? (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500 font-bold"
                >
                  {availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/80 text-xs font-mono text-red-300 flex items-center justify-between">
                  <span>⚠️ {fetchModelsError || 'No models returned from 9router. Please verify 9router connection.'}</span>
                  <button
                    type="button"
                    onClick={fetchModels}
                    className="px-2 py-1 rounded bg-red-900/50 hover:bg-red-800 text-[10px] text-white underline font-bold"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Prompt Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-slate-300">
                Candidate Concept &amp; Background Idea:
              </label>
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. A 40-year-old brilliant biotech entrepreneur and neuroscientist who promises to eradicate all disease and automate governance in Valoria..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 mr-1">Quick Ideas:</span>
              {[
                'Charismatic Cyber Hacker & Free Speech Pirate',
                'Hardline Retired Naval Admiral & Border Hawk',
                'Billionaire Clean Energy Pioneer & Space Tycoon',
                'Underground Investigative Journalist & Whistleblower',
                'Constitutional Supreme Court Justice & Anti-Corruption Crusader',
              ].map((pill, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAiPrompt(pill)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-purple-900/40 text-slate-400 hover:text-purple-200 border border-slate-800 transition"
                >
                  {pill}
                </button>
              ))}
            </div>

            {generateError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs font-mono text-red-300">
                ⚠️ {generateError}
              </div>
            )}

            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-purple-600/30 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Dossier via 9router ({selectedModel})...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Character Dossier
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Parameter Editor */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Visual Avatar & Palette (4 Cols) */}
          <div className="md:col-span-4 flex flex-col gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" /> Visual Identity
            </span>

            {/* Avatar Preview */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-2xl border border-slate-800 gap-2">
              <CandidateAvatar candidate={form} size="lg" isSpeaking={true} />
              <span className="text-sm font-bold text-white mt-1">{form.name}</span>
              <span className="text-xs text-slate-400 font-mono">{form.titleRole}</span>
            </div>

            {/* Custom Photo Upload & Crop Button */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-mono font-bold text-slate-400">
                Custom Photo / Avatar:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCropperOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-mono font-bold border border-cyan-800 transition shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {form.customAvatarUrl ? 'Change / Crop Photo' : 'Upload & Crop Photo'}
                </button>

                {form.customAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, customAvatarUrl: undefined }))}
                    className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800 transition"
                    title="Remove Photo and use SVG Icon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* SVG Icon Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-400">
                Built-in SVG Icon:
              </label>
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800 custom-scrollbar">
                {SVG_ICONS.map(icon => (
                  <button
                    key={icon.type}
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      avatar: { ...prev.avatar, svgType: icon.type }
                    }))}
                    className={`p-2 rounded-lg flex flex-col items-center justify-center transition border ${
                      form.avatar.svgType === icon.type && !form.customAvatarUrl
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                    title={icon.label}
                  >
                    <CandidateAvatar candidate={{ ...form, avatar: { ...form.avatar, svgType: icon.type } }} size="sm" showBadge={false} />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette Presets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono font-bold text-slate-400">
                Color Theme:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {COLOR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, color: preset }))}
                    className={`h-7 rounded-lg transition border flex items-center justify-center ${
                      form.color.primary === preset.primary
                        ? 'border-white ring-2 ring-cyan-400 scale-105'
                        : 'border-slate-800'
                    }`}
                    style={{ backgroundColor: preset.primary }}
                    title={preset.name}
                  >
                    {form.color.primary === preset.primary && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Political Dossier & Prompt Fields (8 Cols) */}
          <div className="md:col-span-8 flex flex-col gap-4">
            {/* Row 1: Name & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Full Candidate Name:
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Title &amp; Role:
                </label>
                <input
                  type="text"
                  value={form.titleRole}
                  onChange={(e) => setForm(prev => ({ ...prev, titleRole: e.target.value }))}
                  placeholder="e.g. Rust-Belt Populist Governor"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Row 2: Archetype & Slogan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Political Archetype:
                </label>
                <select
                  value={form.archetype}
                  onChange={(e) => setForm(prev => ({ ...prev, archetype: e.target.value as Archetype }))}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                >
                  {ARCHETYPES.map(a => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Campaign Slogan (Max 10 words):
                </label>
                <input
                  type="text"
                  value={form.slogan}
                  onChange={(e) => setForm(prev => ({ ...prev, slogan: e.target.value }))}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 italic"
                />
              </div>
            </div>

            {/* Row 3: Political Philosophy / Ideology */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-bold text-slate-300">
                Political Ideology &amp; Platform:
              </label>
              <input
                type="text"
                value={form.ideology}
                onChange={(e) => setForm(prev => ({ ...prev, ideology: e.target.value }))}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Row 4: System Prompt / AI Debate Instructions */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-bold text-cyan-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> AI Personality &amp; Debate Prompt Instructions:
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Controls speeches, attacks, and backroom pacts)
                </span>
              </label>
              <textarea
                rows={4}
                value={form.systemPrompt}
                onChange={(e) => setForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500 leading-relaxed custom-scrollbar"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {candidateToEdit && onResetCandidateToDefault && !candidateToEdit.isCustom && (
              <button
                type="button"
                onClick={() => {
                  onResetCandidateToDefault(candidateToEdit.id);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono transition border border-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Valoria Defaults
              </button>
            )}

            {candidateToEdit && onDeleteCandidate && candidateToEdit.isCustom && (
              <button
                type="button"
                onClick={() => {
                  onDeleteCandidate(candidateToEdit.id);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-mono transition border border-red-800"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Character
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono transition border border-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/25"
            >
              <Save className="w-4 h-4" /> Save Candidate
            </button>
          </div>
        </div>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        initialImageUrl={form.customAvatarUrl}
        onCropComplete={(croppedUrl) => {
          setForm(prev => ({
            ...prev,
            customAvatarUrl: croppedUrl,
          }));
        }}
      />
    </div>
  );
};
