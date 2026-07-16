export function LanguagesSection({ languages, onChange, onAdd, onRemove }) {
  return (
    <div className="cv-form-section">
      <h3 className="cv-form-section-title">Езици</h3>

      {languages.map((lang) => (
        <div key={lang.id} className="cv-language-row">
          <input className="input" placeholder="напр. Английски" value={lang.language} onChange={(e) => onChange(lang.id, 'language', e.target.value)} />
          <select className="input" value={lang.level} onChange={(e) => onChange(lang.id, 'level', e.target.value)}>
            <option value="">Ниво</option>
            <option value="Ниско">Ниско</option>
            <option value="Средно">Средно</option>
            <option value="Високо">Високо</option>
          </select>
          <button type="button" className="cv-entry-remove" onClick={() => onRemove(lang.id)}>✕</button>
        </div>
      ))}

      <button type="button" className="cv-add-btn" onClick={onAdd}>+ Добави език</button>
    </div>
  )
}