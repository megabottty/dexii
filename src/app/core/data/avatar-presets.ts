import { AvatarConfig } from '../models/avatar-config.model';

export interface AvatarPreset {
  id: string;
  label: string;
  config: AvatarConfig;
}

const preset = (id: string, label: string, config: Omit<AvatarConfig, 'v'>): AvatarPreset => ({
  id,
  label,
  config: { v: 1, ...config }
});

/**
 * Starting points for a crush avatar. Deliberately spread across skin tones,
 * hair textures, head coverings and gender presentations so most people can
 * find a close match, then tweak it in the builder.
 */
export const AVATAR_PRESETS: AvatarPreset[] = [
  // Masculine-presenting
  preset('m-deep-locs', 'Long locs', { skinColor: '614335', top: 'dreads', hairColor: '2c1b18', eyes: 'default', eyebrows: 'defaultNatural', mouth: 'smile', facialHair: 'beardLight', facialHairColor: '2c1b18', clothing: 'hoodie', clothesColor: '262e33', backgroundColor: 'c0e8ff' }),
  preset('m-dark-fade', 'Fade', { skinColor: 'ae5d29', top: 'shortFlat', hairColor: '2c1b18', eyes: 'happy', eyebrows: 'raisedExcitedNatural', mouth: 'twinkle', clothing: 'shirtCrewNeck', clothesColor: 'ffffff', backgroundColor: 'ffdfbf' }),
  preset('m-brown-curly', 'Curly top', { skinColor: 'd08b5b', top: 'shortCurly', hairColor: '4a312c', eyes: 'default', eyebrows: 'default', mouth: 'smile', facialHair: 'beardMedium', facialHairColor: '4a312c', clothing: 'blazerAndShirt', clothesColor: '25557c', backgroundColor: 'f5f3f4' }),
  preset('m-tan-caesar', 'Caesar', { skinColor: 'fd9841', top: 'theCaesar', hairColor: '2c1b18', eyes: 'squint', eyebrows: 'flatNatural', mouth: 'serious', accessories: 'prescription02', accessoriesColor: '262e33', clothing: 'collarAndSweater', clothesColor: '3c4f5c', backgroundColor: 'c0f0dc' }),
  preset('m-medium-waved', 'Waved', { skinColor: 'edb98a', top: 'shortWaved', hairColor: '724133', eyes: 'wink', eyebrows: 'raisedExcited', mouth: 'smile', clothing: 'shirtVNeck', clothesColor: '5199e4', backgroundColor: 'fff3b0' }),
  preset('m-golden-sides', 'Side part', { skinColor: 'f8d25c', top: 'theCaesarAndSidePart', hairColor: 'd6b370', eyes: 'default', eyebrows: 'defaultNatural', mouth: 'default', facialHair: 'moustacheFancy', facialHairColor: 'b58143', clothing: 'blazerAndSweater', clothesColor: '929598', backgroundColor: 'e8d5f0' }),
  preset('m-light-shaggy', 'Shaggy', { skinColor: 'ffdbb4', top: 'shaggy', hairColor: 'a55728', eyes: 'happy', eyebrows: 'upDown', mouth: 'twinkle', accessories: 'round', accessoriesColor: '4a312c', clothing: 'graphicShirt', clothesColor: 'ff5c5c', clothingGraphic: 'skull', backgroundColor: 'd1d4f9' }),
  preset('m-dark-fro', 'Afro', { skinColor: 'ae5d29', top: 'fro', hairColor: '2c1b18', eyes: 'default', eyebrows: 'raisedExcitedNatural', mouth: 'smile', facialHair: 'beardMajestic', facialHairColor: '2c1b18', clothing: 'overall', clothesColor: 'a7ffc4', backgroundColor: 'f6e7c1' }),

  // Feminine-presenting
  preset('f-deep-bighair', 'Big hair', { skinColor: '614335', top: 'bigHair', hairColor: '2c1b18', eyes: 'happy', eyebrows: 'defaultNatural', mouth: 'smile', clothing: 'shirtScoopNeck', clothesColor: 'ff488e', backgroundColor: 'fff3b0' }),
  preset('f-dark-locs', 'Locs', { skinColor: 'ae5d29', top: 'dreads02', hairColor: '2c1b18', eyes: 'default', eyebrows: 'raisedExcitedNatural', mouth: 'twinkle', accessories: 'prescription01', accessoriesColor: 'd4af37', clothing: 'blazerAndShirt', clothesColor: 'e6e6e6', backgroundColor: 'e8d5f0' }),
  preset('f-brown-curly', 'Curls', { skinColor: 'd08b5b', top: 'curly', hairColor: '4a312c', eyes: 'hearts', eyebrows: 'default', mouth: 'smile', clothing: 'shirtVNeck', clothesColor: 'ffafb9', backgroundColor: 'c0e8ff' }),
  preset('f-tan-straight', 'Long straight', { skinColor: 'fd9841', top: 'straight01', hairColor: '2c1b18', eyes: 'default', eyebrows: 'defaultNatural', mouth: 'default', clothing: 'collarAndSweater', clothesColor: '25557c', backgroundColor: 'ffd5dc' }),
  preset('f-medium-bob', 'Bob', { skinColor: 'edb98a', top: 'bob', hairColor: 'c93305', eyes: 'wink', eyebrows: 'raisedExcited', mouth: 'smile', clothing: 'hoodie', clothesColor: '3c4f5c', backgroundColor: 'c0f0dc' }),
  preset('f-golden-bun', 'Bun', { skinColor: 'f8d25c', top: 'bun', hairColor: '724133', eyes: 'happy', eyebrows: 'upDownNatural', mouth: 'twinkle', accessories: 'round', accessoriesColor: '262e33', clothing: 'shirtCrewNeck', clothesColor: 'ffffff', backgroundColor: 'd1d4f9' }),
  preset('f-light-long', 'Long waves', { skinColor: 'ffdbb4', top: 'longButNotTooLong', hairColor: 'd6b370', eyes: 'default', eyebrows: 'defaultNatural', mouth: 'smile', clothing: 'shirtScoopNeck', clothesColor: 'a881af', backgroundColor: 'ffdfbf' }),
  preset('f-deep-fro', 'Afro + band', { skinColor: '614335', top: 'froBand', hairColor: '2c1b18', eyes: 'side', eyebrows: 'raisedExcitedNatural', mouth: 'smile', clothing: 'graphicShirt', clothesColor: 'ffffb1', clothingGraphic: 'diamond', backgroundColor: 'f5f3f4' }),

  // Androgynous / neutral
  preset('n-brown-short', 'Short crop', { skinColor: 'd08b5b', top: 'shortRound', hairColor: '2c1b18', eyes: 'default', eyebrows: 'flatNatural', mouth: 'default', clothing: 'shirtCrewNeck', clothesColor: '262e33', backgroundColor: 'c0f0dc' }),
  preset('n-medium-shaved', 'Shaved sides', { skinColor: 'edb98a', top: 'shavedSides', hairColor: 'f59797', eyes: 'happy', eyebrows: 'upDown', mouth: 'tongue', accessories: 'wayfarers', accessoriesColor: '262e33', clothing: 'hoodie', clothesColor: 'ff488e', backgroundColor: 'fff3b0' }),
  preset('n-tan-frizzle', 'Frizzle', { skinColor: 'fd9841', top: 'frizzle', hairColor: '65c9ff', eyes: 'squint', eyebrows: 'default', mouth: 'smile', clothing: 'overall', clothesColor: '5199e4', backgroundColor: 'ffd5dc' }),
  preset('n-light-blunt', 'Blunt bangs', { skinColor: 'ffdbb4', top: 'miaWallace', hairColor: '2c1b18', eyes: 'default', eyebrows: 'defaultNatural', mouth: 'serious', clothing: 'blazerAndSweater', clothesColor: '262e33', backgroundColor: 'e8d5f0' }),

  // Head coverings and a couple of fun ones
  preset('h-brown-hijab', 'Hijab', { skinColor: 'd08b5b', top: 'hijab', hairColor: '2c1b18', eyes: 'happy', eyebrows: 'defaultNatural', mouth: 'smile', clothing: 'shirtCrewNeck', clothesColor: 'a881af', backgroundColor: 'c0e8ff' }),
  preset('h-deep-hijab', 'Hijab, rose', { skinColor: '614335', top: 'hijab', hairColor: '2c1b18', eyes: 'default', eyebrows: 'raisedExcitedNatural', mouth: 'twinkle', accessories: 'prescription01', accessoriesColor: '262e33', clothing: 'collarAndSweater', clothesColor: 'ffafb9', backgroundColor: 'f5f3f4' }),
  preset('h-tan-turban', 'Turban', { skinColor: 'fd9841', top: 'turban', hairColor: '2c1b18', eyes: 'default', eyebrows: 'defaultNatural', mouth: 'smile', facialHair: 'beardMajestic', facialHairColor: '2c1b18', clothing: 'blazerAndShirt', clothesColor: '3c4f5c', backgroundColor: 'f6e7c1' }),
  preset('x-medium-shades', 'Mystery', { skinColor: 'ae5d29', top: 'winterHat02', hairColor: '2c1b18', eyes: 'default', eyebrows: 'default', mouth: 'serious', accessories: 'sunglasses', accessoriesColor: '262e33', clothing: 'hoodie', clothesColor: '262e33', backgroundColor: '2b2b2b' })
];
