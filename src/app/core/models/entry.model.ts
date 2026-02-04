export type EntryType = 'Note' | 'Date' | 'RedFlag';

export interface Entry {
  id: string;
  crushId: string;
  type: EntryType;
  content: string;
  timestamp: Date;
}
