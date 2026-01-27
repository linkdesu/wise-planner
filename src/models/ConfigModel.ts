import type { JSONValue } from './types';

export interface ConfigData {
  key: string;
  value: JSONValue;
}

export class Config implements ConfigData {
  key: string;
  value: JSONValue;

  constructor (data: Partial<ConfigData> = {}) {
    this.key = data.key || '';
    this.value = data.value ?? null;
  }
}
