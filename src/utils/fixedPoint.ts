const SCALE_NUM = 1e8;
const SCALE = 100000000n;

export type Fixed = bigint;

export const toFixed = (value: number): Fixed => {
  if (!Number.isFinite(value)) return 0n;
  return BigInt(Math.round(value * SCALE_NUM));
};

export const fromFixed = (value: Fixed): number => Number(value) / SCALE_NUM;

export const mulFixed = (a: Fixed, b: Fixed): Fixed => (a * b) / SCALE;

export const divFixed = (a: Fixed, b: Fixed): Fixed => (b === 0n ? 0n : (a * SCALE) / b);
