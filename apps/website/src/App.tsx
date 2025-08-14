import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ModernHomePage from './pages/ModernHomePage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ModernHomePage />} />
      </Routes>
    </Router>
  )
}

export default App
