import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './components/RequireAuth'
import { Layout } from './components/Layout'
import { KaderPage } from './features/kader/KaderPage'
import { TurnierListPage } from './features/turnier/TurnierListPage'
import { TurnierDetailPage } from './features/turnier/TurnierDetailPage'
import { SpielVorbereitenPage } from './features/spiel-vorbereiten/SpielVorbereitenPage'
import { SpielzeitPage } from './features/spielzeit/SpielzeitPage'
import { StatistikPage } from './features/statistik/StatistikPage'

function HauptUebersicht() {
  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold text-slate-900">
        Spielzeit-Rotation
      </h1>
      <p className="text-sm text-slate-600">
        Kader, Turniere und Statistik über die Navigation oben erreichbar.
      </p>
    </div>
  )
}

function GeschuetzterBereich({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <GeschuetzterBereich>
                <HauptUebersicht />
              </GeschuetzterBereich>
            }
          />
          <Route
            path="/kader"
            element={
              <GeschuetzterBereich>
                <KaderPage />
              </GeschuetzterBereich>
            }
          />
          <Route
            path="/turniere"
            element={
              <GeschuetzterBereich>
                <TurnierListPage />
              </GeschuetzterBereich>
            }
          />
          <Route
            path="/turniere/:turnierId"
            element={
              <GeschuetzterBereich>
                <TurnierDetailPage />
              </GeschuetzterBereich>
            }
          />
          <Route
            path="/spiele/:spielId/vorbereiten"
            element={
              <GeschuetzterBereich>
                <SpielVorbereitenPage />
              </GeschuetzterBereich>
            }
          />
          <Route
            path="/spiele/:spielId/spielzeit"
            element={
              <GeschuetzterBereich>
                <SpielzeitPage />
              </GeschuetzterBereich>
            }
          />
          <Route
            path="/statistik"
            element={
              <GeschuetzterBereich>
                <StatistikPage />
              </GeschuetzterBereich>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
