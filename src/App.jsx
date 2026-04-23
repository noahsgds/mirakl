import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Leads from './pages/Leads'
import Inbox from './pages/Inbox'
import Analytics from './pages/Analytics'
import Templates from './pages/Templates'
import ABTest from './pages/ABTest'
import Errors from './pages/Errors'
import Campaign from './pages/Campaign'
import Scraping from './pages/Scraping'
import Debug from './pages/Debug'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scraping" element={<Scraping />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/abtest" element={<ABTest />} />
          <Route path="/erreurs" element={<Errors />} />
          <Route path="/campagne" element={<Campaign />} />
          <Route path="/debug" element={<Debug />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
