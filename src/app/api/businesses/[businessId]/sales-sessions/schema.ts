import { z } from 'zod'

const finiteNonNegative = z
  .number()
  .finite()
  .nonnegative()

export const openSessionSchema = z.object({
  startingCash: finiteNonNegative,
})

export type OpenSessionBody = z.infer<typeof openSessionSchema>

export const closeSessionSchema = z.object({
  countedCash: finiteNonNegative,
  notes: z.string().max(500).optional(),
})

export type CloseSessionBody = z.infer<typeof closeSessionSchema>
