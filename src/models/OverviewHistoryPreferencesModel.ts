export interface OverviewHistoryPreferencesData {
  id: string;
  accountIds: string[];
  setupIds: string[];
  perPage: number;
}

export class OverviewHistoryPreferencesModel implements OverviewHistoryPreferencesData {
  id: string;
  accountIds: string[];
  setupIds: string[];
  perPage: number;

  constructor (data: Partial<OverviewHistoryPreferencesData> = {}) {
    this.id = data.id || 'overview-history';
    this.accountIds = data.accountIds || [];
    this.setupIds = data.setupIds || [];
    this.perPage = data.perPage || 10;
  }
}
