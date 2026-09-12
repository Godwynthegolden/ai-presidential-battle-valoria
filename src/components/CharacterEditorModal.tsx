'use client';

import React, { useState, useEffect } from 'react';
import { Candidate, Archetype, CandidateSvgIcon } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { ImageCropperModal } from './ImageCropperModal';
import { NineRouterConfigState } from './NineRouterSettingsModal';
import { CURATED_VOICES, FishVoiceModel } from '@/services/fishAudio';
import { getDefaultIntroductionDialogue } from '@/data/candidates';
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
  DollarSign,
  Film,
  Link,
  FileImage
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
  const [playingVoiceKey, setPlayingVoiceKey] = useState<string | null>(null);
  const [loadingVoiceKey, setLoadingVoiceKey] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [testAudioError, setTestAudioError] = useState<string | null>(null);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [voiceCategoryFilter, setVoiceCategoryFilter] = useState<string>('all');
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = React.useRef<string | null>(null);

  // Full-body portrait upload state
  const [isUploadingFullBody, setIsUploadingFullBody] = useState(false);
  const [fullBodyUploadError, setFullBodyUploadError] = useState<string | null>(null);
  const [showFullBodyUrlInput, setShowFullBodyUrlInput] = useState(false);
  const [fullBodyUrlValue, setFullBodyUrlValue] = useState('');
  const fullBodyInputRef = React.useRef<HTMLInputElement | null>(null);

  // Candidate Form State
  const [form, setForm] = useState<Candidate>(() => {
    const defaultVoice = CURATED_VOICES[0];
    if (candidateToEdit) {
      return {
        ...candidateToEdit,
        fullBodyImageUrl: candidateToEdit.fullBodyImageUrl,
        introductionDialogue: candidateToEdit.introductionDialogue || getDefaultIntroductionDialogue(candidateToEdit),
        voice: candidateToEdit.voice || {
          voiceId: defaultVoice.id,
          voiceName: defaultVoice.name,
          gender: defaultVoice.gender,
          category: defaultVoice.category,
          speed: 1.0,
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
        speed: 1.0,
      },
      introductionDialogue: 'I am a new presidential contender in the Republic of Valoria. Together we will restore true democratic power to the people!',
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
        fullBodyImageUrl: candidateToEdit.fullBodyImageUrl,
        introductionDialogue: candidateToEdit.introductionDialogue || getDefaultIntroductionDialogue(candidateToEdit),
        voice: candidateToEdit.voice || {
          voiceId: defaultVoice.id,
          voiceName: defaultVoice.name,
          gender: defaultVoice.gender,
          category: defaultVoice.category,
          speed: 1.0,
        }
      });
      setCustomColorHex(candidateToEdit.color.primary || '#3b82f6');
      setFullBodyUrlValue(candidateToEdit.fullBodyImageUrl || '');
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
          speed: 1.0,
        },
        introductionDialogue: 'I am a new presidential contender in the Republic of Valoria. Together we will restore true democratic power to the people!',
        systemPrompt: 'You are a bold presidential contender in the Republic of Valoria. Speak with authenticity, intelligence, and conviction.',
        isCustom: true,
      });
      setCustomColorHex(COLOR_PRESETS[0].primary);
      setFullBodyUrlValue('');
      setActiveTab('ai_generate');
    }
  }, [candidateToEdit, isOpen]);

  const handleFullBodyFile = async (file: File) => {
    if (!file) return;
    setIsUploadingFullBody(true);
    setFullBodyUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('candidateId', form.id || 'candidate');

      const res = await fetch('/api/candidates/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setForm(prev => ({ ...prev, fullBodyImageUrl: data.url }));
          setFullBodyUrlValue(data.url);
          setIsUploadingFullBody(false);
          return;
        }
      }

      // Fallback to FileReader base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target?.result as string;
        setForm(prev => ({ ...prev, fullBodyImageUrl: base64Url }));
        setFullBodyUrlValue('');
        setIsUploadingFullBody(false);
      };
      reader.onerror = () => {
        setFullBodyUploadError('Failed to read image file');
        setIsUploadingFullBody(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.warn('[Full body upload server error, falling back to base64]:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target?.result as string;
        setForm(prev => ({ ...prev, fullBodyImageUrl: base64Url }));
        setFullBodyUrlValue('');
        setIsUploadingFullBody(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Cleanup audio on unmount or close
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.src = '';
        } catch {}
        activeAudioRef.current = null;
      }
      if (activeAudioUrlRef.current) {
        try { URL.revokeObjectURL(activeAudioUrlRef.current); } catch {}
        activeAudioUrlRef.current = null;
      }
    };
  }, []);

  const handleStopAudio = () => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      } catch {}
      activeAudioRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      try { URL.revokeObjectURL(activeAudioUrlRef.current); } catch {}
      activeAudioUrlRef.current = null;
    }
    setIsPlayingAudio(false);
    setPlayingVoiceKey(null);
    setLoadingVoiceKey(null);
  };

  const handleTestVoice = async (voiceId: string, voiceKey: string, customText?: string) => {
    try {
      setTestAudioError(null);

      // Stop if already playing this exact voice
      if (playingVoiceKey === voiceKey) {
        handleStopAudio();
        return;
      }

      handleStopAudio();
      setLoadingVoiceKey(voiceKey);

      const targetVoiceId = voiceId?.trim() || CURATED_VOICES[0].id;
      const text = (customText && customText.trim()) || 
                   (form.slogan && form.slogan.trim()) || 
                   `I am ${form.name || 'a presidential contender'}, and I fight for the people of the Republic of Valoria!`;

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: targetVoiceId,
          apiKey: nineRouterConfig?.fishAudioApiKey,
          model: nineRouterConfig?.fishAudioModel || 's2.1-pro-free',
          speed: form.voice?.speed || 1.0,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to generate voice audio`);
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      activeAudioUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        setPlayingVoiceKey(null);
        if (activeAudioUrlRef.current) {
          try { URL.revokeObjectURL(activeAudioUrlRef.current); } catch {}
          activeAudioUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        setPlayingVoiceKey(null);
        if (activeAudioUrlRef.current) {
          try { URL.revokeObjectURL(activeAudioUrlRef.current); } catch {}
          activeAudioUrlRef.current = null;
        }
      };

      setLoadingVoiceKey(null);
      setPlayingVoiceKey(voiceKey);
      setIsPlayingAudio(true);

      await audio.play().catch(playErr => {
        if (playErr.name !== 'AbortError') {
          console.warn('[Audio Play Error]:', playErr);
        }
      });
    } catch (err: any) {
      console.error('[TTS Test Error]:', err);
      setTestAudioError(err.message || 'Failed to synthesize voice sample');
      handleStopAudio();
    }
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
    handleStopAudio();
    const defaultVoice = CURATED_VOICES[0];
    const sanitizedVoice = {
      voiceId: form.voice?.voiceId?.trim() || defaultVoice.id,
      voiceName: form.voice?.voiceName?.trim() || defaultVoice.name,
      gender: form.voice?.gender || defaultVoice.gender,
      category: form.voice?.category || defaultVoice.category,
      speed: typeof form.voice?.speed === 'number' && !isNaN(form.voice.speed) ? form.voice.speed : 1.0,
      sampleText: form.voice?.sampleText,
    };

    onSaveCandidate({
      ...form,
      voice: sanitizedVoice,
    });
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

            {/* Full-Body Transparent Portrait PNG (For YouTube Introduction Motion Graphic) */}
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-gradient-to-b from-cyan-950/20 to-slate-950/60 border border-cyan-500/30">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Full-Body Portrait (PNG):</span>
                </label>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  {form.fullBodyImageUrl ? '✓ PNG Loaded' : 'Recommended'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-tight">
                Transparent PNG cutout displayed on the right side of the YouTube Intro Motion Graphic.
              </p>

              {/* Full-Body Image Preview Thumbnail */}
              {form.fullBodyImageUrl ? (
                <div className="relative w-full h-36 rounded-xl border border-cyan-500/40 overflow-hidden flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 shadow-inner group">
                  {/* Atmospheric Glow behind character */}
                  <div 
                    className="absolute w-24 h-24 rounded-full blur-2xl opacity-40 pointer-events-none"
                    style={{ backgroundColor: form.color.primary }}
                  />
                  <img 
                    src={form.fullBodyImageUrl} 
                    alt={`${form.name} Full-Body`} 
                    className="h-full w-auto object-contain z-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute bottom-1 right-1 z-20 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fullBodyInputRef.current?.click()}
                      className="px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold backdrop-blur-sm transition cursor-pointer"
                      title="Replace Full-Body PNG"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, fullBodyImageUrl: undefined }));
                        setFullBodyUrlValue('');
                      }}
                      className="p-1 rounded-lg bg-red-950/90 hover:bg-red-900 text-red-300 border border-red-800 text-[10px] font-mono backdrop-blur-sm transition cursor-pointer"
                      title="Remove Full-Body Image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fullBodyInputRef.current?.click()}
                  className="w-full h-24 border border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-xl flex flex-col items-center justify-center gap-1 p-2 text-center cursor-pointer transition bg-slate-900/40 hover:bg-cyan-950/30 group"
                >
                  <Upload className="w-4 h-4 text-cyan-400 transition-transform group-hover:-translate-y-0.5" />
                  <span className="text-[11px] font-mono font-bold text-white block">
                    Upload Transparent PNG
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block">
                    Click to browse or drop PNG portrait
                  </span>
                </div>
              )}

              {/* Uploading Spinner */}
              {isUploadingFullBody && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-300">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Uploading full-body portrait...</span>
                </div>
              )}

              {/* Upload Error */}
              {fullBodyUploadError && (
                <div className="text-[10px] font-mono text-red-300 bg-red-950/50 p-1.5 rounded-lg border border-red-800">
                  ⚠️ {fullBodyUploadError}
                </div>
              )}

              {/* URL Direct Input Toggle */}
              <div className="flex items-center justify-between text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setShowFullBodyUrlInput(prev => !prev)}
                  className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
                >
                  <Link className="w-3 h-3" />
                  <span>{showFullBodyUrlInput ? 'Hide URL input' : 'Paste Image URL'}</span>
                </button>
              </div>

              {showFullBodyUrlInput && (
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={fullBodyUrlValue}
                    onChange={(e) => setFullBodyUrlValue(e.target.value)}
                    placeholder="https://... or /uploads/..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (fullBodyUrlValue.trim()) {
                        setForm(prev => ({ ...prev, fullBodyImageUrl: fullBodyUrlValue.trim() }));
                        setShowFullBodyUrlInput(false);
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-[10px] font-mono font-bold transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fullBodyInputRef}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFullBodyFile(file);
                }}
                className="hidden"
              />
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

            {/* Row 3.2: Introduction Dialogue for YouTube Motion Graphic */}
            <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-gradient-to-b from-blue-950/25 via-slate-950/80 to-slate-950 border border-cyan-500/40 shadow-inner">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-600/50 text-cyan-300 shadow-xs">
                    <Film className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-cyan-200 uppercase tracking-wider flex items-center gap-1.5">
                      Introduction Dialogue (YouTube Motion Graphic)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Spoken statement delivered during the Introduction Motion Graphic sequence.
                    </p>
                  </div>
                </div>

                {/* Word & Duration Counter */}
                {(() => {
                  const words = (form.introductionDialogue || '').trim().split(/\s+/).filter(Boolean);
                  const wordCount = words.length;
                  const estimatedSecs = Math.max(1, Math.round(wordCount / 2.7));
                  return (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                      <span className="text-cyan-300 font-bold">{wordCount} words</span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-amber-300">~{estimatedSecs}s audio</span>
                    </div>
                  );
                })()}
              </div>

              {/* Textarea */}
              <textarea
                rows={3}
                value={form.introductionDialogue || ''}
                onChange={(e) => setForm(prev => ({ ...prev, introductionDialogue: e.target.value }))}
                placeholder="e.g. I am Jackson Alvarez. For forty years, the billionaires on the coast sold out our factories..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed custom-scrollbar font-sans"
              />

              {/* Action Buttons: Audition Speech & Suggest from Persona */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const suggested = getDefaultIntroductionDialogue(form);
                    setForm(prev => ({ ...prev, introductionDialogue: suggested }));
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-mono transition cursor-pointer"
                  title="Suggest introduction dialogue based on character archetype and slogan"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Suggest from Persona</span>
                </button>

                {/* Audition Intro Speech Button */}
                {(() => {
                  const isIntroLoading = loadingVoiceKey === 'intro_audition';
                  const isIntroPlaying = playingVoiceKey === 'intro_audition';

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isIntroPlaying || isIntroLoading) {
                          handleStopAudio();
                        } else {
                          handleTestVoice(
                            form.voice?.voiceId || CURATED_VOICES[0].id,
                            'intro_audition',
                            form.introductionDialogue || getDefaultIntroductionDialogue(form)
                          );
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition shadow-md cursor-pointer ${
                        isIntroPlaying
                          ? 'bg-red-900 hover:bg-red-800 text-white animate-pulse shadow-red-950'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-cyan-950/40'
                      }`}
                      title="Audition spoken dialogue using candidate's assigned voice model"
                    >
                      {isIntroLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Synthesizing...</span>
                        </>
                      ) : isIntroPlaying ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Intro Speech</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Audition Intro Speech</span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Row 3.5: Campaign Treasury & War Chest ($ Millions) */}
            <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-emerald-200 uppercase tracking-wider">
                      Campaign War Chest ($ Millions)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Used for $30M CCTV backroom bribes and $40M post-vote bailout vote buyouts.
                    </p>
                  </div>
                </div>

                {/* Live Current Value Pill */}
                <div className="px-3 py-1 rounded-xl bg-emerald-900/40 border border-emerald-500/50 text-xs font-mono font-bold text-emerald-300 shadow-sm shadow-emerald-950/50">
                  ${form.initialBudget ?? 100}M
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { value: 80, label: '$80M (Grassroots)', desc: '2 Bailouts / $80M' },
                  { value: 100, label: '$100M (Standard)', desc: '2 Bailouts + $20M' },
                  { value: 120, label: '$120M (War Chest)', desc: '3 Bailouts / $120M' },
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
            <div className="flex flex-col gap-3.5 p-4 rounded-2xl bg-purple-950/20 border border-purple-900/50 shadow-inner">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-950/90 border border-purple-700/60 text-purple-300 shadow-sm">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                      Character Voice &amp; Acoustic Model (Fish.Audio TTS)
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Assign neural speech acoustic persona, cadence, and test sample lines.
                    </p>
                  </div>
                </div>

                {/* Currently Assigned Voice Indicator & Global Stop Button */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-purple-500/40 text-xs font-mono shadow-xs">
                  <span className="text-slate-400 text-[11px]">Selected:</span>
                  <span className="text-purple-300 font-bold max-w-[160px] truncate">{form.voice?.voiceName || 'Custom Voice'}</span>
                  {isPlayingAudio && (
                    <button
                      type="button"
                      onClick={handleStopAudio}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-950/90 text-red-300 border border-red-700 text-[10px] font-bold hover:bg-red-900 transition cursor-pointer shadow-xs"
                      title="Stop Audio Preview"
                    >
                      <Square className="w-2.5 h-2.5 fill-red-400 text-red-400" />
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </div>

              {testAudioError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs font-mono text-red-200 flex items-center justify-between gap-2 animate-fade-in shadow-md">
                  <span className="leading-relaxed">⚠️ {testAudioError}</span>
                  <button
                    type="button"
                    onClick={() => setTestAudioError(null)}
                    className="text-red-400 hover:text-white text-xs px-1.5 py-0.5 rounded-lg hover:bg-red-900/50 transition cursor-pointer shrink-0"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Filters, Categories & Search Bar */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Gender Filter Tabs */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono text-slate-400">Gender:</span>
                    {(['all', 'male', 'female'] as const).map(gender => {
                      const count = gender === 'all' 
                        ? CURATED_VOICES.length 
                        : CURATED_VOICES.filter(v => v.gender === gender).length;
                      return (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => setVoiceGenderFilter(gender)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition capitalize flex items-center gap-1 cursor-pointer ${
                            voiceGenderFilter === gender
                              ? 'bg-purple-600 text-white font-bold shadow-xs'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          <span>{gender}</span>
                          <span className={`text-[10px] opacity-75 ${voiceGenderFilter === gender ? 'text-purple-200' : 'text-slate-500'}`}>
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Input */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Search voice, style, tag..."
                      value={voiceSearch}
                      onChange={(e) => setVoiceSearch(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl pl-3 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono w-52"
                    />
                    {voiceSearch && (
                      <button
                        type="button"
                        onClick={() => setVoiceSearch('')}
                        className="absolute right-2 text-slate-500 hover:text-white text-xs cursor-pointer"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Style / Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">Style:</span>
                  {[
                    'all',
                    'Authoritative',
                    'Deep & Serious',
                    'Passionate',
                    'Energetic',
                    'Calm & Intellectual',
                    'Tech & Modern',
                    'Professional',
                    'Wildcard',
                    'Calm & Gentle',
                    'Deep & Raspy'
                  ].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setVoiceCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition shrink-0 cursor-pointer ${
                        voiceCategoryFilter === cat
                          ? 'bg-purple-900/80 text-purple-200 border border-purple-500 font-bold'
                          : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat === 'all' ? 'All Styles' : cat}
                    </button>
                  ))}
                </div>

                {/* Speech Cadence / Speed Control Slider */}
                <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-slate-900/70 border border-purple-900/30 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-purple-300 font-bold">Voice Speed / Pace:</span>
                    <span className="text-[11px] font-bold text-white bg-purple-950 px-2 py-0.5 rounded-md border border-purple-800/60">
                      {(form.voice?.speed || 1.0).toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">0.8x</span>
                    <input
                      type="range"
                      min={0.8}
                      max={1.4}
                      step={0.05}
                      value={form.voice?.speed || 1.0}
                      onChange={(e) => {
                        const speedVal = parseFloat(e.target.value);
                        setForm(prev => ({
                          ...prev,
                          voice: {
                            ...(prev.voice || { voiceId: CURATED_VOICES[0].id, voiceName: CURATED_VOICES[0].name }),
                            speed: speedVal,
                          }
                        }));
                      }}
                      className="w-32 sm:w-44 accent-purple-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-500">1.4x</span>
                  </div>
                </div>
              </div>

              {/* Curated Voice Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {(() => {
                  const filtered = CURATED_VOICES
                    .filter(v => voiceGenderFilter === 'all' || v.gender === voiceGenderFilter)
                    .filter(v => voiceCategoryFilter === 'all' || v.category.toLowerCase().includes(voiceCategoryFilter.toLowerCase()))
                    .filter(v => !voiceSearch.trim() || 
                      v.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                      v.category.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                      v.description.toLowerCase().includes(voiceSearch.toLowerCase()) ||
                      v.tags.some(t => t.toLowerCase().includes(voiceSearch.toLowerCase()))
                    );

                  if (filtered.length === 0) {
                    return (
                      <div className="col-span-full py-8 text-center flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-purple-900/40 bg-purple-950/10">
                        <VolumeX className="w-6 h-6 text-purple-400/60" />
                        <p className="text-xs font-mono text-purple-200">No voice models matching your search criteria</p>
                        <button
                          type="button"
                          onClick={() => {
                            setVoiceSearch('');
                            setVoiceGenderFilter('all');
                            setVoiceCategoryFilter('all');
                          }}
                          className="px-3 py-1 text-[11px] font-mono rounded-lg bg-purple-900/50 hover:bg-purple-800 text-purple-200 transition cursor-pointer border border-purple-700/50"
                        >
                          Clear Filters
                        </button>
                      </div>
                    );
                  }

                  return filtered.map(v => {
                    const voiceKey = `${v.id}-${v.name}`;
                    const isSelected = form.voice?.voiceId === v.id && (form.voice?.voiceName === v.name || !form.voice?.voiceName);
                    const isVoiceLoading = loadingVoiceKey === voiceKey;
                    const isVoicePlaying = playingVoiceKey === voiceKey;

                    return (
                      <div
                        key={voiceKey}
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            voice: {
                              voiceId: v.id,
                              voiceName: v.name,
                              gender: v.gender,
                              category: v.category,
                              speed: prev.voice?.speed || 1.0,
                              sampleText: v.sampleText,
                            }
                          }));
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-left ${
                          isSelected
                            ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-950/40'
                            : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">{v.name}</span>
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
                              if (isVoicePlaying || isVoiceLoading) {
                                handleStopAudio();
                              } else {
                                handleTestVoice(v.id, voiceKey, v.sampleText);
                              }
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shrink-0 cursor-pointer ${
                              isVoiceLoading
                                ? 'bg-purple-900 text-purple-200 border border-purple-500'
                                : isVoicePlaying
                                ? 'bg-red-900 text-white animate-pulse shadow-md shadow-red-950'
                                : isSelected
                                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                            title="Play sample line in this voice"
                          >
                            {isVoiceLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Generating...</span>
                              </>
                            ) : isVoicePlaying ? (
                              <>
                                <Square className="w-3 h-3 fill-white" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>Sample</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {v.description}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Custom Voice ID Input & Audition Slogan Button */}
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
                      const matched = CURATED_VOICES.find(c => c.id.toLowerCase() === val.toLowerCase());
                      setForm(prev => ({
                        ...prev,
                        voice: {
                          voiceId: val,
                          voiceName: matched ? matched.name : (prev.voice?.voiceName && prev.voice?.voiceName !== 'Custom Model ID' ? prev.voice.voiceName : 'Custom Voice'),
                          gender: matched?.gender,
                          category: matched?.category || 'Custom',
                          speed: prev.voice?.speed || 1.0,
                        }
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-purple-200 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                {(() => {
                  const isSloganLoading = loadingVoiceKey === 'slogan_audition';
                  const isSloganPlaying = playingVoiceKey === 'slogan_audition';

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isSloganPlaying || isSloganLoading) {
                          handleStopAudio();
                        } else {
                          handleTestVoice(
                            form.voice?.voiceId || CURATED_VOICES[0].id, 
                            'slogan_audition', 
                            form.slogan
                          );
                        }
                      }}
                      disabled={!form.voice?.voiceId}
                      className={`w-full sm:w-auto mt-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition shadow-md disabled:opacity-50 cursor-pointer whitespace-nowrap ${
                        isSloganPlaying
                          ? 'bg-red-900 hover:bg-red-800 text-white animate-pulse shadow-red-950'
                          : 'bg-purple-700 hover:bg-purple-600 text-white shadow-purple-900/40'
                      }`}
                      title="Generate audio speech of candidate slogan using selected voice"
                    >
                      {isSloganLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Synthesizing...</span>
                        </>
                      ) : isSloganPlaying ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Stop Slogan</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Audition Slogan</span>
                        </>
                      )}
                    </button>
                  );
                })()}
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
