'use client';

import React, { useState, useEffect } from 'react';
import { useGameEngine } from '@/hooks/useGameEngine';
import { CandidateRoster } from '@/components/CandidateRoster';
import { DebateArena } from '@/components/DebateArena';
import { ControlBar } from '@/components/ControlBar';
import { EventTicker } from '@/components/EventTicker';
import { CandidateDossierModal } from '@/components/CandidateDossierModal';
import { TranscriptDrawer } from '@/components/TranscriptDrawer';
import { NineRouterSettingsModal, NineRouterConfigState } from '@/components/NineRouterSettingsModal';
import { CharactersManagerView } from '@/components/CharactersManagerView';
import { Candidate } from '@/types/candidate';
import { CANDIDATE_MAP } from '@/data/candidates';
import { 
  Crown, 
  Flame, 
  History, 
  Settings,
  Cpu,
  Landmark,
  Radio,
  Users,
  Tv
} from 'lucide-react';

const STORAGE_KEY = 'ai_politics_9router_config';

export default function AIPlaygroundPage() {
  const [nineRouterConfig, setNineRouterConfig] = useState<NineRouterConfigState>({
    baseUrl: 'http://localhost:20128/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
  });

  const [activeView, setActiveView] = useState<'arena' | 'characters'>('arena');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // Load config from localStorage or fallback to server env
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.baseUrl || parsed.apiKey) {
          setNineRouterConfig(parsed);
          return;
        }
      }
    } catch {}

    // If no localStorage, fetch from /api/config
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setNineRouterConfig(prev => ({
          baseUrl: data.defaultBaseUrl || prev.baseUrl,
          apiKey: prev.apiKey || '',
          model: data.defaultModel || prev.model,
        }));
      })
      .catch(() => {});
  }, []);

  const handleSaveConfig = (newConfig: NineRouterConfigState) => {
    setNineRouterConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch {}
  };

  const {
    state,
    candidates,
    startGame,
    nextStep,
    toggleAutoPlay,
    setSpeed,
    toggleSound,
    restartGame,
    retryCurrentStep,
    toggleCandidateSelection,
    setPresetRoster,
    selectCCTVFeed,
    saveCandidate,
    createCandidate,
    deleteCandidate,
    resetCandidateToDefault,
    resetAllCandidatesToDefault,
  } = useGameEngine(nineRouterConfig, () => setIsSettingsOpen(true));

  const isConfigured = Boolean(nineRouterConfig.baseUrl && nineRouterConfig.apiKey);

  return (
    <main className="min-h-screen flex flex-col bg-[#07090e] cyber-grid relative overflow-hidden">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Broadcast Banner */}
      <header className="px-4 md:px-6 py-3 bg-[#06080d]/95 border-b border-slate-750 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 shadow-lg shadow-cyan-500/25">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base md:text-lg font-display font-black tracking-wider text-white uppercase flex items-center gap-2">
              Republic of Valoria <span className="text-cyan-400 font-normal">Presidential Battle</span>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-xs">
                9router Live AI
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono hidden sm:block">
              {candidates.length} Autonomous Candidates &bull; Elimination Reality Format &bull; High-Stakes AI Diplomacy
            </p>
          </div>
        </div>

        {/* View Switcher, Round Indicator & Settings */}
        <div className="flex items-center gap-2.5">
          {/* Main Navigation Tab Switcher */}
          <div className="flex items-center bg-[#0b0f19] p-1 rounded-2xl border border-slate-750 text-xs font-display font-bold">
            <button
              onClick={() => setActiveView('arena')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                activeView === 'arena'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" /> Election Arena
            </button>
            <button
              onClick={() => setActiveView('characters')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                activeView === 'characters'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" /> Candidates ({candidates.length})
              <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                activeView === 'characters'
                  ? 'bg-slate-950 text-cyan-300'
                  : 'bg-slate-900 text-cyan-400 border border-cyan-500/30'
              }`}>
                {state.participatingCandidateIds?.length || state.activeCandidateIds.length} Active
              </span>
            </button>
          </div>

          {activeView === 'arena' && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-slate-750 text-xs font-mono">
                <span className="text-slate-400">PHASE:</span>
                <span className="font-bold text-cyan-300 uppercase">{state.phase.replace('_', ' ')}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-slate-750 text-xs font-mono">
                <span className="text-slate-400">ROUND:</span>
                <span className="font-black text-amber-300">{state.round}</span>
              </div>
            </>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b0f19] hover:bg-slate-800 border border-slate-750 hover:border-cyan-400 text-xs font-mono text-cyan-300 transition cursor-pointer shadow-sm"
            title="Configure 9router API & Model"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline font-bold">9router Settings</span>
          </button>
        </div>
      </header>

      {/* Main View: Characters Manager OR Election Arena */}
      {activeView === 'characters' ? (
        <CharactersManagerView
          candidates={candidates}
          selectedCandidateIds={state.participatingCandidateIds || state.activeCandidateIds}
          onToggleCandidate={toggleCandidateSelection}
          onSetPresetRoster={setPresetRoster}
          onSaveCandidate={saveCandidate}
          onDeleteCandidate={deleteCandidate}
          onResetCandidateToDefault={resetCandidateToDefault}
          onResetAllToDefault={resetAllCandidatesToDefault}
          onBackToArena={() => setActiveView('arena')}
          nineRouterConfig={nineRouterConfig}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isGameInProgress={state.phase !== 'IDLE'}
        />
      ) : (
        /* Main Broadcast Workspace */
        <div className="flex-1 flex flex-col p-3 md:p-4 gap-3 max-w-[1750px] w-full mx-auto">
          {/* Top Controls Bar */}
          <ControlBar
            gameState={state}
            nineRouterConfig={nineRouterConfig}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onStartGame={startGame}
            onNextStep={nextStep}
            onToggleAutoPlay={toggleAutoPlay}
            onSetSpeed={setSpeed}
            onToggleSound={toggleSound}
            onRestart={restartGame}
            onRetry={retryCurrentStep}
          />

          {/* 3-Column Layout: Left (Candidates) - Center (Debate Arena) - Right (Intel & Stats) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-[580px]">
            {/* Left Column: Candidate Roster (3 Cols) */}
            <div className="lg:col-span-3 h-full">
              <CandidateRoster
                gameState={state}
                candidates={candidates}
                onSelectCandidate={(candidate) => setSelectedCandidate(candidate)}
                onOpenCharactersManager={() => setActiveView('characters')}
              />
            </div>

            {/* Center Column: Live Debate Arena (6 Cols) */}
            <div className="lg:col-span-6 flex flex-col h-full">
              <DebateArena
                gameState={state}
                onRetry={retryCurrentStep}
                onRestart={restartGame}
                onSelectCCTVFeed={selectCCTVFeed}
              />
            </div>

            {/* Right Column: Battle Intelligence & History (3 Cols) */}
            <div className="lg:col-span-3 flex flex-col gap-3 h-full">
              {/* Quick Intel Card */}
              <div className="flex-1 flex flex-col rounded-2xl bg-[#0b0f19] border border-slate-750 p-4 backdrop-blur-2xl overflow-hidden shadow-lg">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                  <span className="text-xs font-display font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" /> Election Intel
                  </span>
                  <button
                    onClick={() => setIsTranscriptOpen(true)}
                    className="text-xs font-mono font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" /> Full Log
                  </button>
                </div>

                {/* Status breakdown */}
                <div className="flex-1 overflow-y-auto pr-1 py-3 flex flex-col gap-3 custom-scrollbar">
                  {/* 9router Status Card */}
                  <div 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition flex flex-col gap-1.5 shadow-sm group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-300 uppercase font-bold flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" /> 9router Engine
                      </span>
                      <span 
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          isConfigured 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/80 shadow-xs' 
                            : 'bg-amber-950 text-amber-300 border border-amber-600/80 animate-pulse'
                        }`}
                      >
                        {isConfigured ? 'Ready' : 'Configure'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-cyan-300 truncate font-bold mt-0.5">
                      {nineRouterConfig.model || 'No model selected'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {nineRouterConfig.baseUrl}
                    </div>
                  </div>

                  {/* Active Contenders */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-sm">
                    <span className="text-xs font-mono text-slate-200 uppercase font-bold block mb-2">
                      Active Contenders ({state.activeCandidateIds.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {state.activeCandidateIds.map(id => {
                        const c = CANDIDATE_MAP.get(id);
                        if (!c) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedCandidate(c)}
                            className="px-2.5 py-1 rounded-lg text-xs font-sans font-semibold border bg-slate-900 hover:scale-105 transition cursor-pointer"
                            style={{ borderColor: `${c.color.primary}70`, color: c.color.primary }}
                          >
                            {c.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Elimination History */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-sm">
                    <span className="text-xs font-mono text-slate-200 uppercase font-bold block mb-1">
                      Elimination History ({state.eliminatedCandidates.length})
                    </span>
                    {state.eliminatedCandidates.length === 0 ? (
                      <p className="text-xs text-slate-400 font-mono mt-1 italic">
                        No candidates eliminated yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 mt-2">
                        {state.eliminatedCandidates.map((e, idx) => {
                          const c = CANDIDATE_MAP.get(e.candidateId);
                          return (
                            <div
                              key={idx}
                              onClick={() => c && setSelectedCandidate(c)}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition"
                            >
                              <span className="text-stone-300 font-medium line-through">
                                {c?.name}
                              </span>
                              <span className="text-xs font-mono font-bold text-red-400">
                                R{e.eliminatedInRound} ({e.voteCount} votes)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Game Flow Legend */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-sm">
                    <span className="text-xs font-mono text-slate-200 uppercase font-bold block mb-2">
                      Valoria Election Protocol
                    </span>
                    <div className="flex flex-col gap-2 text-xs text-slate-300 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-xs shadow-cyan-400" />
                        <span>1. Campaign Speeches (Broadcast Address)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 shadow-xs shadow-red-400" />
                        <span>2. 1v1 Public Attacks (Denunciations)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-xs shadow-emerald-400" />
                        <span>3. Leaked Backroom Alliances (CCTV Whispers)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0 shadow-xs shadow-purple-400" />
                        <span>4. Secret Ballots &amp; Betrayal Reveals</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-xs shadow-amber-400" />
                        <span>5. Elimination Cycle (Top 3 Advance)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 shadow-xs shadow-yellow-400" />
                        <span>6. Grand Jury Presidential Inauguration</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Live Wire News Flash Ticker */}
          <EventTicker
            gameState={state}
            onOpenTranscript={() => setIsTranscriptOpen(true)}
          />
        </div>
      )}

      {/* 9router Settings Modal */}
      <NineRouterSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentConfig={nineRouterConfig}
        onSaveConfig={handleSaveConfig}
      />

      {/* Candidate Dossier Modal */}
      <CandidateDossierModal
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
      />

      {/* Full Transcript Drawer */}
      <TranscriptDrawer
        isOpen={isTranscriptOpen}
        gameState={state}
        onClose={() => setIsTranscriptOpen(false)}
      />
    </main>
  );
}
