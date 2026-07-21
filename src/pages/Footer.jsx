import { Link } from 'react-router-dom'
import './Footer.css'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p className="footer-brand">Jobnet</p>
          <p className="footer-tagline">Обратната платформа за работа — кандидатите казват каква заплата търсят, фирмите намират точно тях.</p>
        </div>

        <div>
          <p className="footer-col-heading">Платформа</p>
          <ul className="footer-links">
            <li><Link to="/about">За нас</Link></li>
            <li><Link to="/contact">Контакти</Link></li>
          </ul>
        </div>

        <div>
          <p className="footer-col-heading">Правна информация</p>
          <ul className="footer-links">
            <li><Link to="/terms">Общи условия</Link></li>
            <li><Link to="/privacy">Политика за поверителност</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} Jobstate.net Всички права запазени.
      </div>
    </footer>
  )
}