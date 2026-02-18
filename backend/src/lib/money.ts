import { Prisma } from '@prisma/client';

const USDC_SCALE = 1_000_000n;

function normalizeInput(value: number | string | Prisma.Decimal): string {
  if (typeof value === 'number') {
    return value.toFixed(6);
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.toFixed(6);
}

export function toUSDCMicro(value: number | string | Prisma.Decimal): bigint {
  const normalized = normalizeInput(value).trim();
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholePartRaw, fracPartRaw = ''] = unsigned.split('.');
  const wholePart = BigInt(wholePartRaw || '0');
  const fracPart = BigInt((fracPartRaw + '000000').slice(0, 6));
  const combined = wholePart * USDC_SCALE + fracPart;
  return negative ? -combined : combined;
}

export function fromUSDCMicro(value: bigint): number {
  return Number(value) / Number(USDC_SCALE);
}

export function toMoneyNumber(value: number | string | Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return fromUSDCMicro(toUSDCMicro(value));
}

export function sumMoney(values: Array<number | string | Prisma.Decimal>): number {
  const totalMicro = values.reduce((acc, current) => acc + toUSDCMicro(current), 0n);
  return fromUSDCMicro(totalMicro);
}

export function isMoneyEqual(
  left: number | string | Prisma.Decimal,
  right: number | string | Prisma.Decimal
): boolean {
  return toUSDCMicro(left) === toUSDCMicro(right);
}
