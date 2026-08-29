'use client';

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
  Landmark,
  Hammer,
  Zap,
  Globe,
  Swords,
  Radio,
  Award,
  Activity,
  Star,
  Building2,
  Users,
  Shield,
  Briefcase
} from 'lucide-react';

interface CandidateAvatarProps {
  candidate: Candidate;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
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
    xs: { box: 'w-6 h-6', icon: 12, text: 'text-[9px]' },
    sm: { box: 'w-10 h-10', icon: 18, text: 'text-xs' },
    md: { box: 'w-14 h-14', icon: 24, text: 'text-sm' },
    lg: { box: 'w-24 h-24', icon: 40, text: 'text-lg' },
    xl: { box: 'w-36 h-36', icon: 60, text: 'text-2xl' },
  };

  const currentSize = sizeMap[size];

  const renderIcon = () => {
    const iconSize = currentSize.icon;
    const isTailwindClass = candidate.color.text?.startsWith('text-');
    const colorClass = isEliminated ? 'text-stone-500' : (isTailwindClass ? candidate.color.text : undefined);
    const customColor = !isEliminated && !isTailwindClass ? (candidate.color.primary || candidate.color.text) : undefined;
    const iconStyle = customColor ? { color: customColor } : undefined;

    switch (candidate.avatar.svgType) {
      case 'landmark':
        return <Landmark size={iconSize} className={colorClass} style={iconStyle} />;
      case 'flame':
        return <Flame size={iconSize} className={colorClass} style={iconStyle} />;
      case 'cpu':
        return <Cpu size={iconSize} className={colorClass} style={iconStyle} />;
      case 'shield':
        return <ShieldAlert size={iconSize} className={colorClass} style={iconStyle} />;
      case 'heart':
        return <HeartHandshake size={iconSize} className={colorClass} style={iconStyle} />;
      case 'dollar':
        return <DollarSign size={iconSize} className={colorClass} style={iconStyle} />;
      case 'leaf':
        return <Sprout size={iconSize} className={colorClass} style={iconStyle} />;
      case 'eye':
        return <Eye size={iconSize} className={colorClass} style={iconStyle} />;
      case 'scale':
        return <Scale size={iconSize} className={colorClass} style={iconStyle} />;
      case 'scroll':
        return <Scroll size={iconSize} className={colorClass} style={iconStyle} />;
      case 'dice':
        return <Dices size={iconSize} className={colorClass} style={iconStyle} />;
      case 'hammer':
        return <Hammer size={iconSize} className={colorClass} style={iconStyle} />;
      case 'zap':
        return <Zap size={iconSize} className={colorClass} style={iconStyle} />;
      case 'crown':
        return <Crown size={iconSize} className={colorClass} style={iconStyle} />;
      case 'globe':
        return <Globe size={iconSize} className={colorClass} style={iconStyle} />;
      case 'swords':
        return <Swords size={iconSize} className={colorClass} style={iconStyle} />;
      case 'radio':
        return <Radio size={iconSize} className={colorClass} style={iconStyle} />;
      case 'award':
        return <Award size={iconSize} className={colorClass} style={iconStyle} />;
      case 'activity':
        return <Activity size={iconSize} className={colorClass} style={iconStyle} />;
      case 'star':
        return <Star size={iconSize} className={colorClass} style={iconStyle} />;
      case 'building':
        return <Building2 size={iconSize} className={colorClass} style={iconStyle} />;
      case 'users':
        return <Users size={iconSize} className={colorClass} style={iconStyle} />;
      case 'briefcase':
        return <Briefcase size={iconSize} className={colorClass} style={iconStyle} />;
      default:
        return <Flame size={iconSize} className={colorClass} style={iconStyle} />;
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
        className={`relative flex items-center justify-center rounded-2xl border overflow-hidden transition-all duration-300 ${currentSize.box} ${
          isEliminated
            ? 'bg-stone-900/90 border-stone-800 opacity-60 grayscale'
            : isSpeaking
            ? `bg-slate-900 border-2 ${candidate.color.border?.startsWith('border-') ? candidate.color.border : ''} shadow-lg scale-105`
            : isPresident
            ? 'bg-amber-950/80 border-2 border-amber-400 shadow-xl shadow-amber-500/40'
            : 'bg-slate-900/80 border-slate-700/60 hover:border-slate-500'
        }`}
        style={{
          boxShadow: isSpeaking ? `0 0 20px ${candidate.color.primary}44` : undefined,
          borderColor: isSpeaking && !candidate.color.border?.startsWith('border-') ? candidate.color.primary : undefined,
        }}
      >
        {/* Background Cyber Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />

        {/* Custom Image or SVG Icon */}
        {candidate.customAvatarUrl ? (
          <img 
            src={candidate.customAvatarUrl} 
            alt={candidate.name} 
            className={`w-full h-full object-cover rounded-2xl ${isEliminated ? 'grayscale opacity-50' : ''}`} 
          />
        ) : (
          <div className="relative z-10">
            {renderIcon()}
          </div>
        )}

        {/* Eliminated Overlay */}
        {isEliminated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-2xl backdrop-blur-xs z-20">
            <Skull className="text-red-500/80" size={currentSize.icon * 0.9} />
          </div>
        )}

        {/* President Crown Top Badge */}
        {isPresident && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 p-1 rounded-full shadow-lg shadow-amber-500/50 animate-bounce z-30">
            <Crown size={size === 'xl' ? 24 : 14} />
          </div>
        )}

        {/* Attack Crosshair Marker */}
        {isAttacking && (
          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-md animate-pulse z-30">
            ATTACK
          </div>
        )}
      </div>

      {/* Archetype Bottom Badge */}
      {showBadge && size !== 'sm' && (
        <div 
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase whitespace-nowrap border shadow-sm z-30 ${
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
