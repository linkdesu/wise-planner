import type { ITagField, ITagValue } from './types';

export const CORE_TAG_FIELDS: ITagField[] = [
  {
    id: 'core-entry-strategy',
    name: 'Entry strategy',
    type: 'single',
    sortOrder: 1,
    isCore: true,
    isActive: true,
    createdAt: 1,
  },
  {
    id: 'core-exit-strategy',
    name: 'Exit strategy',
    type: 'single',
    sortOrder: 2,
    isCore: true,
    isActive: true,
    createdAt: 2,
  },
  {
    id: 'core-htf-market-structure',
    name: 'HTF market structure',
    type: 'single',
    sortOrder: 3,
    isCore: true,
    isActive: true,
    createdAt: 3,
  },
  {
    id: 'core-ltf-market-structure',
    name: 'LTF market structure',
    type: 'single',
    sortOrder: 4,
    isCore: true,
    isActive: true,
    createdAt: 4,
  },
  {
    id: 'core-timeframe',
    name: 'Timeframe',
    type: 'single',
    sortOrder: 5,
    isCore: true,
    isActive: true,
    createdAt: 5,
  },
];

export const CORE_TAG_VALUES: ITagValue[] = [
  { id: 'entry-strategy-a', fieldId: 'core-entry-strategy', label: 'A', createdAt: 11 },
  { id: 'entry-strategy-b', fieldId: 'core-entry-strategy', label: 'B', createdAt: 12 },
  { id: 'entry-strategy-c', fieldId: 'core-entry-strategy', label: 'C', createdAt: 13 },

  { id: 'exit-strategy-a', fieldId: 'core-exit-strategy', label: 'A', createdAt: 21 },
  { id: 'exit-strategy-b', fieldId: 'core-exit-strategy', label: 'B', createdAt: 22 },
  { id: 'exit-strategy-c', fieldId: 'core-exit-strategy', label: 'C', createdAt: 23 },

  { id: 'htf-range', fieldId: 'core-htf-market-structure', label: 'Range', createdAt: 31 },
  {
    id: 'htf-bull-breakout',
    fieldId: 'core-htf-market-structure',
    label: 'Bull Breakout',
    createdAt: 32,
  },
  {
    id: 'htf-bear-breakout',
    fieldId: 'core-htf-market-structure',
    label: 'Bear Breakout',
    createdAt: 33,
  },
  {
    id: 'htf-tight-bull-channel',
    fieldId: 'core-htf-market-structure',
    label: 'Tight Bull Channel',
    createdAt: 34,
  },
  {
    id: 'htf-tight-bear-channel',
    fieldId: 'core-htf-market-structure',
    label: 'Tight Bear Channel',
    createdAt: 35,
  },
  {
    id: 'htf-broard-bull-channel',
    fieldId: 'core-htf-market-structure',
    label: 'Broard Bull Channel',
    createdAt: 36,
  },
  {
    id: 'htf-broad-bear-channel',
    fieldId: 'core-htf-market-structure',
    label: 'Broad Bear Channel',
    createdAt: 37,
  },

  { id: 'ltf-range', fieldId: 'core-ltf-market-structure', label: 'Range', createdAt: 41 },
  {
    id: 'ltf-bull-breakout',
    fieldId: 'core-ltf-market-structure',
    label: 'Bull Breakout',
    createdAt: 42,
  },
  {
    id: 'ltf-bear-breakout',
    fieldId: 'core-ltf-market-structure',
    label: 'Bear Breakout',
    createdAt: 43,
  },
  {
    id: 'ltf-tight-bull-channel',
    fieldId: 'core-ltf-market-structure',
    label: 'Tight Bull Channel',
    createdAt: 44,
  },
  {
    id: 'ltf-tight-bear-channel',
    fieldId: 'core-ltf-market-structure',
    label: 'Tight Bear Channel',
    createdAt: 45,
  },
  {
    id: 'ltf-broard-bull-channel',
    fieldId: 'core-ltf-market-structure',
    label: 'Broard Bull Channel',
    createdAt: 46,
  },
  {
    id: 'ltf-broad-bear-channel',
    fieldId: 'core-ltf-market-structure',
    label: 'Broad Bear Channel',
    createdAt: 47,
  },

  { id: 'timeframe-1m', fieldId: 'core-timeframe', label: '1m', createdAt: 51 },
  { id: 'timeframe-5m', fieldId: 'core-timeframe', label: '5m', createdAt: 52 },
  { id: 'timeframe-15m', fieldId: 'core-timeframe', label: '15m', createdAt: 53 },
  { id: 'timeframe-1h', fieldId: 'core-timeframe', label: '1h', createdAt: 54 },
  { id: 'timeframe-4h', fieldId: 'core-timeframe', label: '4h', createdAt: 55 },
  { id: 'timeframe-1d', fieldId: 'core-timeframe', label: '1D', createdAt: 56 },
];
