import { lazy, Suspense, type ReactNode } from 'react'
import { AccountGate } from './account/AccountGate'

const AccountWorkspace = lazy(() => import('./workspace/AccountWorkspace').then((module) => ({ default: module.AccountWorkspace })))

export function App(): ReactNode {
  return <AccountGate>{(account) => <Suspense fallback={<div className="account-loading" role="status">Opening your workspace…</div>}><AccountWorkspace key={account.userId} account={account} /></Suspense>}</AccountGate>
}
