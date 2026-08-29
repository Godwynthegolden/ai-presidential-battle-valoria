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
import { ElectionIntelModal } from '@/components/ElectionIntelModal';
import { BroadcastTimeline } from '@/components/BroadcastTimeline';
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
  Tv,
  Eye,
  EyeOff
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
  const [isIntelOpen, setIsIntelOpen] = useState(false);
  const [isCleanView, setIsCleanView] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Set mounted flag to safely hydrate client-side custom candidate counts
  useEffect(() => {
    setHasMounted(true);
  }, []);

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

  // Global hotkeys: 'H' for Clean View, ArrowRight / ArrowDown / Enter for Start & Next Step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsCleanView(prev => !prev);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (state.phase === 'IDLE') {
          startGame();
        } else if (!state.stage.isLoading && !state.playback.autoPlay && state.phase !== 'WINNER') {
          nextStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.phase, state.stage.isLoading, state.playback.autoPlay, startGame, nextStep]);

  const isConfigured = Boolean(nineRouterConfig.baseUrl && nineRouterConfig.apiKey);

  return (
    <main className="h-screen max-h-screen flex flex-col bg-[#07090e] cyber-grid relative overflow-hidden" suppressHydrationWarning>
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Floating Clean Broadcast View Badge Indicator */}
      {isCleanView && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/90 border border-slate-750 text-xs font-mono text-slate-200 backdrop-blur-2xl shadow-2xl animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
          <span>Clean Broadcast Mode &bull; Press <strong className="text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">H</strong> to restore UI</span>
          <button 
            onClick={() => setIsCleanView(false)}
            className="ml-1 text-xs font-sans font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            Show All
          </button>
        </div>
      )}

      {/* Top Broadcast Banner (Hidden in Clean View) */}
      {!isCleanView && (
        <header className="px-4 md:px-6 py-3 bg-[#06080d]/95 border-b border-slate-750 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 z-10 transition-all shrink-0">
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
              <p className="text-xs text-slate-400 font-mono hidden sm:block" suppressHydrationWarning>
                {hasMounted ? candidates.length : 11} Autonomous Candidates &bull; Elimination Reality Format &bull; High-Stakes AI Diplomacy
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
                    ? 'bg-cyan-500 text-black shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="w-4 h-4" /> Election Arena
              </button>
              <button
                onClick={() => setActiveView('characters')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                  activeView === 'characters'
                    ? 'bg-cyan-500 text-black shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" /> <span suppressHydrationWarning>Candidates ({hasMounted ? candidates.length : 11})</span>
                <span 
                  suppressHydrationWarning
                  className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                    activeView === 'characters'
                      ? 'bg-slate-950 text-cyan-300'
                      : 'bg-slate-900 text-cyan-400 border border-cyan-500/30'
                  }`}
                >
                  {hasMounted ? (state.participatingCandidateIds?.length || state.activeCandidateIds.length) : 11} Active
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

            {/* Election Intel Button */}
            <button
              onClick={() => setIsIntelOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b0f19] hover:bg-slate-800 border border-slate-750 hover:border-amber-400 text-xs font-display font-bold text-amber-300 transition cursor-pointer shadow-sm"
              title="Open Republic of Valoria Election Intel & Rules"
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Election Intel</span>
            </button>

            {/* Clean View Toggle Button */}
            <button
              onClick={() => setIsCleanView(prev => !prev)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b0f19] hover:bg-slate-800 border border-slate-750 hover:border-cyan-400 text-xs font-mono text-slate-300 transition cursor-pointer shadow-sm"
              title="Toggle Clean Broadcast View for YouTube / OBS (Shortcut: H)"
            >
              <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-[10px]">H</span>
              <span className="hidden xl:inline">Clean View</span>
            </button>

            {/* 9router Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b0f19] hover:bg-slate-800 border border-slate-750 hover:border-cyan-400 text-xs font-mono text-cyan-300 transition cursor-pointer shadow-sm"
              title="Configure 9router API & Model"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline font-bold">9router</span>
            </button>
          </div>
        </header>
      )}

      {/* Main View: Characters Manager OR Election Arena */}
      {activeView === 'characters' ? (
        <div className="flex-1 h-full min-h-0 overflow-y-auto custom-scrollbar">
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
        </div>
      ) : (
        /* Main Broadcast Workspace */
        <div className={`flex-1 flex flex-col ${isCleanView ? 'p-2 md:p-3 gap-2' : 'p-3 md:p-4 gap-3'} max-w-[1750px] w-full mx-auto h-full min-h-0 overflow-hidden`}>
          {/* Top Controls Bar (Hidden in Clean View) */}
          {!isCleanView && (
            <div className="shrink-0">
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
            </div>
          )}

          {/* 3-Column Layout: Left (Candidates) - Center (Debate Arena) - Right (Live Battle Timeline) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 h-full min-h-0 overflow-hidden">
            {/* Left Column: Candidate Roster (3 Cols) */}
            <div className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden">
              <CandidateRoster
                gameState={state}
                candidates={candidates}
                onSelectCandidate={(candidate) => setSelectedCandidate(candidate)}
                onOpenCharactersManager={() => setActiveView('characters')}
              />
            </div>

            {/* Center Column: Live Debate Arena (6 Cols) */}
            <div className="lg:col-span-6 h-full min-h-0 flex flex-col overflow-hidden">
              <DebateArena
                gameState={state}
                onRetry={retryCurrentStep}
                onRestart={restartGame}
                onSelectCCTVFeed={selectCCTVFeed}
              />
            </div>

            {/* Right Column: Live Battle Timeline (3 Cols) */}
            <div className="lg:col-span-3 h-full min-h-0 flex flex-col overflow-hidden">
              <BroadcastTimeline
                gameState={state}
                onSelectCandidate={(candidate) => setSelectedCandidate(candidate)}
              />
            </div>
          </div>

          {/* Bottom Live Wire News Flash Ticker (Hidden in Clean View) */}
          {!isCleanView && (
            <div className="shrink-0">
              <EventTicker
                gameState={state}
                onOpenTranscript={() => setIsTranscriptOpen(true)}
              />
            </div>
          )}
        </div>
      )}

      {/* Election Intel Modal */}
      <ElectionIntelModal
        isOpen={isIntelOpen}
        gameState={state}
        nineRouterConfig={nineRouterConfig}
        onClose={() => setIsIntelOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectCandidate={(candidate) => setSelectedCandidate(candidate)}
      />

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

