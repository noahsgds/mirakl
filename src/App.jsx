import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import FrontPage from './pages/FrontPage'

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

// Campaign 2 — BDR Outreach Cockpit (C2 silo only)
import C2Dashboard     from './pages/c2/Dashboard'
import C2Prospects     from './pages/c2/Prospects'
import C2Marketplaces  from './pages/c2/Marketplaces'
import C2Matching      from './pages/c2/Matching'
import C2Analytics     from './pages/c2/Analytics'
import C2CampaignFollow from './pages/c2/CampaignFollow'
import C2CampaignParams from './pages/c2/CampaignParams'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FrontPage />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              {/* Global */}
              <Route path="/global"      element={<GlobalDashboard />} />

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

              {/* Campaign 2 — BDR Outreach Cockpit */}
              <Route path="/c2"                element={<C2Dashboard />} />
              <Route path="/c2/prospects"      element={<C2Prospects />} />
              <Route path="/c2/marketplaces"   element={<C2Marketplaces />} />
              <Route path="/c2/matching"       element={<C2Matching />} />
              <Route path="/c2/analytics"      element={<C2Analytics />} />
              <Route path="/c2/email-generation" element={<C2CampaignFollow />} />
              <Route path="/c2/campagne-email" element={<C2CampaignFollow />} />
              <Route path="/c2/campagne"       element={<C2CampaignParams />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}
