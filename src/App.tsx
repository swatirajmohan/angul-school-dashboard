import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SchoolReport from './pages/SchoolReport'
import LoDetails from './pages/LoDetails'
import Analytics from './pages/Analytics'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/school/:udise" element={<SchoolReport />} />
      <Route path="/lo-details" element={<LoDetails />} />
      <Route path="/analytics" element={<Analytics />} />
    </Routes>
  )
}

export default App

