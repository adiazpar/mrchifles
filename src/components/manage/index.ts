// Temporary stubs - real implementations land in later tasks.
type ModalProps = { isOpen: boolean; onClose: () => void }

export { BusinessHeaderCard, type BusinessHeaderCardProps } from './BusinessHeaderCard'
export { EditNameModal } from './EditNameModal'
export { EditTypeModal } from './EditTypeModal'
export { EditLocationModal } from './EditLocationModal'
export { EditLogoModal } from './EditLogoModal'
export { PendingTransferCard } from './PendingTransferCard'
export { TransferOwnershipModal } from './TransferOwnershipModal'
export function LeaveBusinessModal(_p: ModalProps) { return null }
export function DeleteBusinessModal(_p: ModalProps) { return null }
