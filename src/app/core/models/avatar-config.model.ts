/**
 * Options for the in-app crush avatar builder (rendered with DiceBear's
 * "avataaars" style). Stored on the crush as `avatarConfig` alongside the
 * rendered `avatarUrl`, so an avatar can be re-opened and tweaked later.
 *
 * Colours are hex strings without the leading '#'. Optional parts
 * (facial hair, glasses, shirt graphic) are simply omitted when "none".
 */
export interface AvatarConfig {
  v: 1;
  skinColor: string;
  top: string;
  hairColor: string;
  eyes: string;
  eyebrows: string;
  mouth: string;
  facialHair?: string;
  facialHairColor?: string;
  accessories?: string;
  accessoriesColor?: string;
  clothing: string;
  clothesColor: string;
  clothingGraphic?: string;
  backgroundColor: string;
}

export interface AvatarOption {
  value: string;
  label: string;
}

const opt = (value: string, label: string): AvatarOption => ({ value, label });

/** Allowed values per field, with friendly labels for the builder UI. */
export const AVATAR_OPTIONS = {
  skinColor: [
    opt('614335', 'Deep'), opt('ae5d29', 'Dark'), opt('d08b5b', 'Brown'),
    opt('fd9841', 'Tan'), opt('edb98a', 'Medium'), opt('f8d25c', 'Golden'), opt('ffdbb4', 'Light')
  ],
  hairColor: [
    opt('2c1b18', 'Black'), opt('4a312c', 'Dark brown'), opt('724133', 'Brown'), opt('a55728', 'Auburn'),
    opt('b58143', 'Light brown'), opt('d6b370', 'Blonde'), opt('ecdcbf', 'Platinum'), opt('c93305', 'Red'),
    opt('e8e1e1', 'Silver'), opt('f59797', 'Pink'), opt('65c9ff', 'Blue'), opt('a881af', 'Lilac')
  ],
  top: [
    opt('shortFlat', 'Short flat'), opt('shortRound', 'Short round'), opt('shortWaved', 'Short waved'),
    opt('shortCurly', 'Short curly'), opt('theCaesar', 'Caesar'), opt('theCaesarAndSidePart', 'Side part'),
    opt('sides', 'Buzzed sides'), opt('shavedSides', 'Shaved sides'), opt('frizzle', 'Frizzle'),
    opt('shaggy', 'Shaggy'), opt('shaggyMullet', 'Mullet'), opt('dreads01', 'Short locs'),
    opt('dreads02', 'Locs'), opt('dreads', 'Long locs'), opt('fro', 'Afro'), opt('froBand', 'Afro + band'),
    opt('curly', 'Curly'), opt('curvy', 'Curvy'), opt('bob', 'Bob'), opt('bun', 'Bun'),
    opt('straight01', 'Straight'), opt('straight02', 'Straight, parted'), opt('straightAndStrand', 'Straight + strand'),
    opt('longButNotTooLong', 'Long'), opt('miaWallace', 'Blunt bangs'), opt('bigHair', 'Big hair'),
    opt('frida', 'Braided crown'), opt('hijab', 'Hijab'), opt('turban', 'Turban'), opt('hat', 'Cap'),
    opt('winterHat1', 'Beanie'), opt('winterHat02', 'Beanie, cuffed'), opt('winterHat03', 'Beanie, pompom'),
    opt('winterHat04', 'Beanie, striped')
  ],
  eyes: [
    opt('default', 'Default'), opt('happy', 'Happy'), opt('wink', 'Wink'), opt('hearts', 'Hearts'),
    opt('squint', 'Squint'), opt('side', 'Side glance'), opt('surprised', 'Surprised'), opt('closed', 'Closed'),
    opt('eyeRoll', 'Eye roll'), opt('winkWacky', 'Wacky wink'), opt('cry', 'Teary'), opt('xDizzy', 'Dizzy')
  ],
  eyebrows: [
    opt('default', 'Default'), opt('defaultNatural', 'Natural'), opt('raisedExcited', 'Raised'),
    opt('raisedExcitedNatural', 'Raised, natural'), opt('flatNatural', 'Flat'), opt('upDown', 'Up-down'),
    opt('upDownNatural', 'Up-down, natural'), opt('sadConcerned', 'Concerned'),
    opt('sadConcernedNatural', 'Concerned, natural'), opt('frownNatural', 'Frown'),
    opt('angry', 'Angry'), opt('angryNatural', 'Angry, natural'), opt('unibrowNatural', 'Unibrow')
  ],
  mouth: [
    opt('smile', 'Smile'), opt('default', 'Default'), opt('twinkle', 'Twinkle'), opt('serious', 'Serious'),
    opt('tongue', 'Tongue'), opt('eating', 'Eating'), opt('disbelief', 'Disbelief'), opt('concerned', 'Concerned'),
    opt('grimace', 'Grimace'), opt('sad', 'Sad'), opt('screamOpen', 'Scream'), opt('vomit', 'Bleh')
  ],
  facialHair: [
    opt('', 'None'), opt('beardLight', 'Light beard'), opt('beardMedium', 'Beard'),
    opt('beardMajestic', 'Full beard'), opt('moustacheFancy', 'Moustache'), opt('moustacheMagnum', 'Magnum')
  ],
  accessories: [
    opt('', 'None'), opt('prescription01', 'Glasses'), opt('prescription02', 'Glasses, square'),
    opt('round', 'Round glasses'), opt('kurt', 'Kurt shades'), opt('wayfarers', 'Wayfarers'),
    opt('sunglasses', 'Sunglasses'), opt('eyepatch', 'Eyepatch')
  ],
  clothing: [
    opt('shirtCrewNeck', 'Crew neck'), opt('shirtVNeck', 'V-neck'), opt('shirtScoopNeck', 'Scoop neck'),
    opt('hoodie', 'Hoodie'), opt('graphicShirt', 'Graphic tee'), opt('overall', 'Overalls'),
    opt('collarAndSweater', 'Collar + sweater'), opt('blazerAndShirt', 'Blazer + shirt'),
    opt('blazerAndSweater', 'Blazer + sweater')
  ],
  clothesColor: [
    opt('262e33', 'Charcoal'), opt('3c4f5c', 'Slate'), opt('929598', 'Grey'), opt('e6e6e6', 'Light grey'),
    opt('ffffff', 'White'), opt('25557c', 'Navy'), opt('5199e4', 'Blue'), opt('65c9ff', 'Sky'),
    opt('b1e2ff', 'Ice'), opt('a7ffc4', 'Mint'), opt('ffffb1', 'Butter'), opt('ffafb9', 'Blush'),
    opt('ff488e', 'Hot pink'), opt('ff5c5c', 'Red'), opt('a881af', 'Lilac'), opt('d4af37', 'Gold')
  ],
  clothingGraphic: [
    opt('', 'None'), opt('bear', 'Bear'), opt('deer', 'Deer'), opt('diamond', 'Diamond'), opt('hola', 'Hola'),
    opt('pizza', 'Pizza'), opt('skull', 'Skull'), opt('skullOutline', 'Skull outline'), opt('bat', 'Bat'),
    opt('cumbia', 'Cumbia'), opt('resist', 'Resist')
  ],
  backgroundColor: [
    opt('f5f3f4', 'Pearl'), opt('ffdfbf', 'Peach'), opt('ffd5dc', 'Blush'), opt('e8d5f0', 'Lilac'),
    opt('d1d4f9', 'Periwinkle'), opt('c0e8ff', 'Sky'), opt('c0f0dc', 'Mint'), opt('fff3b0', 'Butter'),
    opt('f6e7c1', 'Gold'), opt('2b2b2b', 'Charcoal')
  ]
} as const satisfies Record<string, readonly AvatarOption[]>;

export type AvatarOptionKey = keyof typeof AVATAR_OPTIONS;
