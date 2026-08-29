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
      <header className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 shadow-md shadow-cyan-500/20">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black tracking-wider text-white uppercase flex items-center gap-2">
              Republic of Valoria <span className="text-cyan-400 font-normal">Presidential Election</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                9router Live AI
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              {candidates.length} Political Figures &bull; 9router Custom Endpoints &bull; Elimination Reality Format
            </p>
          </div>
        </div>

        {/* View Switcher, Round Indicator & Settings */}
        <div className="flex items-center gap-2">
          {/* Main Navigation Tab Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveView('arena')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                activeView === 'arena'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" /> Election Arena
            </button>
            <button
              onClick={() => setActiveView('characters')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                activeView === 'characters'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Characters Management
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeView === 'characters'
                  ? 'bg-slate-950 text-cyan-300'
                  : 'bg-slate-800 text-cyan-400'
              }`}>
                {state.participatingCandidateIds?.length || state.activeCandidateIds.length} / {candidates.length}
              </span>
            </button>
          </div>

          {activeView === 'arena' && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                <span className="text-slate-500">PHASE:</span>
                <span className="font-bold text-cyan-400 uppercase">{state.phase.replace('_', ' ')}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                <span className="text-slate-500">ROUND:</span>
                <span className="font-bold text-amber-400">{state.round}</span>
              </div>
            </>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-400 text-xs font-mono text-cyan-300 transition cursor-pointer"
            title="Configure 9router API & Model"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">9router Settings</span>
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
        <div className="flex-1 flex flex-col p-3 md:p-4 gap-3 max-w-[1700px] w-full mx-auto">
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
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[560px]">
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
              <div className="flex-1 flex flex-col rounded-2xl bg-slate-900/80 border border-slate-800 p-4 backdrop-blur-md overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" /> Election Intel
                  </span>
                  <button
                    onClick={() => setIsTranscriptOpen(true)}
                    className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <History className="w-3 h-3" /> Full Record
                  </button>
                </div>

                {/* Status breakdown */}
                <div className="flex-1 overflow-y-auto pr-1 py-3 flex flex-col gap-3 custom-scrollbar">
                  {/* 9router Status Card */}
                  <div 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-850 hover:border-cyan-500/40 cursor-pointer transition flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-cyan-400" /> Active 9router Engine
                      </span>
                      <span 
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isConfigured 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {isConfigured ? 'Ready' : 'Setup Required'}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-cyan-300 truncate font-bold">
                      {nineRouterConfig.model || 'No model chosen'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      {nineRouterConfig.baseUrl}
                    </div>
                  </div>

                  {/* Active Contenders */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-850">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                      Active Contenders ({state.activeCandidateIds.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {state.activeCandidateIds.map(id => {
                        const c = CANDIDATE_MAP.get(id);
                        if (!c) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedCandidate(c)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium border bg-slate-900/90 hover:scale-105 transition"
                            style={{ borderColor: `${c.color.primary}60`, color: c.color.primary }}
                          >
                            {c.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Elimination History */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-850">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                      Elimination History ({state.eliminatedCandidates.length})
                    </span>
                    {state.eliminatedCandidates.length === 0 ? (
                      <p className="text-[11px] text-slate-500 font-mono mt-1">
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
                              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] cursor-pointer hover:border-slate-700"
                            >
                              <span className="text-stone-400 line-through">
                                {c?.name}
                              </span>
                              <span className="text-[10px] font-mono text-red-400">
                                R{e.eliminatedInRound} ({e.voteCount} votes)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Game Flow Legend */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-850">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                      Valoria Election Protocol
                    </span>
                    <div className="flex flex-col gap-1.5 text-[11px] text-slate-400 mt-2 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>1. Campaign Speeches (Max 40w)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span>2. Live Attacks (Max 30w)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>3. CCTV Leaked Pacts (Max 25w)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        <span>4. Secret Ballots & Betrayals</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>5. Repeat Until Top 3 Remain</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        <span>6. Grand Jury Presidential Vote</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Event Ticker */}
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
