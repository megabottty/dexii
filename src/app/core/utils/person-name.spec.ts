import { describe, expect, it } from 'vitest';
import { personName, selfName } from './person-name';

describe('personName', () => {
  it('prefers a chosen display name, then first and last name, then username', () => {
    expect(personName({ username: 'mgrange', displayName: 'Shelly' })).toBe('Shelly');
    expect(personName({ username: 'mgrange', displayName: 'mgrange', firstName: 'Michelle', lastName: 'Grange' })).toBe('Michelle Grange');
    expect(personName({ username: 'mgrange' })).toBe('mgrange');
  });

  it('never returns an email address as a name', () => {
    expect(personName({ username: 'mgrange', displayName: 'michelle@example.com', firstName: 'Michelle' })).toBe('Michelle');
    expect(personName({ username: 'michelle@example.com', displayName: 'michelle@example.com' })).toBe('A friend');
    expect(personName({ username: 'michelle@example.com' }, 'Someone')).toBe('Someone');
  });
});

describe('selfName', () => {
  it('shows your chosen name, else your @username, never an email', () => {
    expect(selfName('Michelle Grange', 'mgrange')).toBe('Michelle Grange');
    expect(selfName('mgrange', 'mgrange')).toBe('@mgrange');
    expect(selfName('michelle@example.com', 'mgrange')).toBe('@mgrange');
    expect(selfName('', '')).toBe('@guest');
  });
});
