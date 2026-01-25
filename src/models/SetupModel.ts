import type { ISetup } from './types';

export class SetupModel implements ISetup {
  id: string;
  name: string;
  resizingTimes: number;
  resizingRatios: number[];

  constructor (data: Partial<ISetup> = {}) {
    this.id = data.id || crypto.randomUUID();
    this.name = data.name || 'Default Setup';
    this.resizingTimes = data.resizingTimes || 1;
    this.resizingRatios = data.resizingRatios || [1];

    // Validate ratios match resizing times
    if (this.resizingRatios.length !== this.resizingTimes) {
      // Auto-fill or trim
      if (this.resizingRatios.length < this.resizingTimes) {
        const fillCount = this.resizingTimes - this.resizingRatios.length;
        this.resizingRatios = [...this.resizingRatios, ...Array(fillCount).fill(1)];
      } else {
        this.resizingRatios = this.resizingRatios.slice(0, this.resizingTimes);
      }
    }
  }

  static fromJSON (json: string): SetupModel {
    const data = JSON.parse(json);
    return new SetupModel(data);
  }

  toJSON (): ISetup {
    return {
      id: this.id,
      name: this.name,
      resizingTimes: this.resizingTimes,
      resizingRatios: this.resizingRatios,
    };
  }

  validate (): boolean {
    return (
      this.resizingTimes > 0 &&
      this.resizingRatios.length === this.resizingTimes &&
      this.resizingRatios.every((r) => r > 0)
    );
  }
}
