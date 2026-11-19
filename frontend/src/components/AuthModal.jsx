import AuthPage from './AuthPage'

export default function AuthModal({ isOpen, onClose, initialPortal = 'client', onAuthSuccess }) {
  if (!isOpen) return null

  return (
    <AuthPage
      isModal={true}
      onClose={onClose}
      initialPortal={initialPortal}
      onAuthSuccess={(portal) => {
        if (onAuthSuccess) onAuthSuccess(portal)
        onClose()
      }}
    />
  )
}
