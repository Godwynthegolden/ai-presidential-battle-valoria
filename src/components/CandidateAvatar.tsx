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
  budget?: number;
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
  budget,
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

  const borderThickness = {
    xs: isSpeaking || isTarget || isPresident ? 'border-2' : 'border-[1.5px]',
    sm: isSpeaking || isTarget || isPresident ? 'border-[2.5px]' : 'border-2',
    md: isSpeaking || isTarget || isPresident ? 'border-[3px]' : 'border-2',
    lg: isSpeaking || isTarget || isPresident ? 'border-[3.5px]' : 'border-[2.5px]',
    xl: isSpeaking || isTarget || isPresident ? 'border-4' : 'border-[3px]',
  }[size];

  const targetRingInset = {
    xs: '-inset-1',
    sm: '-inset-1.5',
    md: '-inset-2',
    lg: '-inset-2.5',
    xl: '-inset-3',
  }[size];

  const targetRingWidth = {
    xs: 'border-[1.5px]',
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-[2.5px]',
    xl: 'border-[3px]',
  }[size];

  const attackBadgePos = {
    xs: '-top-1 -right-1',
    sm: '-top-1 -right-1',
    md: 'top-0 right-0',
    lg: 'top-0.5 right-0.5',
    xl: 'top-1 right-1',
  }[size];

  const budgetBadgePos = {
    xs: '-top-1 -left-1',
    sm: '-top-1.5 -left-0.5',
    md: '-top-1.5 -left-1',
    lg: '-top-1 -left-0.5',
    xl: 'top-0.5 left-0.5',
  }[size];

  const budgetBadgeSize = {
    xs: 'px-1 py-[0.5px] text-[7px]',
    sm: 'px-1 py-[0.5px] text-[7.5px]',
    md: 'px-1.5 py-[1px] text-[8px] tracking-tight',
    lg: 'px-2 py-0.5 text-[9px]',
    xl: 'px-2.5 py-0.5 text-[10px]',
  }[size];

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
    <div className="relative inline-flex items-center justify-center select-none rounded-full shrink-0">
      {/* Outer Glow / Speaking Pulse */}
      {isSpeaking && (
        <span 
          className="absolute inset-0 rounded-full animate-ping opacity-30 -z-10 pointer-events-none"
          style={{ backgroundColor: candidate.color.primary }}
        />
      )}

      {/* Target Laser Alert Ring */}
      {isTarget && (
        <span className={`absolute ${targetRingInset} rounded-full ${targetRingWidth} border-red-500 animate-pulse-glow z-20 pointer-events-none`} />
      )}

      {/* Main Avatar Body (Clips Image/Icon into Perfect Circle) */}
      <div 
        className={`relative flex items-center justify-center rounded-full ${borderThickness} overflow-hidden transition-all duration-300 ${currentSize.box} ${
          isEliminated
            ? 'bg-stone-900/90 border-stone-800 opacity-60 grayscale'
            : isSpeaking
            ? 'bg-slate-900 shadow-lg scale-105'
            : isPresident
            ? 'bg-amber-950/80 border-amber-400 shadow-xl shadow-amber-500/40'
            : isTarget
            ? 'bg-red-950/70 border-red-500 shadow-lg shadow-red-500/30'
            : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
        }`}
        style={{
          boxShadow: isEliminated
            ? undefined
            : isSpeaking 
            ? `0 0 25px ${candidate.color.primary}55` 
            : isTarget 
            ? '0 0 20px rgba(239, 68, 68, 0.4)' 
            : isPresident 
            ? '0 0 25px rgba(245, 158, 11, 0.5)' 
            : undefined,
          borderColor: isEliminated
            ? undefined
            : isSpeaking 
            ? (candidate.color.primary || '#06b6d4')
            : isTarget 
            ? '#ef4444' 
            : isPresident 
            ? '#f59e0b' 
            : undefined,
        }}
      >
        {/* Background Cyber Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none rounded-full" />

        {/* Custom Image or SVG Icon */}
        {candidate.customAvatarUrl ? (
          <img 
            src={candidate.customAvatarUrl} 
            alt={candidate.name} 
            className={`w-full h-full object-cover rounded-full ${isEliminated ? 'grayscale opacity-50' : ''}`} 
          />
        ) : (
          <div className="relative z-10 flex items-center justify-center">
            {renderIcon()}
          </div>
        )}

        {/* Eliminated Overlay */}
        {isEliminated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full backdrop-blur-xs z-20">
            <Skull className="text-red-500/80" size={currentSize.icon * 0.9} />
          </div>
        )}
      </div>

      {/* President Crown Top Badge (Placed OUTSIDE overflow-hidden with high z-index) */}
      {isPresident && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black p-1 rounded-full shadow-lg shadow-amber-500/50 animate-pulse z-30 pointer-events-none">
          <Crown size={size === 'xl' ? 24 : size === 'lg' ? 18 : 12} />
        </div>
      )}

      {/* Attack Marker (Placed OUTSIDE overflow-hidden so it never clips) */}
      {isAttacking && showBadge && (
        <div className={`absolute ${attackBadgePos} bg-red-600 text-white text-[10px] font-display font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-950/80 animate-pulse z-30 pointer-events-none border border-red-400`}>
          ATTACK
        </div>
      )}

      {/* Archetype Bottom Badge */}
      {showBadge && size !== 'sm' && size !== 'xs' && (
        <div 
          className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase whitespace-nowrap border shadow-sm z-30 pointer-events-none ${
            isEliminated 
              ? 'bg-stone-900 text-stone-500 border-stone-800' 
              : 'bg-slate-950/95 text-slate-300 border-slate-700'
          }`}
        >
          {candidate.codename}
        </div>
      )}

      {/* Live War Chest Budget Badge */}
      {typeof budget === 'number' && !isEliminated && size !== 'xs' && (
        <div 
          className={`absolute ${budgetBadgePos} ${budgetBadgeSize} bg-emerald-950/95 text-emerald-300 border border-emerald-500/50 font-mono font-bold rounded-full shadow-md z-30 pointer-events-none flex items-center gap-0.5`}
        >
          <span className="text-emerald-400 font-extrabold">$</span>{budget}M
        </div>
      )}
    </div>
  );
};
