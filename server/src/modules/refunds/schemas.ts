import { z } from 'zod';
import { MAX_QUERY_LENGTH } from './constants.js';

export const RefundSearchQuery = z.object({
  q: z.string().min(1).max(MAX_QUERY_LENGTH),
  page: z.coerce.number().int().min(1).default(1),
});
export type RefundSearchQuery = z.infer<typeof RefundSearchQuery>;

export const RefundHit = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  status: z.string(),
});
export type RefundHit = z.infer<typeof RefundHit>;

export const RefundSearchResponse = z.object({
  allowed: z.boolean(),
  offset: z.number().int(),
  hits: z.array(RefundHit),
});
export type RefundSearchResponse = z.infer<typeof RefundSearchResponse>;
