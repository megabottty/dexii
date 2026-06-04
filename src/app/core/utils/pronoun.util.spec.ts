import { getPronoun, capitalize, pronounText } from './pronoun.util';

describe('Pronoun Utility', () => {
  describe('getPronoun', () => {
    it('should return correct subject pronoun for "he"', () => {
      expect(getPronoun('he', 'subject')).toBe('he');
    });

    it('should return correct subject pronoun for "she"', () => {
      expect(getPronoun('she', 'subject')).toBe('she');
    });

    it('should return correct subject pronoun for "they"', () => {
      expect(getPronoun('they', 'subject')).toBe('they');
    });

    it('should return correct possessive pronoun for "he"', () => {
      expect(getPronoun('he', 'possessive')).toBe('his');
    });

    it('should return correct possessive pronoun for "she"', () => {
      expect(getPronoun('she', 'possessive')).toBe('her');
    });

    it('should return correct possessive pronoun for "they"', () => {
      expect(getPronoun('they', 'possessive')).toBe('their');
    });

    it('should default to "they" for undefined pronouns', () => {
      expect(getPronoun(undefined, 'subject')).toBe('they');
    });

    it('should default to "they" for custom pronouns', () => {
      expect(getPronoun('custom', 'subject')).toBe('they');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter of string', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should handle already capitalized strings', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should handle single character strings', () => {
      expect(capitalize('a')).toBe('A');
    });
  });

  describe('pronounText', () => {
    it('should replace "his" with "her" for she/her pronouns', () => {
      const text = 'His favorite color is blue';
      expect(pronounText(text, 'she')).toBe('Her favorite color is blue');
    });

    it('should replace "his" with "their" for they/them pronouns', () => {
      const text = 'His favorite color is blue';
      expect(pronounText(text, 'they')).toBe('Their favorite color is blue');
    });

    it('should handle multiple pronoun replacements', () => {
      const text = 'He loves his favorite book';
      expect(pronounText(text, 'she')).toBe('She loves her favorite book');
    });

    it('should preserve lowercase pronouns', () => {
      const text = 'I saw him with his friend';
      expect(pronounText(text, 'she')).toBe('I saw her with her friend');
    });

    it('should preserve capitalized pronouns at start of sentence', () => {
      const text = 'He is amazing. His smile is great.';
      expect(pronounText(text, 'they')).toBe('They is amazing. Their smile is great.');
    });

    it('should handle object pronouns', () => {
      const text = 'I gave him a gift';
      expect(pronounText(text, 'she')).toBe('I gave her a gift');
      expect(pronounText(text, 'they')).toBe('I gave them a gift');
    });

    it('should not replace pronouns within words', () => {
      const text = 'The theory is sound';
      const result = pronounText(text, 'she');
      expect(result).toBe('The theory is sound'); // "the" should not become "sher"
    });

    it('should default to "they" for undefined pronouns', () => {
      const text = 'His favorite color';
      expect(pronounText(text, undefined)).toBe('Their favorite color');
    });

    it('should handle complex sentences', () => {
      const text = 'He said his friend told him that his car was fixed';
      expect(pronounText(text, 'she')).toBe('She said her friend told her that her car was fixed');
    });
  });
});
