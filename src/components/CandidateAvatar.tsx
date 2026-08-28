import React from 'react';
import { Candidate } from '@/types/candidate';
import { 
  Flame, 
  Cpu, 
  ShieldAlert, 
  HeartHandshake, 
  DollarSign, 
  Sprout, 
  Eye, 
  Scale, 
  Scroll, 
  Dices,
  Crown,
  Skull,
  Landmark
} from 'lucide-react';

interface CandidateAvatarProps {
  candidate: Candidate;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isSpeaking?: boolean;
  isAttacking?: boolean;
  isTarget?: boolean;
  isEliminated?: boolean;
  isPresident?: boolean;
  showBadge?: boolean;
}

export const CandidateAvatar: React.FC<CandidateAvatarProps> = ({
  candidate,
  size = 'md',
  isSpeaking = false,
  isAttacking = false,
  isTarget = false,
  isEliminated = false,
  isPresident = false,
  showBadge = true,
}) => {
  const sizeMap = {
    sm: { box: 'w-10 h-10', icon: 18, text: 'text-xs' },
    md: { box: 'w-14 h-14', icon: 24, text: 'text-sm' },
    lg: { box: 'w-24 h-24', icon: 40, text: 'text-lg' },
    xl: { box: 'w-36 h-36', icon: 60, text: 'text-2xl' },
  };

  const currentSize = sizeMap[size];

  const renderIcon = () => {
    const iconSize = currentSize.icon;
    switch (candidate.avatar.svgType) {
      case 'landmark':
        return <Landmark size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'flame':
        return <Flame size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'cpu':
        return <Cpu size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'shield':
        return <ShieldAlert size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'heart':
        return <HeartHandshake size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'dollar':
        return <DollarSign size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'leaf':
        return <Sprout size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'eye':
        return <Eye size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'scale':
        return <Scale size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'scroll':
        return <Scroll size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      case 'dice':
        return <Dices size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
      default:
        return <Flame size={iconSize} className={isEliminated ? 'text-stone-500' : candidate.color.text} />;
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center select-none">
      {/* Outer Glow / Speaking Pulse */}
      {isSpeaking && (
        <span 
          className="absolute inset-0 rounded-2xl animate-ping opacity-40 -z-10"
          style={{ backgroundColor: candidate.color.primary }}
        />
      )}

      {/* Target Laser Alert Ring */}
      {isTarget && (
        <span className="absolute -inset-2 rounded-2xl border-2 border-red-500 animate-pulse-glow" />
      )}

      {/* Main Avatar Body */}
      <div 
        className={`relative flex items-center justify-center rounded-2xl border transition-all duration-300 ${currentSize.box} ${
          isEliminated
            ? 'bg-stone-900/90 border-stone-800 opacity-60 grayscale'
            : isSpeaking
            ? `bg-slate-900 border-2 ${candidate.color.border} shadow-lg shadow-${candidate.color.primary}/30 scale-105`
            : isPresident
            ? 'bg-amber-950/80 border-2 border-amber-400 shadow-xl shadow-amber-500/40'
            : 'bg-slate-900/80 border-slate-700/60 hover:border-slate-500'
        }`}
        style={{
          boxShadow: isSpeaking ? `0 0 20px ${candidate.color.primary}44` : undefined,
        }}
      >
        {/* Background Cyber Pattern */}
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />

        {/* Icon */}
        <div className="relative z-10">
          {renderIcon()}
        </div>

        {/* Eliminated Overlay */}
        {isEliminated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-2xl backdrop-blur-xs">
            <Skull className="text-red-500/80" size={currentSize.icon * 0.9} />
          </div>
        )}

        {/* President Crown Top Badge */}
        {isPresident && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 p-1 rounded-full shadow-lg shadow-amber-500/50 animate-bounce">
            <Crown size={size === 'xl' ? 24 : 14} />
          </div>
        )}

        {/* Attack Crosshair Marker */}
        {isAttacking && (
          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-md animate-pulse">
            ATTACK
          </div>
        )}
      </div>

      {/* Archetype Bottom Badge */}
      {showBadge && size !== 'sm' && (
        <div 
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase whitespace-nowrap border shadow-sm ${
            isEliminated 
              ? 'bg-stone-900 text-stone-500 border-stone-800' 
              : 'bg-slate-950/90 text-slate-300 border-slate-700'
          }`}
        >
          {candidate.codename}
        </div>
      )}
    </div>
  );
};
