export function LanguagesSection({ languages, onChange, onAdd, onRemove }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3>Езици</h3>

      {languages.map((lang) => (
        <div key={lang.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <input
            placeholder="напр. Английски"
            value={lang.language}
            onChange={(e) => onChange(lang.id, 'language', e.target.value)}
            style={{ padding: '0.5rem', flex: 1 }}
          />
          <select
            value={lang.level}
            onChange={(e) => onChange(lang.id, 'level', e.target.value)}
            style={{ padding: '0.5rem' }}
          >
            <option value="">Ниво</option>
            <option value="Ниско">Ниско</option>
            <option value="Средно">Средно</option>
            <option value="Високо">Високо</option>
          </select>
          <button type="button" onClick={() => onRemove(lang.id)} style={{ color: 'red' }}>✕</button>
        </div>
      ))}

      <button type="button" onClick={onAdd}>+ Добави език</button>
    </div>
  )
}