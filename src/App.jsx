import { useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { Register } from './pages/Register'
import { Login } from './pages/Login'
import { MyCv } from './pages/MyCv'
import { CompanySearch } from './pages/CompanySearch'
import { CompanyProfile } from './pages/CompanyProfile'
import { CandidateDashboard } from './pages/CandidateDashboard'
import { CompanyDashboard } from './pages/CompanyDashboard'
import { AdminDashboard } from './pages/AdminDashboard'
import { PaymentSuccess } from './pages/PaymentSuccess'
import { PaymentCancelled } from './pages/PaymentCancelled'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Footer } from './pages/Footer'
import { AboutUs } from './pages/AboutUs'
import { ContactUs } from './pages/ContactUs'
import { TermsOfService } from './pages/TermsOfService'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { CvModal } from './pages/CvModal'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import logo from './assets/logo.png'
import './App.css'

function App() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [showMyCv, setShowMyCv] = useState(false)
  const [myCvData, setMyCvData] = useState(null)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  async function handleViewMyCv() {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setMyCvData(data)
    setShowMyCv(true)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  let homeElement = <Home />
  if (session && profile?.role === 'candidate') {
    homeElement = <CandidateDashboard />
  } else if (session && profile?.role === 'company') {
    homeElement = <CompanyDashboard />
  } else if (session && profile?.role === 'admin') {
    homeElement = <AdminDashboard />
  }

  return (
    <div>
      <nav className="navbar">
        <Link to="/">
          <img src={logo} alt="Jobnet" className="navbar-logo-img" />
        </Link>

        <div className="navbar-right">
          <div className="navbar-links">
            <Link to="/about" className="nav-link">За нас</Link>
            <Link to="/contact" className="nav-link">Контакти</Link>

            {session && profile?.role === 'candidate' && (
              <>
                <Link to="/my-cv" className="nav-link">Моето CV</Link>
                <button onClick={handleViewMyCv} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Виж CV
                </button>
              </>
            )}

            {session && profile?.role === 'company' && (
              <>
                <Link to="/company-profile" className="nav-link">Профил на фирмата</Link>
                <Link to="/search" className="nav-link">Търсене на кандидати</Link>
              </>
            )}

            {session && profile?.role === 'admin' && (
              <Link to="/" className="nav-link">Admin панел</Link>
            )}
          </div>

          {!session && (
            <div className="navbar-links">
              <Link to="/login" className="nav-link">Вход</Link>
              <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Регистрация
              </Link>
            </div>
          )}

          {session && (
            <div className="navbar-links">
              <span className="navbar-user">{session.user.email}</span>
              <button onClick={handleLogout} className="btn-logout">Изход</button>
            </div>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={homeElement} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-cv" element={<MyCv />} />
        <Route path="/search" element={<CompanySearch />} />
        <Route path="/company-profile" element={<CompanyProfile />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>
      <Footer />
      {showMyCv && myCvData && (
        <CvModal cv={myCvData} onClose={() => setShowMyCv(false)} showDownload={true} />
      )}
    </div>
  )
}

export default App