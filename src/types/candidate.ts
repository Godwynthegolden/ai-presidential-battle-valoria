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

export interface CandidateVoiceConfig {
  voiceId: string;        // Fish Audio reference_id
  voiceName: string;      // Display name (e.g. "Adrian", "Donald", "Ethan")
  gender?: 'male' | 'female' | 'neutral';
  category?: string;      // e.g. "Authoritative", "Energetic", "Calm", "Deep", "Tech"
  speed?: number;         // Speech rate (default: 1.0)
  sampleText?: string;    // Sample text for audio preview
}

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
  voice?: CandidateVoiceConfig; // Fish Audio Voice reference
  customAvatarUrl?: string; // Cropped custom uploaded photo / avatar
  isCustom?: boolean;       // Flag if created by user
  systemPrompt: string;
}
