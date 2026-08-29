'use client';

import React from 'react';
import { Candidate } from '@/types/candidate';
import { CandidateAvatar } from './CandidateAvatar';
import { 
  X, 
  Target, 
  Brain, 
  Swords, 
  Shield, 
  AlertTriangle, 
  Sparkles, 
  MessageSquareQuote,
  Quote,
  Edit3
} from 'lucide-react';

interface CandidateDossierModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onEditCandidate?: (candidate: Candidate) => void;
}

export const CandidateDossierModal: React.FC<CandidateDossierModalProps> = ({
  candidate,
  onClose,
  onEditCandidate,
}) => {
  if (!candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0b0f19] border-2 border-slate-750 p-6 md:p-8 shadow-2xl custom-scrollbar"
        style={{ borderColor: `${candidate.color.primary}99` }}
      >
        {/* Top Right Action Buttons (Edit & Close) */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          {onEditCandidate && (
            <button
              onClick={() => {
                onEditCandidate(candidate);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/80 text-xs font-mono font-bold transition cursor-pointer shadow-md shadow-cyan-950/50 active:scale-95"
              title="Edit this candidate's codename, avatar, role, and parameters"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Character</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            title="Close Dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-slate-800">
          <CandidateAvatar
            candidate={candidate}
            size="lg"
            showBadge={false}
          />
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800">
                {candidate.codename}
              </span>
              <span 
                className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-md border"
                style={{ 
                  backgroundColor: `${candidate.color.primary}18`, 
                  color: candidate.color.primary,
                  borderColor: `${candidate.color.primary}55`
                }}
              >
                {candidate.archetypeTitle}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-white mt-1.5 tracking-tight">
              {candidate.name}
            </h2>
            <p className="text-xs font-display font-bold text-slate-300 mt-0.5">
              {candidate.titleRole}
            </p>
            <p className="text-sm font-sans font-medium italic text-slate-200 mt-1 flex items-center justify-center sm:justify-start gap-1">
              <Quote className="w-4 h-4 text-cyan-400 opacity-60 inline" /> &ldquo;{candidate.slogan}&rdquo;
            </p>
          </div>
        </div>

        {/* Dossier Body Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
          {/* Ideology & Platform */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-display font-bold text-cyan-400 uppercase tracking-wider">
              <Brain className="w-4 h-4 text-cyan-400" /> Core Ideology &amp; Vision
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              {candidate.ideology}
            </p>
          </div>

          {/* Psychological Motivations */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-display font-bold text-amber-400 uppercase tracking-wider">
              <Target className="w-4 h-4 text-amber-400" /> Hidden Motivations
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              {candidate.motivations}
            </p>
          </div>

          {/* Speaking & Rhetorical Style */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-display font-bold text-emerald-400 uppercase tracking-wider">
              <MessageSquareQuote className="w-4 h-4 text-emerald-400" /> Rhetorical Style
            </span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              {candidate.speakingStyle}
            </p>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-display font-bold text-purple-400 uppercase tracking-wider">
              <Shield className="w-4 h-4 text-purple-400" /> Strengths &amp; Flaws
            </span>
            <div className="flex flex-col gap-1.5 text-xs sm:text-sm text-slate-200 font-sans">
              <div><strong className="text-emerald-400 font-black">+</strong> {candidate.strengths.join(', ')}</div>
              <div><strong className="text-red-400 font-black">-</strong> {candidate.weaknesses.join(', ')}</div>
            </div>
          </div>
        </div>

        {/* Behavioral & Tactical Rules */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col gap-2">
          <span className="flex items-center gap-2 text-xs font-display font-bold text-red-400 uppercase tracking-wider">
            <Swords className="w-4 h-4 text-red-400" /> Tactical AI Behavior &amp; Targets
          </span>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-200 space-y-1 font-sans">
            {candidate.behavioralTendencies.map((tendency, idx) => (
              <li key={idx} className="leading-relaxed">{tendency}</li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mt-2 pt-2.5 border-t border-slate-800 text-xs text-slate-300 font-mono">
            <span className="uppercase font-bold text-red-400">Primary Targets:</span>
            <span>{candidate.rivalArchetypes.join(', ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
