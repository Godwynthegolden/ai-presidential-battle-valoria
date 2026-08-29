export type Archetype = 
  | 'populist'
  | 'technocrat'
  | 'hawk'
  | 'reformer'
  | 'capitalist'
  | 'socialist'
  | 'environmentalist'
  | 'conspiracy'
  | 'careerist'
  | 'traditionalist'
  | 'wildcard';

export type CandidateSvgIcon = 
  | 'flame' 
  | 'cpu' 
  | 'shield' 
  | 'heart' 
  | 'dollar' 
  | 'leaf' 
  | 'eye' 
  | 'scale' 
  | 'scroll' 
  | 'dice' 
  | 'briefcase' 
  | 'landmark' 
  | 'building' 
  | 'users' 
  | 'award'
  | 'zap'
  | 'crown'
  | 'globe'
  | 'swords'
  | 'radio'
  | 'activity'
  | 'star'
  | 'hammer';

export interface Candidate {
  id: string;
  name: string;
  codename: string;
  archetype: Archetype;
  archetypeTitle: string;
  titleRole: string; // e.g. "Rust-Belt Governor", "Former Central Bank Governor"
  slogan: string;
  ideology: string;
  personality: string;
  speakingStyle: string;
  motivations: string;
  strengths: string[];
  weaknesses: string[];
  behavioralTendencies: string[];
  rivalArchetypes: Archetype[];
  color: {
    name?: string;
    primary: string;
    bg: string;
    border: string;
    text: string;
    glow: string;
    gradient: string;
  };
  avatar: {
    icon: string;
    svgType: CandidateSvgIcon;
  };
  customAvatarUrl?: string; // Cropped custom uploaded photo / avatar
  isCustom?: boolean;       // Flag if created by user
  systemPrompt: string;
}
