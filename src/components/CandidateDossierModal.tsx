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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-950 border-2 border-slate-800 p-6 md:p-8 shadow-2xl custom-scrollbar"
        style={{ borderColor: `${candidate.color.primary}80` }}
      >
        {/* Header Actions */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          {onEditCandidate && (
            <button
              onClick={() => {
                onEditCandidate(candidate);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-white border border-slate-800 text-xs font-mono font-bold transition"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Parameters
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-slate-800/80">
          <CandidateAvatar
            candidate={candidate}
            size="lg"
            showBadge={false}
          />
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {candidate.codename}
              </span>
              <span 
                className="text-[11px] font-bold uppercase"
                style={{ color: candidate.color.primary }}
              >
                {candidate.archetypeTitle}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              {candidate.name}
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {candidate.titleRole}
            </p>
            <p className="text-sm font-medium italic text-slate-300 mt-1 flex items-center justify-center sm:justify-start gap-1">
              <Quote className="w-3.5 h-3.5 opacity-50 inline" /> "{candidate.slogan}"
            </p>
          </div>
        </div>

        {/* Dossier Body Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
          {/* Ideology & Platform */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Brain className="w-4 h-4" /> Core Ideology
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {candidate.ideology}
            </p>
          </div>

          {/* Psychological Motivations */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Target className="w-4 h-4" /> Hidden Motivations
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {candidate.motivations}
            </p>
          </div>

          {/* Speaking & Rhetorical Style */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <MessageSquareQuote className="w-4 h-4" /> Rhetorical Style
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {candidate.speakingStyle}
            </p>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <Shield className="w-4 h-4" /> Strengths & Flaws
            </span>
            <div className="flex flex-col gap-1 text-xs text-slate-300">
              <div><strong className="text-emerald-400">+</strong> {candidate.strengths.join(', ')}</div>
              <div><strong className="text-red-400">-</strong> {candidate.weaknesses.join(', ')}</div>
            </div>
          </div>
        </div>

        {/* Behavioral & Tactical Rules */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2">
          <span className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
            <Swords className="w-4 h-4" /> Tactical AI Behavior & Rivals
          </span>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
            {candidate.behavioralTendencies.map((tendency, idx) => (
              <li key={idx} className="leading-relaxed">{tendency}</li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span className="font-mono uppercase font-bold text-red-400">Primary Targets:</span>
            <span>{candidate.rivalArchetypes.join(', ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
