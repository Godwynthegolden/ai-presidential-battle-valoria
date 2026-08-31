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
  ArrowUpDown
} from 'lucide-react';

interface CharactersManagerViewProps {
  candidates: Candidate[];
  selectedCandidateIds: string[];
  onToggleCandidate: (candidateId: string) => void;
  onSetPresetRoster: (preset: 'all' | 'top8' | 'top6' | 'quick4') => void;
  onSaveCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (candidateId: string) => void;
  onResetCandidateToDefault: (candidateId: string) => void;
  onResetAllToDefault: () => void;
  onBackToArena: () => void;
  onMoveCandidate?: (candidateId: string, direction: 'up' | 'down') => void;
  onReorderCandidates?: (newOrder: Candidate[]) => void;
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
  nineRouterConfig,
  onOpenSettings,
  isGameInProgress = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(null);
  const [editorDefaultTab, setEditorDefaultTab] = useState<'editor' | 'ai_generate'>('editor');

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

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-[1600px] w-full mx-auto animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToArena}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-mono font-bold transition shadow-lg shadow-cyan-500/20"
          >
            <Tv className="w-4 h-4" /> Return to Debate Arena
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div>
            <h1 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" /> Characters Management &amp; Lineup
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Select candidates for election, create new political figures, edit parameters, and crop avatars.
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition shadow-lg shadow-purple-600/25"
          >
            <Wand2 className="w-4 h-4" /> AI Generate Character
          </button>

          <button
            onClick={() => {
              setCandidateToEdit(null);
              setEditorDefaultTab('editor');
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-400 font-bold text-xs font-mono uppercase tracking-wider transition"
          >
            <Plus className="w-4 h-4" /> + Manual Create
          </button>

          <button
            onClick={() => {
              if (confirm('Reset all characters to the official Republic of Valoria default 31 roster? All custom characters will be removed.')) {
                onResetAllToDefault();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition"
            title="Reset to default 31 candidates"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
        </div>
      </div>

      {/* Election Lineup Selection Control Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-950 to-purple-950/40 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                Election Lineup Selection
              </span>
              <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                isLineupReady 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}>
                {selectedCount} / {candidates.length} Selected {isLineupReady ? '(Ready)' : '(Min 4 required)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Toggle candidates below to include or bench them in the upcoming Presidential Election.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
            Quick Lineup:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSetPresetRoster('all')}
              disabled={isGameInProgress}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500 transition disabled:opacity-40"
              title={`Select all ${candidates.length} candidates`}
            >
              All ({candidates.length})
            </button>
            <button
              onClick={() => onSetPresetRoster('top8')}
              disabled={isGameInProgress || candidates.length < 8}
              className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500 transition disabled:opacity-40"
              title="Select 8 candidates"
            >
              8 Contenders
            </button>
            <button
              onClick={() => onSetPresetRoster('top6')}
              disabled={isGameInProgress || candidates.length < 6}
              className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500 transition disabled:opacity-40"
              title="Select 6 candidates"
            >
              6 Contenders
            </button>
            <button
              onClick={() => onSetPresetRoster('quick4')}
              disabled={isGameInProgress || candidates.length < 4}
              className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500 transition disabled:opacity-40"
              title="Select 4 candidates (minimum)"
            >
              Quick 4
            </button>
          </div>
        </div>
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
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
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
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition whitespace-nowrap ${
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
          const isSelectedForElection = selectedCandidateIds.includes(candidate.id);
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
                      <span 
                        className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shadow-sm"
                        title={`Candidate #${candidateIndex + 1} in Election Lineup Order`}
                      >
                        #{candidateIndex + 1}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {candidate.codename}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Reorder Buttons (Move Up / Move Down) */}
                      {onMoveCandidate && (
                        <div className="flex items-center bg-slate-950/90 rounded-lg border border-slate-800 p-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveCandidate(candidate.id, 'up');
                            }}
                            disabled={isFirst || isGameInProgress}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                            title={isFirst ? 'Candidate is first in order' : 'Move candidate earlier in election order'}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveCandidate(candidate.id, 'down');
                            }}
                            disabled={isLast || isGameInProgress}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                            title={isLast ? 'Candidate is last in order' : 'Move candidate later in election order'}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {candidate.isCustom ? (
                        <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 shadow-sm">
                          Custom AI
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          Valoria 11
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
                  <span>{candidate.customAvatarUrl ? '📷 Photo Avatar' : '🎨 SVG Icon'}</span>
                </div>
              </div>

              {/* Card Bottom: Election Selection Toggle + Edit Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                {/* Election Lineup Toggle Button */}
                <button
                  type="button"
                  onClick={() => onToggleCandidate(candidate.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition shadow-sm ${
                    isSelectedForElection
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 hover:bg-red-950 hover:text-red-300 hover:border-red-700'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-cyan-400 hover:text-cyan-300'
                  }`}
                  title={isSelectedForElection ? 'Click to bench candidate' : 'Click to add candidate to election'}
                >
                  {isSelectedForElection ? (
                    <>
                      <CheckSquare2 className="w-4 h-4 text-emerald-400" />
                      <span>In Election Lineup</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 text-slate-500" />
                      <span>+ Add to Election</span>
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
                      className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800 text-xs font-mono transition"
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
                      className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition"
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
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800 text-xs font-mono font-bold transition"
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
