'use client';

import React, { useState, useEffect } from 'react';
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
  UserCheck
} from 'lucide-react';

interface CharactersManagerViewProps {
  candidates: Candidate[];
  onSaveCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (candidateId: string) => void;
  onResetCandidateToDefault: (candidateId: string) => void;
  onResetAllToDefault: () => void;
  onBackToArena: () => void;
  nineRouterConfig?: NineRouterConfigState;
  onOpenSettings?: () => void;
}

export const CharactersManagerView: React.FC<CharactersManagerViewProps> = ({
  candidates,
  onSaveCandidate,
  onDeleteCandidate,
  onResetCandidateToDefault,
  onResetAllToDefault,
  onBackToArena,
  nineRouterConfig,
  onOpenSettings,
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

  const customCount = candidates.filter(c => c.isCustom).length;
  const defaultCount = candidates.filter(c => !c.isCustom).length;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-[1600px] w-full mx-auto animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToArena}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" /> Back to Election Arena
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div>
            <h1 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" /> Characters Management
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Create new political figures, generate with AI models, crop custom avatars, and fine-tune debate prompts.
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition shadow-lg shadow-cyan-500/25"
          >
            <Plus className="w-4 h-4" /> + Manual Create
          </button>

          <button
            onClick={() => {
              if (confirm('Reset all characters to the official Republic of Valoria default 11 roster? All custom characters will be removed.')) {
                onResetAllToDefault();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition"
            title="Reset to default 11 candidates"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
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
        {filteredCandidates.map((candidate) => (
          <div
            key={candidate.id}
            className="group relative flex flex-col justify-between p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 shadow-xl backdrop-blur-md"
            style={{
              boxShadow: `0 0 25px ${candidate.color.primary}10`,
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
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    {candidate.codename}
                  </span>

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

            {/* Card Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {candidate.isCustom ? (
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${candidate.name}"?`)) {
                        onDeleteCandidate(candidate.id);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800 text-xs font-mono transition"
                    title="Delete this custom candidate"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm(`Reset "${candidate.name}" back to official default Republic of Valoria parameters?`)) {
                        onResetCandidateToDefault(candidate.id);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition"
                    title="Reset candidate to original parameters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setCandidateToEdit(candidate);
                  setEditorDefaultTab('editor');
                  setIsEditorOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition shadow-md shadow-cyan-500/20"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Parameters &amp; Avatar
              </button>
            </div>
          </div>
        ))}
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
