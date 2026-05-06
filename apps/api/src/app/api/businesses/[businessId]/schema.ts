import { z } from 'zod'
import { BUSINESS_TYPES } from '@/lib/locale-config'

export const BUSINESS_TYPE_VALUES = BUSINESS_TYPES.map(t => t.value) as [string, ...string[]]

export const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(BUSINESS_TYPE_VALUES).optional(),
  locale: z.string().optional(),
  removeLogo: z.literal('true').optional(),
})
