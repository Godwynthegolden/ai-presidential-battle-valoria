'use client';

import React, { useState, useEffect } from 'react';
import { Candidate, Archetype, CandidateSvgIcon } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { ImageCropperModal } from './ImageCropperModal';
import { NineRouterConfigState } from './NineRouterSettingsModal';
import { CURATED_VOICES, FishVoiceModel } from '@/services/fishAudio';
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
  Cpu,
  Pipette,
  Volume2,
  VolumeX,
  Play,
  Square,
  Mic,
  Music,
  Radio,
  DollarSign
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

export interface ColorPreset {
  name: string;
  category: 'neon' | 'presidential' | 'warm' | 'earth' | 'noir';
  primary: string;
  bg: string;
  border: string;
  text: string;
  glow: string;
  gradient: string;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { r: 59, g: 130, b: 246 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function createColorTheme(
  hex: string, 
  name: string = 'Custom Color', 
  category: 'neon' | 'presidential' | 'warm' | 'earth' | 'noir' = 'neon'
): ColorPreset {
  const { r, g, b } = hexToRgb(hex);
  return {
    name,
    category,
    primary: hex,
    bg: `rgba(${r}, ${g}, ${b}, 0.14)`,
    border: `rgba(${r}, ${g}, ${b}, 0.55)`,
    text: hex,
    glow: `rgba(${r}, ${g}, ${b}, 0.35)`,
    gradient: 'from-slate-900 via-slate-950 to-slate-950',
  };
}

export const COLOR_PRESETS: ColorPreset[] = [
  // 1. Cyber & Neons (12)
  createColorTheme('#06b6d4', 'Cyber Cyan', 'neon'),
  createColorTheme('#00f0ff', 'Laser Cyan', 'neon'),
  createColorTheme('#3b82f6', 'Electric Azure', 'neon'),
  createColorTheme('#38bdf8', 'Neon Sky', 'neon'),
  createColorTheme('#84cc16', 'Neon Lime', 'neon'),
  createColorTheme('#10b981', 'Matrix Emerald', 'neon'),
  createColorTheme('#22c55e', 'Toxic Green', 'neon'),
  createColorTheme('#d946ef', 'Synthwave Fuchsia', 'neon'),
  createColorTheme('#ec4899', 'Hot Magenta', 'neon'),
  createColorTheme('#f43f5e', 'Pulse Coral', 'neon'),
  createColorTheme('#8b5cf6', 'Hyper Violet', 'neon'),
  createColorTheme('#eab308', 'Solar Yellow', 'neon'),

  // 2. Presidential & Diplomatic (10)
  createColorTheme('#1d4ed8', 'Capitol Navy', 'presidential'),
  createColorTheme('#2563eb', 'Diplomatic Cobalt', 'presidential'),
  createColorTheme('#1e3a8a', 'Midnight Senate', 'presidential'),
  createColorTheme('#9333ea', 'Imperial Purple', 'presidential'),
  createColorTheme('#7c3aed', 'Supreme Violet', 'presidential'),
  createColorTheme('#dc2626', 'Cardinal Red', 'presidential'),
  createColorTheme('#f59e0b', 'Sovereign Amber', 'presidential'),
  createColorTheme('#0d9488', 'Statehouse Teal', 'presidential'),
  createColorTheme('#475569', 'Executive Slate', 'presidential'),
  createColorTheme('#94a3b8', 'Titanium Silver', 'presidential'),

  // 3. Passionate, Militant & Revolutionary (10)
  createColorTheme('#ef4444', 'Crimson Flame', 'warm'),
  createColorTheme('#b91c1c', 'Guerilla Crimson', 'warm'),
  createColorTheme('#ea580c', 'Blood Orange', 'warm'),
  createColorTheme('#f97316', 'Sunset Tangerine', 'warm'),
  createColorTheme('#fb923c', 'Molten Amber', 'warm'),
  createColorTheme('#e11d48', 'Radical Scarlet', 'warm'),
  createColorTheme('#c2410c', 'Rust Terracotta', 'warm'),
  createColorTheme('#9f1239', 'Deep Burgundy', 'warm'),
  createColorTheme('#881337', 'Midnight Wine', 'warm'),
  createColorTheme('#be123c', 'Ruby Blaze', 'warm'),

  // 4. Nature, Ecological & Earth (10)
  createColorTheme('#15803d', 'Forest Pine', 'earth'),
  createColorTheme('#059669', 'Boreal Green', 'earth'),
  createColorTheme('#14b8a6', 'Jade Mint', 'earth'),
  createColorTheme('#0ea5e9', 'Arctic Ice', 'earth'),
  createColorTheme('#0284c7', 'Glacial Ocean', 'earth'),
  createColorTheme('#65a30d', 'Tactical Olive', 'earth'),
  createColorTheme('#4d7c0f', 'Moss Khaki', 'earth'),
  createColorTheme('#b45309', 'Desert Bronze', 'earth'),
  createColorTheme('#a16207', 'Earth Ochre', 'earth'),
  createColorTheme('#78350f', 'Roasted Umber', 'earth'),

  // 5. Cyber Noir & Velvet Shadow (6)
  createColorTheme('#334155', 'Obsidian Gunmetal', 'noir'),
  createColorTheme('#1e293b', 'Shadow Slate', 'noir'),
  createColorTheme('#7e22ce', 'Deep Amethyst', 'noir'),
  createColorTheme('#581c87', 'Velvet Plum', 'noir'),
  createColorTheme('#6366f1', 'Electric Indigo', 'noir'),
  createColorTheme('#4c1d95', 'Abyssal Violet', 'noir'),
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

  // Color Filter & Custom Picker state
  const [colorCategory, setColorCategory] = useState<'all' | 'neon' | 'presidential' | 'warm' | 'earth' | 'noir'>('all');
  const [customColorHex, setCustomColorHex] = useState('#3b82f6');

  // TTS Voice & Audio state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [testAudioError, setTestAudioError] = useState<string | null>(null);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceCategoryFilter, setVoiceCategoryFilter] = useState<'all' | 'male' | 'female'>('all');
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // Candidate Form State
  const [form, setForm] = useState<Candidate>(() => {
    const defaultVoice = CURATED_VOICES[0];
    if (candidateToEdit) {
      return {
        ...candidateToEdit,
        voice: candidateToEdit.voice || {
          voiceId: defaultVoice.id,
          voiceName: defaultVoice.name,
          gender: defaultVoice.gender,
          category: defaultVoice.category,
        }
      };
    }
    return {
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
      voice: {
        voiceId: defaultVoice.id,
        voiceName: defaultVoice.name,
        gender: defaultVoice.gender,
        category: defaultVoice.category,
      },
      systemPrompt: 'You are a bold presidential contender in the Republic of Valoria. Speak with authenticity, intelligence, and conviction.',
      isCustom: true,
    };
  });

  // Sync form when candidateToEdit changes
  useEffect(() => {
    const defaultVoice = CURATED_VOICES[0];
    if (candidateToEdit) {
      setForm({
        ...candidateToEdit,
        voice: candidateToEdit.voice || {
          voiceId: defaultVoice.id,
          voiceName: defaultVoice.name,
          gender: defaultVoice.gender,
          category: defaultVoice.category,
        }
      });
      setCustomColorHex(candidateToEdit.color.primary || '#3b82f6');
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
        voice: {
          voiceId: defaultVoice.id,
          voiceName: defaultVoice.name,
          gender: defaultVoice.gender,
          category: defaultVoice.category,
        },
        systemPrompt: 'You are a bold presidential contender in the Republic of Valoria. Speak with authenticity, intelligence, and conviction.',
        isCustom: true,
      });
      setCustomColorHex(COLOR_PRESETS[0].primary);
      setActiveTab('ai_generate');
    }
  }, [candidateToEdit, isOpen]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  const handleTestVoice = async (voiceId: string, customText?: string) => {
    try {
      setTestAudioError(null);
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      setPlayingVoiceId(voiceId);
      setIsPlayingAudio(true);

      const text = customText || form.slogan || `I am ${form.name}, and I fight for the people of Valoria!`;
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to generate voice audio`);
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        setPlayingVoiceId(null);
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        setPlayingVoiceId(null);
      };

      await audio.play();
    } catch (err: any) {
      console.error('[TTS Test Error]:', err);
      setTestAudioError(err.message || 'Failed to synthesize voice sample');
      setIsPlayingAudio(false);
      setPlayingVoiceId(null);
    }
  };

  const handleStopAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setIsPlayingAudio(false);
    setPlayingVoiceId(null);
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomColorHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex) || /^#[0-9A-Fa-f]{3}$/.test(hex)) {
      const generated = createColorTheme(hex, 'Custom Theme');
      setForm(prev => ({ ...prev, color: generated }));
    }
  };

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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black transition ${
                  activeTab === 'editor'
                    ? 'bg-cyan-500 text-black shadow'
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
                  className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
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
              <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-cyan-500/40 shadow-xs">
                  {form.codename}
                </span>
                <span 
                  className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: `${form.color.primary}18`,
                    color: form.color.primary,
                    borderColor: `${form.color.primary}55`
                  }}
                >
                  {form.archetypeTitle}
                </span>
              </div>
              <span className="text-sm font-bold text-white mt-0.5">{form.name}</span>
              <span className="text-xs text-slate-400 font-mono text-center">{form.titleRole}</span>

              {/* Active Voice Model Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-[10px] font-mono text-purple-300 mt-1 shadow-xs">
                <Mic className="w-3 h-3 text-purple-400" />
                <span className="truncate max-w-[170px] font-bold">
                  Voice: {form.voice?.voiceName || 'Custom'}
                </span>
                {isPlayingAudio && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                )}
              </div>
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

            {/* Color Palette Presets & Custom Picker */}
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-850">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Color Theme ({COLOR_PRESETS.length} Colors):</span>
                </label>
                <div 
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold" 
                  style={{ color: form.color.primary }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: form.color.primary }} />
                  <span className="truncate max-w-[120px]">{form.color.name || form.color.primary}</span>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono py-0.5 custom-scrollbar">
                {[
                  { id: 'all', label: `All (${COLOR_PRESETS.length})` },
                  { id: 'neon', label: '⚡ Neons' },
                  { id: 'presidential', label: '🏛️ Presidential' },
                  { id: 'warm', label: '🔥 Warm & Red' },
                  { id: 'earth', label: '🌿 Earth & Green' },
                  { id: 'noir', label: '🌌 Cyber Noir' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setColorCategory(cat.id as any)}
                    className={`px-2 py-0.5 rounded-md transition whitespace-nowrap ${
                      colorCategory === cat.id
                        ? 'bg-cyan-500 text-black font-black shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid of Color Swatches */}
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-950/90 rounded-xl border border-slate-800/80 custom-scrollbar">
                {(colorCategory === 'all' ? COLOR_PRESETS : COLOR_PRESETS.filter(p => p.category === colorCategory)).map((preset, idx) => {
                  const isSelected = form.color.primary?.toLowerCase() === preset.primary.toLowerCase();
                  return (
                    <button
                      key={preset.primary + idx}
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, color: preset }));
                        setCustomColorHex(preset.primary);
                      }}
                      className={`h-7 rounded-lg transition-all border flex items-center justify-center relative hover:scale-110 active:scale-95 ${
                        isSelected
                          ? 'border-white ring-2 ring-cyan-400 scale-105 z-10'
                          : 'border-slate-800/80 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: preset.primary }}
                      title={`${preset.name} (${preset.primary})`}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input / Droplet Picker */}
              <div className="flex items-center gap-2 pt-1.5 border-t border-slate-900">
                <label className="text-[10px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                  <Pipette className="w-3 h-3 text-cyan-400" /> Custom Hex:
                </label>
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer shadow-sm">
                    <input
                      type="color"
                      value={form.color.primary?.startsWith('#') ? form.color.primary : '#3b82f6'}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer border-0 p-0"
                      title="Choose custom color from wheel"
                    />
                  </div>
                  <input
                    type="text"
                    value={customColorHex}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 uppercase"
                  />
                </div>
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
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-display font-bold"
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
                  placeholder="e.g. Founder & CEO of Apex Dynamics"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Row 2: Codename & Archetype Title Badges (Directly Editable) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-cyan-500/30">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-bold text-cyan-300 flex items-center justify-between">
                  <span>Codename / Call-Sign Badge:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Top Header Badge)</span>
                </label>
                <input
                  type="text"
                  value={form.codename}
                  onChange={(e) => setForm(prev => ({ ...prev, codename: e.target.value }))}
                  placeholder="e.g. THE_HYPER_CAPITALIST_DISRUPTOR_8377"
                  className="bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 uppercase tracking-wider"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                  <span>Archetype Persona Title:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(e.g. INDIE TECH TYCOON)</span>
                </label>
                <input
                  type="text"
                  value={form.archetypeTitle}
                  onChange={(e) => setForm(prev => ({ ...prev, archetypeTitle: e.target.value }))}
                  placeholder="e.g. INDIE TECH TYCOON"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 uppercase"
                />
              </div>
            </div>

            {/* Row 3: Political Archetype & Slogan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Political Archetype Class:
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

            {/* Row 3.5: Campaign Treasury & War Chest ($ Dollars) */}
            <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-emerald-200 uppercase tracking-wider">
                      Campaign War Chest ($ Dollars)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Used for $20 CCTV backroom bribes and $40 post-vote bailout vote buyouts.
                    </p>
                  </div>
                </div>

                {/* Live Current Value Pill */}
                <div className="px-3 py-1 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-xs font-mono font-bold text-emerald-300 shadow-sm shadow-emerald-950/50">
                  ${form.initialBudget ?? 100}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { value: 80, label: '$80 (Grassroots)', desc: '2 Bailouts / 4 Bribes' },
                  { value: 100, label: '$100 (Standard)', desc: '2 Bailouts + 1 Bribe' },
                  { value: 120, label: '$120 (War Chest)', desc: '3 Bailouts / 6 Bribes' },
                ].map((tier) => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, initialBudget: tier.value }))}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-mono transition-all duration-200 border ${
                      (form.initialBudget ?? 100) === tier.value
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-950/50 font-bold scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{tier.label}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">{tier.desc}</span>
                  </button>
                ))}
              </div>
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

            {/* Row 5: Voice & Speech Audio (Fish.Audio TTS) */}
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-purple-950/20 border border-purple-900/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-700/60 text-purple-300">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                      Character Voice &amp; Speech (Fish.Audio TTS)
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Choose the acoustic model and speech persona for debate dialogues and speeches.
                    </p>
                  </div>
                </div>

                {/* Currently Assigned Voice Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-purple-500/40 text-xs font-mono">
                  <span className="text-slate-400 text-[11px]">Selected:</span>
                  <span className="text-purple-300 font-bold">{form.voice?.voiceName || 'Custom Voice'}</span>
                  {isPlayingAudio && (
                    <button
                      type="button"
                      onClick={handleStopAudio}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-950/80 text-red-300 border border-red-700 text-[10px] hover:bg-red-900 transition cursor-pointer"
                      title="Stop Audio Preview"
                    >
                      <Square className="w-2.5 h-2.5 fill-red-400 text-red-400" />
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </div>

              {testAudioError && (
                <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-xs font-mono text-red-300 flex items-center justify-between">
                  <span>⚠️ {testAudioError}</span>
                  <button
                    type="button"
                    onClick={() => setTestAudioError(null)}
                    className="text-red-400 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Search & Gender Filters */}
              <div className="flex items-center gap-2 flex-wrap justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-400">Filter:</span>
                  {(['all', 'male', 'female'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setVoiceCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition capitalize ${
                        voiceCategoryFilter === cat
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search voices by name, role..."
                  value={voiceSearch}
                  onChange={(e) => setVoiceSearch(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono w-48"
                />
              </div>

              {/* Curated Voice Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {CURATED_VOICES
                  .filter(v => voiceCategoryFilter === 'all' || v.gender === voiceCategoryFilter)
                  .filter(v => !voiceSearch.trim() || 
                    v.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                    v.category.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                    v.description.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                    v.tags.some(t => t.toLowerCase().includes(voiceSearch.toLowerCase()))
                  )
                  .map(v => {
                    const isSelected = form.voice?.voiceId === v.id;
                    const isVoicePlaying = isPlayingAudio && playingVoiceId === v.id;

                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            voice: {
                              voiceId: v.id,
                              voiceName: v.name,
                              gender: v.gender,
                              category: v.category,
                            }
                          }));
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-left ${
                          isSelected
                            ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-950/40'
                            : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white">{v.name}</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                                v.gender === 'female' 
                                  ? 'bg-pink-950/70 text-pink-300 border border-pink-700/60' 
                                  : 'bg-blue-950/70 text-blue-300 border border-blue-700/60'
                              }`}>
                                {v.gender}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-purple-300/80 block mt-0.5">
                              {v.category}
                            </span>
                          </div>

                          {/* Test Voice Audio Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isVoicePlaying) {
                                handleStopAudio();
                              } else {
                                handleTestVoice(v.id, v.sampleText);
                              }
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shrink-0 cursor-pointer ${
                              isVoicePlaying
                                ? 'bg-red-900 text-white animate-pulse'
                                : isSelected
                                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                            title="Play sample line in this voice"
                          >
                            {isVoicePlaying ? (
                              <>
                                <Square className="w-3 h-3 fill-white" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>Test</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {v.description}
                        </p>
                      </div>
                    );
                  })}
              </div>

              {/* Custom Voice ID Input */}
              <div className="pt-2 border-t border-purple-900/40 flex flex-col sm:flex-row items-center gap-2">
                <div className="flex-1 w-full flex flex-col gap-1">
                  <label className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Custom Fish.Audio Model Reference ID:</span>
                    <span className="text-[10px] text-purple-400">Paste any voice ID from fish.audio</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5196af35f6ff4a0dbf541793fc9f2157"
                    value={form.voice?.voiceId || ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const matched = CURATED_VOICES.find(c => c.id === val);
                      setForm(prev => ({
                        ...prev,
                        voice: {
                          voiceId: val,
                          voiceName: matched ? matched.name : (prev.voice?.voiceName || 'Custom Model ID'),
                          gender: matched?.gender,
                          category: matched?.category || 'Custom',
                        }
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-purple-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleTestVoice(form.voice?.voiceId || CURATED_VOICES[0].id, form.slogan)}
                  disabled={!form.voice?.voiceId}
                  className="w-full sm:w-auto mt-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-mono font-bold transition shadow-md shadow-purple-900/40 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  title="Generate audio speech of candidate slogan using selected voice"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Audition Slogan</span>
                </button>
              </div>
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
