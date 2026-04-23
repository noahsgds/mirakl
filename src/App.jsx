import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

// Global
import GlobalDashboard from './pages/GlobalDashboard'

// Campaign 1
import Home       from './pages/Home'
import Pipeline   from './pages/Pipeline'
import Scraping   from './pages/Scraping'
import Leads      from './pages/Leads'
import Inbox      from './pages/Inbox'
import Analytics  from './pages/Analytics'
import Templates  from './pages/Templates'
import ABTest     from './pages/ABTest'
import Errors     from './pages/Errors'
import Campaign   from './pages/Campaign'
import Debug      from './pages/Debug'

// Campaign 2
import C2Home          from './pages/c2/Home'
import C2Pipeline      from './pages/c2/Pipeline'
import C2Leads         from './pages/c2/Leads'
import C2Templates     from './pages/c2/Templates'
import CampagneEmail   from './pages/CampagneEmail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* All routes wrapped in Layout (sidebar) */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              {/* Global */}
              <Route path="/"            element={<GlobalDashboard />} />

              {/* Campaign 1 */}
              <Route path="/dashboard"   element={<Home />} />
              <Route path="/pipeline"    element={<Pipeline />} />
              <Route path="/scraping"    element={<Scraping />} />
              <Route path="/leads"       element={<Leads />} />
              <Route path="/inbox"       element={<Inbox />} />
              <Route path="/analytics"   element={<Analytics />} />
              <Route path="/templates"   element={<Templates />} />
              <Route path="/abtest"      element={<ABTest />} />
              <Route path="/erreurs"     element={<Errors />} />
              <Route path="/campagne"    element={<Campaign />} />
              <Route path="/debug"       element={<Debug />} />

              {/* Campaign 2 — silo séparé : composants C2 uniquement */}
              <Route path="/c2"                element={<C2Home />} />
              <Route path="/c2/pipeline"       element={<C2Pipeline />} />
              <Route path="/c2/leads"          element={<C2Leads />} />
              <Route path="/c2/templates"      element={<C2Templates />} />
              <Route path="/c2/campagne"       element={<Campaign />} />
              <Route path="/c2/campagne-email" element={<CampagneEmail />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}
