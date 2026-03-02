import type { IPositionTag } from './types';

export class PositionTagModel implements IPositionTag {
  id: string;
  positionId: string;
  fieldId: string;
  valueId: string;
  createdAt: number;

  constructor(data: Partial<IPositionTag> = {}) {
    this.id = data.id || crypto.randomUUID();
    this.positionId = data.positionId || '';
    this.fieldId = data.fieldId || '';
    this.valueId = data.valueId || '';
    this.createdAt = data.createdAt || Date.now();
  }
}
