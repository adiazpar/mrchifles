// Temporary stubs - real implementations land in later tasks.
type ModalProps = { isOpen: boolean; onClose: () => void }
import type { Business } from '@/contexts/business-context'

export function BusinessHeaderCard(_p: { business: Business; onTap?: () => void }) { return null }
export function EditNameModal(_p: ModalProps) { return null }
export function EditTypeModal(_p: ModalProps) { return null }
export function EditLocationModal(_p: ModalProps) { return null }
export function EditLogoModal(_p: ModalProps) { return null }
export function PendingTransferCard() { return null }
export function TransferOwnershipModal(_p: ModalProps) { return null }
export function LeaveBusinessModal(_p: ModalProps) { return null }
export function DeleteBusinessModal(_p: ModalProps) { return null }
