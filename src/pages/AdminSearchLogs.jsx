import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AdminSearchLogs() {
  const [logs, setLogs] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('search_logs')
        .select('*, companies(company_name)')
        .order('created_at', { ascending: false })
        .limit(100)
      setLogs(data || [])
    }
    load()
  }, [])

  if (logs === null) return <div style={{ padding: '2rem' }}>Зареждане...</div>

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div><p className="dashboard-eyebrow">Администрация</p><h1 className="dashboard-title">Лог на търсения ({logs.length})</h1></div>
      </div>

      <div className="blog-admin-list">
        {logs.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Все още няма направени търсения.</p>}

        {logs.map((log) => (
          <div key={log.id} className="blog-admin-row" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="blog-admin-row-title">
                {log.companies?.company_name || '(изтрита фирма)'}
                <span className="blog-status-badge blog-status-badge--published" style={{ marginLeft: '0.5rem' }}>
                  {log.results_count} резултата
                </span>
              </p>
              <p className="blog-admin-row-meta">
                {new Date(log.created_at).toLocaleString('bg-BG')} · до {log.salary}€
                {log.sectors?.length > 0 && ` · ${log.sectors.join(', ')}`}
                {log.cities?.length > 0 && ` · ${log.cities.join(', ')}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}