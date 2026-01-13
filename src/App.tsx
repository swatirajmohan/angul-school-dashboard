import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import SchoolReport from './pages/SchoolReport'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/school/:udise" element={<SchoolReport />} />
    </Routes>
  )
}

export default App

