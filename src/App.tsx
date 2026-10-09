import { lazy, Suspense, type ReactNode } from 'react'
import { AccountGate } from './account/AccountGate'
import { PresentationProvider, usePresentation } from './presentation/PresentationProvider'
import { PublicLanding } from './events/PublicLanding'

const AccountWorkspace = lazy(() => import('./workspace/AccountWorkspace').then((module) => ({ default: module.AccountWorkspace })))

export function App(): ReactNode {
  return <PresentationProvider><ApplicationGate /></PresentationProvider>
}
function ApplicationGate(): ReactNode {
  const { t } = usePresentation()
  return <AccountGate signedOutContent={(authScreen, authenticationError) => <PublicLanding authScreen={authScreen} authenticationError={authenticationError} />}>{(account) => <Suspense fallback={<div className="account-loading" role="status">{t('Opening your workspace…')}</div>}><AccountWorkspace key={account.userId} account={account} /></Suspense>}</AccountGate>
}
