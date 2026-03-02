import type { ITagValue } from './types';

export class TagValueModel implements ITagValue {
  id: string;
  fieldId: string;
  label: string;
  createdAt: number;

  constructor(data: Partial<ITagValue> = {}) {
    this.id = data.id || crypto.randomUUID();
    this.fieldId = data.fieldId || '';
    this.label = data.label?.trim() || 'New Value';
    this.createdAt = data.createdAt || Date.now();
  }
}
