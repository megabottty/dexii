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
 * count as chosen, so a real name still wins over it when there is one.
 */
export function personName(person: NamedPerson | null | undefined, fallback = 'A friend'): string {
  if (!person) return fallback;
  const username = String(person.username || '').trim();
  const chosen = String(person.displayName || '').trim();
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
