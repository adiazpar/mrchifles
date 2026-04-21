// Temporary stubs - real implementations land in later tasks.
type ModalProps = { isOpen: boolean; onClose: () => void }

export { BusinessHeaderCard, type BusinessHeaderCardProps } from './BusinessHeaderCard'
export { EditNameModal } from './EditNameModal'
export { EditTypeModal } from './EditTypeModal'
export { EditLocationModal } from './EditLocationModal'
export function EditLogoModal(_p: ModalProps) { return null }
export function PendingTransferCard() { return null }
export function TransferOwnershipModal(_p: ModalProps) { return null }
export function LeaveBusinessModal(_p: ModalProps) { return null }
export function DeleteBusinessModal(_p: ModalProps) { return null }
