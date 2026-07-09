import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { Register } from './pages/Register'
import { Login } from './pages/Login'
import { MyCv } from './pages/MyCv'
import { CompanySearch } from './pages/CompanySearch'
import { CompanyProfile } from './pages/CompanyProfile'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'

function App() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>Начало</Link>

        {!session && (
          <>
            <Link to="/register" style={{ marginRight: '1rem' }}>Регистрация</Link>
            <Link to="/login">Вход</Link>
          </>
        )}

        {session && profile?.role === 'candidate' && (
          <Link to="/my-cv" style={{ marginRight: '1rem' }}>Моето CV</Link>
        )}

        {session && profile?.role === 'company' && (
          <>
            <Link to="/company-profile" style={{ marginRight: '1rem' }}>Профил на фирмата</Link>
            <Link to="/search" style={{ marginRight: '1rem' }}>Търсене на кандидати</Link>
          </>
        )}

        {session && (
          <>
            <span style={{ marginRight: '1rem' }}>
              Влязъл като: {session.user.email} ({profile?.role})
            </span>
            <button onClick={handleLogout}>Изход</button>
          </>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my-cv" element={<MyCv />} />
        <Route path="/search" element={<CompanySearch />} />
        <Route path="/company-profile" element={<CompanyProfile />} />
      </Routes>
    </div>
  )
}

export default App