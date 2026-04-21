import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Leads from './pages/Leads'
import Templates from './pages/Templates'
import ABTest from './pages/ABTest'
import Errors from './pages/Errors'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/abtest" element={<ABTest />} />
          <Route path="/erreurs" element={<Errors />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
