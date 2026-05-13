import { z } from 'zod'
import { Schemas } from '../../../../lib/schemas'

export const checkEmailSchema = z.object({
  email: Schemas.email(),
})
