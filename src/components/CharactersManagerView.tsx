'use client';

import React, { useState } from 'react';
import { Candidate, Archetype } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { CharacterEditorModal } from './CharacterEditorModal';
import { NineRouterConfigState } from './NineRouterSettingsModal';
import { 
  Users, 
  Plus, 
  Wand2, 
  RotateCcw, 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Search, 
  Filter, 
  ShieldAlert, 
  Check, 
  Cpu, 
  Quote, 
  Info,
  CheckSquare2,
  Square,
  Vote,
  Tv,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  GripVertical,
  Shuffle,
  ArrowLeftRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Flame,
  Play
} from 'lucide-react';

interface CharactersManagerViewProps {
  candidates: Candidate[];
  selectedCandidateIds: string[];
  onToggleCandidate: (candidateId: string) => void;
  onSetPresetRoster: (preset: 'all' | 'top8' | 'top6' | 'quick4' | 'youtube11') => void;
  onSaveCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (candidateId: string) => void;
  onResetCandidateToDefault: (candidateId: string) => void;
  onResetAllToDefault: () => void;
  onBackToArena: () => void;
  onMoveCandidate?: (candidateId: string, direction: 'up' | 'down') => void;
  onReorderCandidates?: (newOrder: Candidate[]) => void;
  onMoveActiveCandidate?: (candidateId: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  onReorderActiveCandidates?: (newOrderedIds: string[]) => void;
  onShuffleActiveCandidates?: () => void;
  onReverseActiveCandidates?: () => void;
  nineRouterConfig?: NineRouterConfigState;
  onOpenSettings?: () => void;
  isGameInProgress?: boolean;
}

export const CharactersManagerView: React.FC<CharactersManagerViewProps> = ({
  candidates,
  selectedCandidateIds,
  onToggleCandidate,
  onSetPresetRoster,
  onSaveCandidate,
  onDeleteCandidate,
  onResetCandidateToDefault,
  onResetAllToDefault,
  onBackToArena,
  onMoveCandidate,
  onReorderCandidates,
  onMoveActiveCandidate,
  onReorderActiveCandidates,
  onShuffleActiveCandidates,
  onReverseActiveCandidates,
  nineRouterConfig,
  onOpenSettings,
  isGameInProgress = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(null);
  const [editorDefaultTab, setEditorDefaultTab] = useState<'editor' | 'ai_generate'>('editor');
  
  // Drag & drop state for lineup reordering
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.titleRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slogan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.archetypeTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesArchetype = selectedArchetype === 'all' || c.archetype === selectedArchetype;

    return matchesSearch && matchesArchetype;
  });

  const selectedCount = selectedCandidateIds.length;
  const isLineupReady = selectedCount >= 4;

  // Ordered list of selected candidates
  const activeCandidatesList: Candidate[] = selectedCandidateIds
    .map(id => candidates.find(c => c.id === id))
    .filter((c): c is Candidate => Boolean(c));

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isGameInProgress) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (isGameInProgress || draggedId === targetId) return;
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (isGameInProgress || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const current = [...selectedCandidateIds];
    const fromIdx = current.indexOf(draggedId);
    const toIdx = current.indexOf(targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const [moved] = current.splice(fromIdx, 1);
      current.splice(toIdx, 0, moved);
      if (onReorderActiveCandidates) {
        onReorderActiveCandidates(current);
      }
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-[1650px] w-full mx-auto animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToArena}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-mono font-bold transition shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Tv className="w-4 h-4" /> Return to Debate Arena
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div>
            <h1 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" /> Characters Management &amp; Lineup
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Customize debate speech order, drag-and-drop candidates, switch presets, and edit profiles.
            </p>
          </div>
        </div>

        {/* Global Management Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setCandidateToEdit(null);
              setEditorDefaultTab('ai_generate');
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition shadow-lg shadow-purple-600/25 cursor-pointer"
          >
            <Wand2 className="w-4 h-4" /> AI Generate Character
          </button>

          <button
            onClick={() => {
              setCandidateToEdit(null);
              setEditorDefaultTab('editor');
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-400 font-bold text-xs font-mono uppercase tracking-wider transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Manual Create
          </button>

          <button
            onClick={() => {
              if (confirm('Reset all characters to the official Republic of Valoria default 31 roster? All custom characters will be removed.')) {
                onResetAllToDefault();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition cursor-pointer"
            title="Reset to default 31 candidates"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
        </div>
      </div>

      {/* 🌟 INTERACTIVE LINEUP ORDER & ROSTERING CONTROL DECK */}
      <div className="flex flex-col gap-4 p-5 rounded-3xl bg-gradient-to-b from-[#0e1424] via-[#090d18] to-[#060910] border border-cyan-500/40 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
        {/* Top Header of Deck */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-500/25">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-black font-display uppercase tracking-wider text-white">
                  Active Election Debate Order
                </span>
                <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm ${
                  isLineupReady 
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500' 
                    : 'bg-amber-950 text-amber-300 border-amber-500'
                }`}>
                  {selectedCount} Candidates &bull; {isLineupReady ? 'Ready for Debate' : 'Min 4 required'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Debate sequence starts at <strong className="text-cyan-300">#1 (Opening Hook)</strong> and proceeds to <strong className="text-purple-300">#{selectedCount} (Closer)</strong>. Drag chips or use arrows to change speaking order.
              </p>
            </div>
          </div>

          {/* Quick Preset Roster Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* YouTube 11 Viral Order Preset */}
            <button
              onClick={() => onSetPresetRoster('youtube11')}
              disabled={isGameInProgress}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-black bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white shadow-lg shadow-rose-500/25 border border-amber-300/40 transition cursor-pointer disabled:opacity-40"
              title="Load the 11-candidate lineup engineered for maximum YouTube retention"
            >
              <Flame className="w-3.5 h-3.5 text-yellow-200" />
              <span>🎬 YouTube 11 Viral Order</span>
            </button>

            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

            <button
              onClick={() => onSetPresetRoster('all')}
              disabled={isGameInProgress}
              className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500 transition cursor-pointer disabled:opacity-40"
              title={`Select all ${candidates.length} candidates`}
            >
              All ({candidates.length})
            </button>
            <button
              onClick={() => onSetPresetRoster('top8')}
              disabled={isGameInProgress || candidates.length < 8}
              className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500 transition cursor-pointer disabled:opacity-40"
              title="Select 8 candidates"
            >
              8 Contenders
            </button>
            <button
              onClick={() => onSetPresetRoster('top6')}
              disabled={isGameInProgress || candidates.length < 6}
              className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500 transition cursor-pointer disabled:opacity-40"
              title="Select 6 candidates"
            >
              6 Contenders
            </button>
            <button
              onClick={() => onSetPresetRoster('quick4')}
              disabled={isGameInProgress || candidates.length < 4}
              className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500 transition cursor-pointer disabled:opacity-40"
              title="Select 4 candidates (minimum)"
            >
              Quick 4
            </button>

            <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

            {/* Shuffle & Reverse Utility Buttons */}
            {onShuffleActiveCandidates && (
              <button
                onClick={onShuffleActiveCandidates}
                disabled={isGameInProgress || selectedCount < 2}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 hover:border-amber-500 transition cursor-pointer disabled:opacity-40"
                title="Randomly shuffle the speaking order"
              >
                <Shuffle className="w-3 h-3" /> Shuffle
              </button>
            )}

            {onReverseActiveCandidates && (
              <button
                onClick={onReverseActiveCandidates}
                disabled={isGameInProgress || selectedCount < 2}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-800 hover:border-purple-500 transition cursor-pointer disabled:opacity-40"
                title="Reverse the current speaking order"
              >
                <ArrowLeftRight className="w-3 h-3" /> Reverse
              </button>
            )}
          </div>
        </div>

        {/* 📋 Visual Lineup Chips Deck (Drag & Drop + Instant Position Buttons) */}
        {activeCandidatesList.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-2xl">
            No candidates selected in the lineup. Click candidates in the catalog below or select a preset above.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 max-h-[340px] overflow-y-auto p-1.5 custom-scrollbar">
            {activeCandidatesList.map((cand, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === activeCandidatesList.length - 1;
              const isDragged = draggedId === cand.id;
              const isDragOver = dragOverId === cand.id;

              return (
                <div
                  key={cand.id}
                  draggable={!isGameInProgress}
                  onDragStart={(e) => handleDragStart(e, cand.id)}
                  onDragOver={(e) => handleDragOver(e, cand.id)}
                  onDrop={(e) => handleDrop(e, cand.id)}
                  onDragEnd={handleDragEnd}
                  className={`group relative flex items-center gap-2.5 p-2 rounded-2xl border transition-all select-none cursor-grab active:cursor-grabbing ${
                    isDragged
                      ? 'opacity-40 scale-95 border-dashed border-cyan-400 bg-cyan-950/20'
                      : isDragOver
                      ? 'border-cyan-400 bg-cyan-950/60 scale-105 shadow-xl shadow-cyan-500/20'
                      : 'bg-slate-900/90 hover:bg-slate-850 border-slate-750 hover:border-cyan-500/60 shadow-md'
                  }`}
                  style={{
                    borderLeftColor: cand.color.primary,
                    borderLeftWidth: '4px',
                  }}
                >
                  {/* Drag Grip Handle */}
                  <div className="text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing pl-0.5">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  {/* Position Badge */}
                  <div 
                    className={`flex items-center justify-center w-6 h-6 rounded-lg text-xs font-mono font-black shadow-xs ${
                      isFirst 
                        ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black' 
                        : isLast 
                        ? 'bg-purple-900 text-purple-200 border border-purple-700' 
                        : 'bg-slate-950 text-cyan-300 border border-slate-800'
                    }`}
                    title={`Slot #${idx + 1} (${isFirst ? 'Opening Hook' : isLast ? 'Closing Anchor' : `Speaker ${idx + 1}`})`}
                  >
                    {idx + 1}
                  </div>

                  {/* Candidate Mini Avatar */}
                  <div className="relative">
                    <CandidateAvatar candidate={cand} size="sm" showBadge={false} />
                  </div>

                  {/* Candidate Name & Title */}
                  <div className="flex flex-col min-w-[110px] max-w-[150px]">
                    <span className="text-xs font-black text-white truncate leading-tight">
                      {cand.name}
                    </span>
                    <span 
                      className="text-[10px] font-mono truncate font-semibold"
                      style={{ color: cand.color.primary }}
                    >
                      {cand.titleRole}
                    </span>
                  </div>

                  {/* Budget Badge */}
                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                    ${cand.initialBudget ?? 100}
                  </span>

                  {/* Quick Shift & Jump Reorder Buttons */}
                  <div className="flex items-center gap-0.5 bg-slate-950/80 rounded-xl p-0.5 border border-slate-800">
                    {/* Jump to Slot #1 */}
                    <button
                      type="button"
                      onClick={() => onMoveActiveCandidate && onMoveActiveCandidate(cand.id, 'top')}
                      disabled={isFirst || isGameInProgress}
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer disabled:cursor-not-allowed"
                      title="Move to First Slot (#1 Opening Hook)"
                    >
                      <ChevronsLeft className="w-3 h-3" />
                    </button>

                    {/* Shift Left / Earlier */}
                    <button
                      type="button"
                      onClick={() => onMoveActiveCandidate && onMoveActiveCandidate(cand.id, 'up')}
                      disabled={isFirst || isGameInProgress}
                      className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer disabled:cursor-not-allowed"
                      title="Shift Earlier (Left)"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    {/* Shift Right / Later */}
                    <button
                      type="button"
                      onClick={() => onMoveActiveCandidate && onMoveActiveCandidate(cand.id, 'down')}
                      disabled={isLast || isGameInProgress}
                      className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer disabled:cursor-not-allowed"
                      title="Shift Later (Right)"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    {/* Jump to End */}
                    <button
                      type="button"
                      onClick={() => onMoveActiveCandidate && onMoveActiveCandidate(cand.id, 'bottom')}
                      disabled={isLast || isGameInProgress}
                      className="p-1 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 disabled:opacity-20 transition cursor-pointer disabled:cursor-not-allowed"
                      title="Move to Last Slot (Closer)"
                    >
                      <ChevronsRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Quick Remove from Lineup (Bench) */}
                  <button
                    type="button"
                    onClick={() => onToggleCandidate(cand.id)}
                    disabled={isGameInProgress}
                    className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition cursor-pointer disabled:opacity-30"
                    title="Remove from debate lineup"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by candidate name, role, slogan, or archetype..."
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white cursor-pointer">
              &times;
            </button>
          )}
        </div>

        {/* Archetype Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
          </span>
          {[
            { id: 'all', label: `All (${candidates.length})` },
            { id: 'populist', label: 'Populist' },
            { id: 'technocrat', label: 'Technocrat' },
            { id: 'hawk', label: 'Hawk' },
            { id: 'capitalist', label: 'Capitalist' },
            { id: 'socialist', label: 'Labor' },
            { id: 'careerist', label: 'Careerist' },
            { id: 'traditionalist', label: 'Jurist' },
            { id: 'wildcard', label: 'Provocateur' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedArchetype(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                selectedArchetype === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Candidates Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCandidates.map((candidate) => {
          const lineupIndex = selectedCandidateIds.indexOf(candidate.id);
          const isSelectedForElection = lineupIndex !== -1;
          const candidateIndex = candidates.findIndex(c => c.id === candidate.id);
          const isFirst = candidateIndex === 0;
          const isLast = candidateIndex === candidates.length - 1;

          return (
            <div
              key={candidate.id}
              className={`group relative flex flex-col justify-between p-5 rounded-3xl transition-all duration-300 shadow-xl backdrop-blur-md border ${
                isSelectedForElection
                  ? 'bg-slate-900/90 border-cyan-500/60 shadow-cyan-500/10'
                  : 'bg-slate-950/50 border-slate-900 opacity-60 grayscale hover:opacity-90 hover:grayscale-0'
              }`}
              style={{
                boxShadow: isSelectedForElection ? `0 0 25px ${candidate.color.primary}20` : undefined,
              }}
            >
              {/* Card Top Section: Avatar & Badges */}
              <div className="flex items-start gap-4">
                <CandidateAvatar
                  candidate={candidate}
                  size="lg"
                  showBadge={false}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      {isSelectedForElection ? (
                        <span 
                          className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-sm"
                          title={`Speaking #${lineupIndex + 1} in Debate Order`}
                        >
                          Slot #{lineupIndex + 1}
                        </span>
                      ) : (
                        <span 
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-800"
                        >
                          Benched
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {candidate.codename}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {candidate.isCustom ? (
                        <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 shadow-sm">
                          Custom AI
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          Valoria 31
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-black text-white mt-1 truncate">
                    {candidate.name}
                  </h3>
                  <p 
                    className="text-xs font-semibold truncate mt-0.5"
                    style={{ color: candidate.color.primary }}
                  >
                    {candidate.titleRole}
                  </p>

                  <p className="text-xs text-slate-300 italic line-clamp-2 mt-2 bg-slate-950/50 p-2 rounded-xl border border-slate-850">
                    <Quote className="w-3 h-3 opacity-50 inline mr-1" />
                    "{candidate.slogan}"
                  </p>
                </div>
              </div>

              {/* Candidate Ideology & Behavior Snippet */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-2 text-xs text-slate-300 font-mono">
                <div className="line-clamp-2 text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Ideology:</strong> {candidate.ideology}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Targets: <strong className="text-red-400">{candidate.rivalArchetypes.join(', ')}</strong></span>
                  <span className="text-emerald-400 font-bold">${candidate.initialBudget ?? 100} Budget</span>
                </div>
              </div>

              {/* Card Bottom: Election Selection Toggle + Edit Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                {/* Election Lineup Toggle Button */}
                <button
                  type="button"
                  onClick={() => onToggleCandidate(candidate.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition shadow-sm cursor-pointer ${
                    isSelectedForElection
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 hover:bg-red-950 hover:text-red-300 hover:border-red-700'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-cyan-400 hover:text-cyan-300'
                  }`}
                  title={isSelectedForElection ? 'Click to bench candidate' : 'Click to add candidate to election'}
                >
                  {isSelectedForElection ? (
                    <>
                      <CheckSquare2 className="w-4 h-4 text-emerald-400" />
                      <span>In Lineup (#{lineupIndex + 1})</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 text-slate-500" />
                      <span>+ Add to Lineup</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  {candidate.isCustom ? (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${candidate.name}"?`)) {
                          onDeleteCandidate(candidate.id);
                        }
                      }}
                      className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800 text-xs font-mono transition cursor-pointer"
                      title="Delete this custom candidate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm(`Reset "${candidate.name}" back to official default Republic of Valoria parameters?`)) {
                          onResetCandidateToDefault(candidate.id);
                        }
                      }}
                      className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition cursor-pointer"
                      title="Reset candidate to original parameters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setCandidateToEdit(candidate);
                      setEditorDefaultTab('editor');
                      setIsEditorOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800 text-xs font-mono font-bold transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Character Editor Modal */}
      <CharacterEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        candidateToEdit={candidateToEdit}
        onSaveCandidate={onSaveCandidate}
        onDeleteCandidate={onDeleteCandidate}
        onResetCandidateToDefault={onResetCandidateToDefault}
        nineRouterConfig={nineRouterConfig}
      />
    </div>
  );
};
