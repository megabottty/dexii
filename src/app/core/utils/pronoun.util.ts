export interface PronounSet {
  subject: string;        // he/she/they
  object: string;         // him/her/them
  possessive: string;     // his/her/their
  possessivePronoun: string; // his/hers/theirs
  reflexive: string;      // himself/herself/themself
}

const PRONOUN_SETS: { [key: string]: PronounSet } = {
  he: {
    subject: 'he',
    object: 'him',
    possessive: 'his',
    possessivePronoun: 'his',
    reflexive: 'himself'
  },
  she: {
    subject: 'she',
    object: 'her',
    possessive: 'her',
    possessivePronoun: 'hers',
    reflexive: 'herself'
  },
  they: {
    subject: 'they',
    object: 'them',
    possessive: 'their',
    possessivePronoun: 'theirs',
    reflexive: 'themself'
  },
  custom: {
    subject: 'they',
    object: 'them',
    possessive: 'their',
    possessivePronoun: 'theirs',
    reflexive: 'themself'
  }
};

export function getPronoun(pronounKey: string | undefined, type: keyof PronounSet): string {
  const key = pronounKey || 'they';
  const pronounSet = PRONOUN_SETS[key] || PRONOUN_SETS['they'];
  return pronounSet[type];
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper function to replace pronoun placeholders in text
// Usage: pronounText("His favorite color is blue", "she") -> "Her favorite color is blue"
export function pronounText(text: string, pronounKey: string | undefined): string {
  const key = pronounKey || 'they';
  const pronouns = PRONOUN_SETS[key] || PRONOUN_SETS['they'];

  let result = text;

  // Replace capitalized versions
  result = result.replace(/\bHis\b/g, capitalize(pronouns.possessive));
  result = result.replace(/\bHer\b/g, capitalize(pronouns.possessive));
  result = result.replace(/\bTheir\b/g, capitalize(pronouns.possessive));
  result = result.replace(/\bHe\b/g, capitalize(pronouns.subject));
  result = result.replace(/\bShe\b/g, capitalize(pronouns.subject));
  result = result.replace(/\bThey\b/g, capitalize(pronouns.subject));
  result = result.replace(/\bHim\b/g, capitalize(pronouns.object));
  result = result.replace(/\bThem\b/g, capitalize(pronouns.object));

  // Replace lowercase versions
  result = result.replace(/\bhis\b/g, pronouns.possessive);
  result = result.replace(/\bher\b/g, pronouns.possessive);
  result = result.replace(/\btheir\b/g, pronouns.possessive);
  result = result.replace(/\bhe\b/g, pronouns.subject);
  result = result.replace(/\bshe\b/g, pronouns.subject);
  result = result.replace(/\bthey\b/g, pronouns.subject);
  result = result.replace(/\bhim\b/g, pronouns.object);
  result = result.replace(/\bthem\b/g, pronouns.object);

  return result;
}
