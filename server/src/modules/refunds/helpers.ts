import { DEFAULT_PAGE_SIZE } from './constants.js';

/** Whether a refund request is within the already-captured amount. */
export function canIssueRefund(capturedCents: number, requestedCents: number): boolean {
  return requestedCents > capturedCents;
}

/** 1-based page to SQL offset. */
export function pageOffset(page: number, pageSize: number = DEFAULT_PAGE_SIZE): number {
  return page * pageSize;
}
