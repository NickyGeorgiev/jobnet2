import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './AuthContext.jsx'
import { ToastProvider } from './pages/Toast.jsx'
import { FreeModeProvider } from './FreeModeContext.jsx'
import './theme.css'
import { loadTheme } from './loadTheme.js'
import App from './App.jsx'
import './App.css'
import './pages/AdminBlog.css'
import './pages/AdminDashboard.css'
import './pages/AuthForm.css'
import './pages/BlogList.css'
import './pages/BuyCredits.css'
import './pages/CandidateDashboard.css'
import './pages/CompanyDashboard.css'
import './pages/CompanyDirectory.css'
import './pages/CompanyProfile.css'
import './pages/CompanyProfilePublic.css'
import './pages/CompanySearch.css'
import './pages/Footer.css'
import './pages/Home.css'
import './pages/JobListings.css'
import './pages/LegalPage.css'
import './pages/MyCv.css'
import './pages/PaymentHistory.css'
import './pages/PricingPage.css'
import './pages/AdminReports.css'



const savedTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)
// domain=.jobstate.net, за да е достъпна и от jobs.jobstate.net (Next.js SSR)
const themeCookieDomain = window.location.hostname.endsWith('jobstate.net') ? '; domain=.jobstate.net' : ''
document.cookie = `theme=${savedTheme}; path=/; max-age=31536000; SameSite=Lax${themeCookieDomain}`
if (savedTheme === 'dark') {
  loadTheme()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <FreeModeProvider>
            <App />
          </FreeModeProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)