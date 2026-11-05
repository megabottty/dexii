import { Pipe, PipeTransform } from '@angular/core';

/** Anything the server describes a person with. */
export interface NamedPerson {
  username?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * What to call someone: the display name they chose in Settings, else their
 * first and last name, else their @username. Mirrors server/src/utils/personName.js.
 *
 * A display name that merely repeats the username (the Settings default) doesn't
 * count as chosen, so a real name still wins over it when there is one. An email
 * address is never anyone's name, so one in either field is skipped.
 */
export function personName(person: NamedPerson | null | undefined, fallback = 'A friend'): string {
  if (!person) return fallback;
  const notEmail = (value: unknown) => { const text = String(value || '').trim(); return text.includes('@') ? '' : text; };
  const username = notEmail(person.username);
  const chosen = notEmail(person.displayName);
  if (chosen && chosen.toLowerCase() !== username.toLowerCase()) return chosen;
  const full = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
  return full || username || fallback;
}

/** `{{ friend | personName }}` — the same rule for templates. */
@Pipe({ name: 'personName', standalone: true })
export class PersonNamePipe implements PipeTransform {
  transform(person: NamedPerson | null | undefined, fallback = 'A friend'): string {
    return personName(person, fallback);
  }
}

/** How your own name shows to you: your chosen name, else "@username". */
export function selfName(displayName: string | null | undefined, username: string | null | undefined): string {
  const handle = String(username || '').trim();
  const name = personName({ displayName, username: handle }, '');
  return name && name !== handle ? name : `@${handle.includes('@') ? 'you' : handle || 'guest'}`;
}
