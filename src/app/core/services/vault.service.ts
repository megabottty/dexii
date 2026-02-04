import { Injectable, signal } from '@angular/core';

export interface VaultFile {
  id: string;
  name: string;
  url: string;
  isSensitive: boolean;
  uploadedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class VaultService {
  private _files = signal<VaultFile[]>([]);
  public files = this._files.asReadonly();

  uploadImage(file: File): void {
    // Mock upload logic
    const newFile: VaultFile = {
      id: Math.random().toString(36).substring(2),
      name: file.name,
      url: URL.createObjectURL(file), // Mock URL
      isSensitive: true, // All vault uploads are flagged as sensitive by default
      uploadedAt: new Date()
    };

    this._files.update(files => [...files, newFile]);
  }

  deleteFile(id: string): void {
    this._files.update(files => files.filter(f => f.id !== id));
  }
}
