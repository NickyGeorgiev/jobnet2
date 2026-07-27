import { Link } from 'react-router-dom'
import './Footer.css'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p className="footer-brand">Jobstate</p>
          <p className="footer-tagline">Jobstate свързва кандидати и работодатели чрез съвпадение на реални условия — заплата, град, сектор. Кандидатите казват какво търсят, работодателите намират точните хора.</p>
        </div>

        <div>
          <p className="footer-col-heading">Платформа</p>
          <ul className="footer-links">
            <li><Link to="/about">За нас</Link></li>
            <li><Link to="/how-it-works">Как работи</Link></li>
            <li><Link to="/blog">Блог</Link></li>
            <li><Link to="/contact">Контакти</Link></li>
          </ul>
        </div>

        <div>
          <p className="footer-col-heading">Правна информация</p>
          <ul className="footer-links">
            <li><Link to="/terms">Общи условия</Link></li>
            <li><Link to="/privacy">Политика за поверителност</Link></li>
            <li><Link to="/cookies">Политика за бисквитки</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} Jobstate.net Всички права запазени.
      </div>
    </footer>
  )
}