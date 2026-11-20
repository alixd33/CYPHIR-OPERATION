/**
 * Single Source of Truth for Characters (TDS v2.2.4)
 * 6 Head/Hair Models x 4 Civilian Outfits = 24 Player Appearances + 4 Named Chapter 1 NPCs.
 */

export const PLAYER_APPEARANCES = [
  { id: 'app-0', name: 'کلاسیک تیره', skin: '#E0B290', hair: '#242026', glasses: false, beard: false, longHair: false, part: 'center' },
  { id: 'app-1', name: 'مدیترانه‌ای (ریش)', skin: '#C89672', hair: '#2E1E18', glasses: false, beard: true, longHair: false, part: 'short' },
  { id: 'app-2', name: 'عینکی تحلیلی', skin: '#E8C0A2', hair: '#483426', glasses: true, beard: false, longHair: false, part: 'side' },
  { id: 'app-3', name: 'فرمانده نقره‌ای', skin: '#DEB698', hair: '#B6BCC4', glasses: false, beard: false, longHair: false, part: 'swept' },
  { id: 'app-4', name: 'مدرن موج‌دار', skin: '#ECC4A6', hair: '#7A3E26', glasses: false, beard: false, longHair: false, part: 'tall' },
  { id: 'app-5', name: 'تحلیلگر موی بلند', skin: '#E6BCA0', hair: '#2A2226', glasses: true, beard: false, longHair: true, part: 'long' },
];

export const PLAYER_OUTFITS = [
  { id: 'out-0', name: 'کت و شلوار رسمی (Formal Suit)', style: 'formal', coat: '#252B30', coatHi: '#46515A', shirt: '#E8E1D3', accent: '#75B8A8', pants: '#1A1E24' },
  { id: 'out-1', name: 'اسمارت کژوال (Smart Casual)', style: 'casual', coat: '#245B59', coatHi: '#398B82', shirt: '#E8E1D3', accent: '#E3C77D', pants: '#23282E' },
  { id: 'out-2', name: 'استایل تحلیلگر (Analyst Style)', style: 'analyst', coat: '#73523E', coatHi: '#8E664C', shirt: '#CBBE9D', accent: '#C6A15B', pants: '#282528' },
  { id: 'out-3', name: 'اداری مدرن (Modern Office)', style: 'modern', coat: '#46515A', coatHi: '#77828A', shirt: '#E8E1D3', accent: '#E3C77D', pants: '#1F242A' },
];

export const NPC_ROSTER = {
  kiani: {
    id: 'npc-director',
    npcKey: 'kiani',
    name: 'مدیر کیانی',
    role: 'رئیس بخش عملیات CIPHER ژنو',
    portraitIndex: 12,
    spriteSheet: '/assets/art/characters/npc/kiani/spritesheet.png',
  },
  nava: {
    id: 'npc-nava',
    npcKey: 'nava',
    name: 'ناوا فرهادی',
    role: 'تحلیلگر ارشد داده و رمزنگاری',
    portraitIndex: 13,
    spriteSheet: '/assets/art/characters/npc/nava/spritesheet.png',
  },
  arash: {
    id: 'npc-arash',
    npcKey: 'arash',
    name: 'آرش کاظمی',
    role: 'متخصص فنی اتاق سرور 7',
    portraitIndex: 14,
    spriteSheet: '/assets/art/characters/npc/arash/spritesheet.png',
  },
  arman: {
    id: 'npc-arman',
    npcKey: 'arman',
    name: 'آرمان راد',
    role: 'مسئول امنیت و بازبینی دوربین‌ها',
    portraitIndex: 16,
    spriteSheet: '/assets/art/characters/npc/arman/spritesheet.png',
  },
};
