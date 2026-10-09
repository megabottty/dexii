import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VaultService } from './vault.service';

describe('VaultService bulk delete', () => {
  beforeEach(() => {
    let n = 0;
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => `blob:test/${++n}`, revokeObjectURL: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('removes every selected photo and frees its object URL', () => {
    const vault = new VaultService();
    vault.uploadImage(new File(['a'], 'a.png'));
    vault.uploadImage(new File(['b'], 'b.png'));
    vault.uploadImage(new File(['c'], 'c.png'));
    const [a, , c] = vault.files();
    vault.deleteFiles([a.id, c.id]);
    expect(vault.files().map((f) => f.name)).toEqual(['b.png']);
    expect((URL.revokeObjectURL as unknown as { mock: { calls: unknown[][] } }).mock.calls).toHaveLength(2);
  });

  it('ignores an empty selection', () => {
    const vault = new VaultService();
    vault.uploadImage(new File(['a'], 'a.png'));
    vault.deleteFiles([]);
    expect(vault.files()).toHaveLength(1);
  });
});
