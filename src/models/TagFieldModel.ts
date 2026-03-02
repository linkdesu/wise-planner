import type { ITagField } from './types';

export class TagFieldModel implements ITagField {
  id: string;
  name: string;
  type: 'single' | 'multi' | 'boolean' | 'number';
  sortOrder: number;
  isCore: boolean;
  isActive: boolean;
  createdAt: number;

  constructor(data: Partial<ITagField> = {}) {
    this.id = data.id || crypto.randomUUID();
    this.name = data.name?.trim() || 'New Field';
    this.type = data.type || 'single';
    this.sortOrder = data.sortOrder ?? data.createdAt ?? Date.now();
    this.isCore = Boolean(data.isCore);
    this.isActive = data.isActive ?? true;
    this.createdAt = data.createdAt || Date.now();
  }
}
