import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SchoolReport from './pages/SchoolReport'
import LoDetails from './pages/LoDetails'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/school/:udise" element={<SchoolReport />} />
      <Route path="/lo-details" element={<LoDetails />} />
    </Routes>
  )
}

export default App

