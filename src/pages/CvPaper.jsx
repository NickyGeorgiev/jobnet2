import { months } from '../data/months'
import './CandidateDashboard.css'

function formatRange(startMonth, startYear, endMonth, endYear, current) {
  const start = startMonth && startYear ? `${months[startMonth]} ${startYear}` : ''
  const end = current ? 'Все още' : (endMonth && endYear ? `${months[endMonth]} ${endYear}` : '')
  if (!start && !end) return ''
  return `${start} — ${end}`
}

export function CvPaper({ cv }) {
  const fullName = [cv.fname, cv.lname].filter(Boolean).join(' ') || 'Кандидат'
  const workExperience = cv.work_experience || []
  const education = cv.education || []
  const languages = cv.languages || []
  const moreCourses = (cv.more_courses || []).filter(Boolean)

  return (
    <div className="cv-paper">
      <div className="cv-sidebar">
        {cv.avatar_url ? (
          <img src={cv.avatar_url} alt="аватар" className="cv-avatar" />
        ) : (
          <div className="cv-avatar-placeholder">{fullName[0]?.toUpperCase() || '👤'}</div>
        )}

        <div className="cv-sidebar-section">
          <p className="cv-sidebar-heading">Контакти</p>
          {cv.phone && <p className="cv-sidebar-item"><strong>Телефон</strong>{cv.phone}</p>}
          {cv.contact_email && <p className="cv-sidebar-item"><strong>Email</strong>{cv.contact_email}</p>}
          {cv.current_city && <p className="cv-sidebar-item"><strong>Град</strong>{cv.current_city}</p>}
        </div>

        {education.length > 0 && (
          <div className="cv-sidebar-section">
            <p className="cv-sidebar-heading">Образование</p>
            {education.map((edu) => (
              <p key={edu.id} className="cv-sidebar-item">
                {formatRange(edu.eduStartMonth, edu.eduStartYear, edu.eduEndMonth, edu.eduEndYear, false)}
                <strong>{edu.eduSchoolName}</strong>
                {edu.eduSpeciality}
              </p>
            ))}
          </div>
        )}

        {cv.skills && (
          <div className="cv-sidebar-section">
            <p className="cv-sidebar-heading">Умения</p>
            <p className="cv-sidebar-item">{cv.skills}</p>
          </div>
        )}

        {languages.length > 0 && (
          <div className="cv-sidebar-section">
            <p className="cv-sidebar-heading">Езици</p>
            {languages.map((lang) => (
              <p key={lang.id} className="cv-sidebar-item">{lang.language} — {lang.level}</p>
            ))}
          </div>
        )}

        {cv.driver_license && (
          <div className="cv-sidebar-section">
            <p className="cv-sidebar-heading">Шофьорска книжка</p>
            <p className="cv-sidebar-item">{cv.driver_license}</p>
          </div>
        )}
      </div>

      <div className="cv-main">
        <h2 className="cv-name">{fullName}</h2>
        {cv.description
          ? <p className="cv-bio">{cv.description}</p>
          : <p className="cv-empty-note">Няма добавено описание.</p>}

        <h3 className="cv-section-heading">Опит</h3>
        {workExperience.length > 0 ? (
          <div className="cv-timeline">
            {workExperience.map((exp) => (
              <div key={exp.id} className="cv-timeline-entry">
                <p className="cv-timeline-date">
                  {formatRange(exp.workStartMonth, exp.workStartYear, exp.workEndMonth, exp.workEndYear, exp.current)}
                </p>
                <p className="cv-timeline-role">{exp.position}</p>
                <p className="cv-timeline-company">{exp.company}{exp.city ? ` · ${exp.city}` : ''}</p>
                {exp.responsibilities && <p className="cv-timeline-desc">{exp.responsibilities}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="cv-empty-note">Няма добавен трудов опит.</p>
        )}

        {moreCourses.length > 0 && (
          <>
            <h3 className="cv-section-heading">Допълнителни курсове</h3>
            <ul style={{ fontSize: '0.85rem', color: '#4a463f', paddingLeft: '1.1rem' }}>
              {moreCourses.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}