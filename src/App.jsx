import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Footer } from './pages/Footer'
import { CvModal } from './pages/CvModal'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import { ScrollToTop } from './pages/ScrollToTop'
import { Spinner } from './pages/Spinner'
import { ScrollToTopOnNavigate } from './pages/ScrollToTopOnNavigate'
import { ThemeToggle } from './pages/ThemeToggle'
import logoDark from './assets/logo-dark.svg'
import logoLight from './assets/logo-light.svg'
import { NotificationBell } from './pages/NotificationBell'
import { NotificationsProvider } from './NotificationsContext'
import './App.css'

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })))
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const MyCv = lazy(() => import('./pages/MyCv').then(m => ({ default: m.MyCv })))
const CompanySearch = lazy(() => import('./pages/CompanySearch').then(m => ({ default: m.CompanySearch })))
const CompanyProfile = lazy(() => import('./pages/CompanyProfile').then(m => ({ default: m.CompanyProfile })))
const CandidateDashboard = lazy(() => import('./pages/CandidateDashboard').then(m => ({ default: m.CandidateDashboard })))
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard').then(m => ({ default: m.CompanyDashboard })))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminReports = lazy(() => import('./pages/AdminReports').then(m => ({ default: m.AdminReports })))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess').then(m => ({ default: m.PaymentSuccess })))
const PaymentCancelled = lazy(() => import('./pages/PaymentCancelled').then(m => ({ default: m.PaymentCancelled })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })))
const AboutUs = lazy(() => import('./pages/AboutUs').then(m => ({ default: m.AboutUs })))
const ContactUs = lazy(() => import('./pages/ContactUs').then(m => ({ default: m.ContactUs })))
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(m => ({ default: m.TermsOfService })))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })))
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })))
const PaymentHistory = lazy(() => import('./pages/PaymentHistory').then(m => ({ default: m.PaymentHistory })))
const HowItWorks = lazy(() => import('./pages/HowItWorks').then(m => ({ default: m.HowItWorks })))
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })))
const CookiePolicy = lazy(() => import('./pages/CookiePolicy').then(m => ({ default: m.CookiePolicy })))
const BlogList = lazy(() => import('./pages/BlogList').then(m => ({ default: m.BlogList })))
const BlogPost = lazy(() => import('./pages/BlogPost').then(m => ({ default: m.BlogPost })))
const AdminBlog = lazy(() => import('./pages/AdminBlog').then(m => ({ default: m.AdminBlog })))
const AdminBlogEditor = lazy(() => import('./pages/AdminBlogEditor').then(m => ({ default: m.AdminBlogEditor })))
const SavedCandidates = lazy(() => import('./pages/SavedCandidates').then(m => ({ default: m.SavedCandidates })))
const CompanyDirectory = lazy(() => import('./pages/CompanyDirectory').then(m => ({ default: m.CompanyDirectory })))
const PublicCv = lazy(() => import('./pages/PublicCv').then(m => ({ default: m.PublicCv })))
const AccountSettings = lazy(() => import('./pages/AccountSettings').then(m => ({ default: m.AccountSettings })))
const AdminCandidates = lazy(() => import('./pages/AdminCandidates').then(m => ({ default: m.AdminCandidates })))
const AdminCompanies = lazy(() => import('./pages/AdminCompanies').then(m => ({ default: m.AdminCompanies })))
const AdminSearchLogs = lazy(() => import('./pages/AdminSearchLogs').then(m => ({ default: m.AdminSearchLogs })))
const JobListingsManage = lazy(() => import('./pages/JobListingsManage').then(m => ({ default: m.JobListingsManage })))
const JobListingForm = lazy(() => import('./pages/JobListingForm').then(m => ({ default: m.JobListingForm })))
const JobApply = lazy(() => import('./pages/JobApply').then(m => ({ default: m.JobApply })))
const JobApplicants = lazy(() => import('./pages/JobApplicants').then(m => ({ default: m.JobApplicants })))
const MyApplications = lazy(() => import('./pages/MyApplications').then(m => ({ default: m.MyApplications })))
const JobsBrowse = lazy(() => import('./pages/JobsBrowse').then(m => ({ default: m.JobsBrowse })))
const MySavedJobs = lazy(() => import('./pages/MySavedJobs').then(m => ({ default: m.MySavedJobs })))
const BuyCredits = lazy(() => import('./pages/BuyCredits').then(m => ({ default: m.BuyCredits })))
const CompanyProfilePublic = lazy(() => import('./pages/CompanyProfilePublic').then(m => ({ default: m.CompanyProfilePublic })))
const CompanyJobsList = lazy(() => import('./pages/CompanyJobsList').then(m => ({ default: m.CompanyJobsList })))
const AdminNotifications = lazy(() => import('./pages/AdminNotifications').then(m => ({ default: m.AdminNotifications })))

function NavDropdown({ label, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="nav-dropdown" ref={ref}>
      <button type="button" className="nav-link nav-dropdown-trigger" onClick={() => setOpen((v) => !v)}>
        {label} <span className="nav-dropdown-caret">{open ? '▴' : '▾'}</span>
      </button>
      <div className={`nav-dropdown-menu ${open ? 'nav-dropdown-menu--open' : ''}`} onClick={() => setOpen(false)}>
        {children}
      </div>
    </div>
  )
}

function App() {
  const { session, profile, loading, displayName } = useAuth()
  const navigate = useNavigate()
  const [showMyCv, setShowMyCv] = useState(false)
  const [myCvData, setMyCvData] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    function handleFocusIn(e) {

      if (window.innerWidth > 768) return

      const tag = e.target.tagName
      const type = e.target.type

      if (type === 'checkbox' || type === 'radio') return

      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        setTimeout(() => {
          e.target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }, 300)
      }
    }
    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [])

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

  if (loading) return <Spinner label="Зареждане..." />

  let homeElement = <Home />
  if (session && profile?.role === 'candidate') {
    homeElement = <CandidateDashboard />
  } else if (session && profile?.role === 'company') {
    homeElement = <CompanyDashboard />
  } else if (session && profile?.role === 'admin') {
    homeElement = <AdminDashboard />
  }

  return (
    <NotificationsProvider userId={session?.user?.id}>
      <div>
        <ScrollToTopOnNavigate />
        <nav className="navbar">
          <Link to="/" className="navbar-logo-link">
            <img
              src={logoDark}
              alt="Jobstate"
              className="navbar-logo-img navbar-logo-dark"
            />

            <img
              src={logoLight}
              alt="Jobstate"
              className="navbar-logo-img navbar-logo-light"
            />
          </Link>

          {session && (
            <NotificationBell className="notification-bell--mobile-only" />
          )}

          <button className="navbar-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          <div className={`navbar-right ${mobileMenuOpen ? 'navbar-right--open' : ''}`}>
            <ThemeToggle />

            {session && profile?.role === 'company' && (
              <NavDropdown label="Моето табло">
                <Link to={`/companies/${session.user.id}`} className="nav-link" onClick={() => setMobileMenuOpen(false)}>Виж публичния профил</Link>
                <Link to="/company-jobs" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Моите обяви</Link>
                <Link to="/company-profile" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Редактирай профил</Link>
                <Link to="/buy-credits" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Портфейл</Link>
                <Link to="/search" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Търсене на кандидати</Link>
                <Link to="/saved-candidates" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Запазени кандидати</Link>
                <Link to="/payments" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Плащания</Link>
              </NavDropdown>
            )}

            <div className="navbar-links">
              <Link to="/blog" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Блог</Link>
              <Link to="/jobs" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Търси обяви</Link>

              {session && profile?.role === 'candidate' && (
                <NavDropdown label="Моето табло">
                  <Link to="/my-cv" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Редактирай CV</Link>
                  <Link to="/my-applications" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Моите кандидатствания</Link>
                  <Link to="/my-saved-jobs" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Любими обяви</Link>
                  <Link to="/companies" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Фирми</Link>
                  <button onClick={() => { handleViewMyCv(); setMobileMenuOpen(false) }} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Виж CV
                  </button>
                </NavDropdown>
              )}
              
              {session && profile?.role === 'admin' && (
                <NavDropdown label="Админ">
                  <Link to="/admin-reports" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Отчети</Link>
                  <Link to="/admin-notifications" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Известия</Link>
                  <Link to="/admin-candidates" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Кандидати</Link>
                  <Link to="/admin-companies" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Фирми</Link>
                  <Link to="/admin-search-logs" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Лог търсения</Link>
                  <Link to="/admin-blog" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Блог статии</Link>
                </NavDropdown>
              )}
            </div>

            {!session && (
              <div className="navbar-links">
                <Link to="/login" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Вход</Link>
                <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.85rem', margin: '0.5rem 1.5rem', textAlign: 'center' }} onClick={() => setMobileMenuOpen(false)}>
                  Регистрация
                </Link>
              </div>
            )}

            {session && (
              <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <NotificationBell className="notification-bell--desktop-only" />
                <Link to="/account-settings" className="navbar-user" style={{ textDecoration: 'none' }}>{displayName || session.user.email}</Link>
                <button onClick={handleLogout} className="btn-logout">Изход</button>
              </div>
            )}
          </div>
        </nav>


        <Suspense fallback={<Spinner label="Зареждане..." />}>
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
            <Route path="/payments" element={<PaymentHistory />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/admin-blog" element={<AdminBlog />} />
            <Route path="/admin-blog/:id" element={<AdminBlogEditor />} />
            <Route path="/saved-candidates" element={<SavedCandidates />} />
            <Route path="/companies" element={<CompanyDirectory />} />
            <Route path="/cv/:id" element={<PublicCv />} />
            <Route path="/account-settings" element={<AccountSettings />} />
            <Route path="/admin-candidates" element={<AdminCandidates />} />
            <Route path="/admin-companies" element={<AdminCompanies />} />
            <Route path="/admin-search-logs" element={<AdminSearchLogs />} />
            <Route path="/admin-reports" element={<AdminReports />} />
            <Route path="/company-jobs" element={<JobListingsManage />} />
            <Route path="/company-jobs/new" element={<JobListingForm />} />
            <Route path="/company-jobs/:id" element={<JobListingForm />} />
            <Route path="/company-jobs/:id/applicants" element={<JobApplicants />} />
            <Route path="/apply/:jobId" element={<JobApply />} />
            <Route path="/my-applications" element={<MyApplications />} />
            <Route path="/jobs" element={<JobsBrowse />} />
            <Route path="/my-saved-jobs" element={<MySavedJobs />} />
            <Route path="/buy-credits" element={<BuyCredits />} />
            <Route path="/companies/:id" element={<CompanyProfilePublic />} />
            <Route path="/companies/:id/jobs" element={<CompanyJobsList />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/admin-notifications" element={<AdminNotifications />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        <Footer />
        <ScrollToTop />
        {showMyCv && myCvData && (
          <CvModal cv={myCvData} onClose={() => setShowMyCv(false)} showDownload={true} />
        )}
      </div>
    </NotificationsProvider>
  )
}

export default App