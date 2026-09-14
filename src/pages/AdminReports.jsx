import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from './Toast'
import './AdminReports.css'

const AGG_FUNCS = [
  { value: 'count', label: 'COUNT' },
  { value: 'sum', label: 'SUM' },
  { value: 'avg', label: 'AVG' },
  { value: 'min', label: 'MIN' },
  { value: 'max', label: 'MAX' },
]

const FILTER_OPS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'like', label: 'съдържа (like)' },
  { value: 'ilike', label: 'съдържа, без регистър (ilike)' },
  { value: 'in', label: 'в списък (in)' },
  { value: 'is_null', label: 'е празно (is null)' },
  { value: 'not_null', label: 'не е празно (not null)' },
]

let uid = 0
function nextId() {
  uid += 1
  return uid
}

function safeAlias(table, column) {
  return `${table}_${column}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase()
}

export function AdminReports() {
  const { showToast } = useToast()

  const [schema, setSchema] = useState(null) // [{ name, columns, foreign_keys }]
  const [loadingSchema, setLoadingSchema] = useState(true)

  const [baseTable, setBaseTable] = useState('')
  const [joins, setJoins] = useState([]) // { id, table, from_column, to_table, to_column }
  const [columns, setColumns] = useState([]) // { id, table, column }
  const [aggregates, setAggregates] = useState([]) // { id, table, column, fn }
  const [filters, setFilters] = useState([]) // { id, table, column, op, value }
  const [orderBy, setOrderBy] = useState([]) // { id, mode: 'column'|'alias', table, column, alias, direction }
  const [limit, setLimit] = useState(200)

  const [result, setResult] = useState(null) // { data, sql }
  const [running, setRunning] = useState(false)

  useEffect(() => {
    async function loadSchema() {
      setLoadingSchema(true)
      const { data, error } = await supabase.rpc('admin_report_schema')
      if (error) {
        showToast('Грешка при зареждане на схемата: ' + error.message, 'error')
      } else {
        setSchema(data || [])
      }
      setLoadingSchema(false)
    }
    loadSchema()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const schemaByName = useMemo(() => {
    const map = {}
    for (const t of schema || []) map[t.name] = t
    return map
  }, [schema])

  // Таблиците, достъпни в текущата заявка (base + всички join to_table)
  const queryTables = useMemo(() => {
    const list = []
    if (baseTable) list.push(baseTable)
    for (const j of joins) {
      if (j.to_table && !list.includes(j.to_table)) list.push(j.to_table)
    }
    return list
  }, [baseTable, joins])

  function tableColumns(tableName) {
    return schemaByName[tableName]?.columns || []
  }

  function foreignKeysOf(tableName) {
    return schemaByName[tableName]?.foreign_keys || []
  }

  function resetBuilder(newBaseTable) {
    setBaseTable(newBaseTable)
    setJoins([])
    setColumns([])
    setAggregates([])
    setFilters([])
    setOrderBy([])
    setResult(null)
  }

  // ---------- JOINS ----------
  function addJoin() {
    if (queryTables.length === 0) return
    setJoins((prev) => [
      ...prev,
      { id: nextId(), table: baseTable, from_column: '', to_table: '', to_column: '' },
    ])
  }

  function updateJoin(id, patch) {
    setJoins((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  }

  function removeJoin(id) {
    const removed = joins.find((j) => j.id === id)
    setJoins((prev) => prev.filter((j) => j.id !== id))
    if (removed?.to_table) {
      // почисти всичко, което реферира изтритата таблица
      setColumns((prev) => prev.filter((c) => c.table !== removed.to_table))
      setAggregates((prev) => prev.filter((a) => a.table !== removed.to_table))
      setFilters((prev) => prev.filter((f) => f.table !== removed.to_table))
      setOrderBy((prev) => prev.filter((o) => o.table !== removed.to_table))
    }
  }

  function pickForeignKey(joinId, fkString) {
    // fkString формат: "from_table|from_column|to_table|to_column"
    const [from_table, from_column, to_table, to_column] = fkString.split('|')
    updateJoin(joinId, { table: from_table, from_column, to_table, to_column })
  }

  // ---------- COLUMNS ----------
  function addColumn() {
    if (queryTables.length === 0) return
    const table = queryTables[0]
    const col = tableColumns(table)[0]?.name || ''
    setColumns((prev) => [...prev, { id: nextId(), table, column: col }])
  }
  function updateColumn(id, patch) {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function removeColumn(id) {
    setColumns((prev) => prev.filter((c) => c.id !== id))
  }

  // ---------- AGGREGATES ----------
  function addAggregate() {
    setAggregates((prev) => [
      ...prev,
      { id: nextId(), table: baseTable, column: '*', fn: 'count' },
    ])
  }
  function updateAggregate(id, patch) {
    setAggregates((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }
  function removeAggregate(id) {
    setAggregates((prev) => prev.filter((a) => a.id !== id))
  }

  // ---------- FILTERS ----------
  function addFilter() {
    if (queryTables.length === 0) return
    const table = queryTables[0]
    const col = tableColumns(table)[0]?.name || ''
    setFilters((prev) => [...prev, { id: nextId(), table, column: col, op: 'eq', value: '' }])
  }
  function updateFilter(id, patch) {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }
  function removeFilter(id) {
    setFilters((prev) => prev.filter((f) => f.id !== id))
  }

  // ---------- ORDER BY ----------
  function addOrder() {
    if (queryTables.length === 0) return
    const table = queryTables[0]
    const col = tableColumns(table)[0]?.name || ''
    setOrderBy((prev) => [
      ...prev,
      { id: nextId(), mode: 'column', table, column: col, alias: '', direction: 'desc' },
    ])
  }
  function updateOrder(id, patch) {
    setOrderBy((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }
  function removeOrder(id) {
    setOrderBy((prev) => prev.filter((o) => o.id !== id))
  }

  // ---------- Build config & run ----------
  const availableAliases = useMemo(() => {
    const list = []
    for (const c of columns) if (c.table && c.column) list.push(safeAlias(c.table, c.column))
    for (const a of aggregates) {
      if (a.column === '*') list.push(`${a.fn}_all`)
      else if (a.table && a.column) list.push(`${a.fn}_${safeAlias(a.table, a.column)}`)
    }
    return list
  }, [columns, aggregates])

  function buildConfig() {
    return {
      base_table: baseTable,
      joins: joins
        .filter((j) => j.table && j.from_column && j.to_table && j.to_column)
        .map((j) => ({
          table: j.table,
          from_column: j.from_column,
          to_table: j.to_table,
          to_column: j.to_column,
        })),
      columns: columns
        .filter((c) => c.table && c.column)
        .map((c) => ({ table: c.table, column: c.column, alias: safeAlias(c.table, c.column) })),
      aggregates: aggregates
        .filter((a) => a.table && a.fn)
        .map((a) => ({
          table: a.table,
          column: a.column,
          fn: a.fn,
          alias: a.column === '*' ? `${a.fn}_all` : `${a.fn}_${safeAlias(a.table, a.column)}`,
        })),
      filters: filters
        .filter((f) => f.table && f.column && f.op)
        .map((f) => ({
          table: f.table,
          column: f.column,
          op: f.op,
          value:
            f.op === 'in'
              ? f.value.split(',').map((v) => v.trim()).filter(Boolean)
              : f.value,
        })),
      order_by: orderBy
        .filter((o) => (o.mode === 'alias' ? o.alias : o.table && o.column))
        .map((o) =>
          o.mode === 'alias'
            ? { alias: o.alias, direction: o.direction }
            : { table: o.table, column: o.column, direction: o.direction }
        ),
      limit: Number(limit) || 100,
    }
  }

  async function runReport() {
    if (!baseTable) {
      showToast('Избери базова таблица.', 'error')
      return
    }
    if (columns.length === 0 && aggregates.length === 0) {
      showToast('Добави поне една колона или агрегация.', 'error')
      return
    }

    setRunning(true)
    setResult(null)

    const config = buildConfig()
    const { data, error } = await supabase.rpc('admin_run_report', { p_config: config })

    setRunning(false)

    if (error) {
      showToast('Грешка при изпълнение: ' + error.message, 'error')
      return
    }

    setResult(data)
  }

  function exportCsv() {
    if (!result?.data?.length) return
    const rows = result.data
    const headers = Object.keys(rows[0])
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const v = row[h]
            const s = v === null || v === undefined ? '' : String(v)
            return `"${s.replace(/"/g, '""')}"`
          })
          .join(',')
      ),
    ]
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loadingSchema) {
    return <div style={{ padding: '2rem' }}>Зареждане на схемата...</div>
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Администрация</p>
          <h1 className="dashboard-title">Отчети</h1>
        </div>
      </div>

      <div className="reports-builder">
        {/* БАЗОВА ТАБЛИЦА */}
        <section className="reports-section">
          <h3>1. Базова таблица</h3>
          <select value={baseTable} onChange={(e) => resetBuilder(e.target.value)}>
            <option value="">— избери таблица —</option>
            {(schema || []).map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </section>

        {baseTable && (
          <>
            {/* JOINS */}
            <section className="reports-section">
              <h3>2. Свързани таблици (join по foreign key)</h3>
              {joins.map((j) => {
                const availableFks = queryTables.flatMap((t) =>
                  foreignKeysOf(t).map((fk) => ({
                    table: t,
                    ...fk,
                  }))
                )
                const selectedValue = j.table && j.from_column && j.to_table && j.to_column
                  ? `${j.table}|${j.from_column}|${j.to_table}|${j.to_column}`
                  : ''
                return (
                  <div className="reports-row" key={j.id}>
                    <select
                      value={selectedValue}
                      onChange={(e) => pickForeignKey(j.id, e.target.value)}
                    >
                      <option value="">— избери релация —</option>
                      {availableFks.map((fk) => (
                        <option
                          key={`${fk.table}.${fk.from_column}->${fk.to_table}.${fk.to_column}`}
                          value={`${fk.table}|${fk.from_column}|${fk.to_table}|${fk.to_column}`}
                        >
                          {fk.table}.{fk.from_column} → {fk.to_table}.{fk.to_column}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="reports-remove" onClick={() => removeJoin(j.id)}>
                      ✕
                    </button>
                  </div>
                )
              })}
              <button type="button" className="reports-add-btn" onClick={addJoin}>
                + Добави свързана таблица
              </button>
            </section>

            {/* COLUMNS */}
            <section className="reports-section">
              <h3>3. Колони за показване</h3>
              {columns.map((c) => (
                <div className="reports-row" key={c.id}>
                  <select
                    value={c.table}
                    onChange={(e) =>
                      updateColumn(c.id, {
                        table: e.target.value,
                        column: tableColumns(e.target.value)[0]?.name || '',
                      })
                    }
                  >
                    {queryTables.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select value={c.column} onChange={(e) => updateColumn(c.id, { column: e.target.value })}>
                    {tableColumns(c.table).map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </option>
                    ))}
                  </select>
                  <button type="button" className="reports-remove" onClick={() => removeColumn(c.id)}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="reports-add-btn" onClick={addColumn}>
                + Добави колона
              </button>
            </section>

            {/* AGGREGATES */}
            <section className="reports-section">
              <h3>4. Агрегации (по избор)</h3>
              {aggregates.map((a) => (
                <div className="reports-row" key={a.id}>
                  <select value={a.fn} onChange={(e) => updateAggregate(a.id, { fn: e.target.value })}>
                    {AGG_FUNCS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  {a.fn === 'count' && (
                    <label className="reports-inline-check">
                      <input
                        type="checkbox"
                        checked={a.column === '*'}
                        onChange={(e) =>
                          updateAggregate(a.id, {
                            column: e.target.checked ? '*' : tableColumns(a.table)[0]?.name || '',
                          })
                        }
                      />
                      всички редове (*)
                    </label>
                  )}
                  {a.column !== '*' && (
                    <>
                      <select
                        value={a.table}
                        onChange={(e) =>
                          updateAggregate(a.id, {
                            table: e.target.value,
                            column: tableColumns(e.target.value)[0]?.name || '',
                          })
                        }
                      >
                        {queryTables.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <select
                        value={a.column}
                        onChange={(e) => updateAggregate(a.id, { column: e.target.value })}
                      >
                        {tableColumns(a.table).map((col) => (
                          <option key={col.name} value={col.name}>
                            {col.name} ({col.type})
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <button type="button" className="reports-remove" onClick={() => removeAggregate(a.id)}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="reports-add-btn" onClick={addAggregate}>
                + Добави агрегация
              </button>
              {aggregates.length > 0 && columns.length > 0 && (
                <p className="reports-hint">
                  Забележка: когато има и агрегации, и обикновени колони, резултатът автоматично се
                  групира по обикновените колони (GROUP BY).
                </p>
              )}
            </section>

            {/* FILTERS */}
            <section className="reports-section">
              <h3>5. Филтри</h3>
              {filters.map((f) => (
                <div className="reports-row" key={f.id}>
                  <select
                    value={f.table}
                    onChange={(e) =>
                      updateFilter(f.id, {
                        table: e.target.value,
                        column: tableColumns(e.target.value)[0]?.name || '',
                      })
                    }
                  >
                    {queryTables.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select value={f.column} onChange={(e) => updateFilter(f.id, { column: e.target.value })}>
                    {tableColumns(f.table).map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                  <select value={f.op} onChange={(e) => updateFilter(f.id, { op: e.target.value })}>
                    {FILTER_OPS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  {f.op !== 'is_null' && f.op !== 'not_null' && (
                    <input
                      type="text"
                      placeholder={f.op === 'in' ? 'стойност1, стойност2, ...' : 'стойност'}
                      value={f.value}
                      onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                    />
                  )}
                  <button type="button" className="reports-remove" onClick={() => removeFilter(f.id)}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="reports-add-btn" onClick={addFilter}>
                + Добави филтър
              </button>
            </section>

            {/* ORDER BY */}
            <section className="reports-section">
              <h3>6. Сортиране</h3>
              {orderBy.map((o) => (
                <div className="reports-row" key={o.id}>
                  <select value={o.mode} onChange={(e) => updateOrder(o.id, { mode: e.target.value })}>
                    <option value="column">по колона</option>
                    <option value="alias">по агрегация</option>
                  </select>
                  {o.mode === 'column' ? (
                    <>
                      <select
                        value={o.table}
                        onChange={(e) =>
                          updateOrder(o.id, {
                            table: e.target.value,
                            column: tableColumns(e.target.value)[0]?.name || '',
                          })
                        }
                      >
                        {queryTables.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <select value={o.column} onChange={(e) => updateOrder(o.id, { column: e.target.value })}>
                        {tableColumns(o.table).map((col) => (
                          <option key={col.name} value={col.name}>
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <select value={o.alias} onChange={(e) => updateOrder(o.id, { alias: e.target.value })}>
                      <option value="">— избери агрегация —</option>
                      {availableAliases
                        .filter((al) => aggregates.some((a) =>
                          (a.column === '*' ? `${a.fn}_all` : `${a.fn}_${safeAlias(a.table, a.column)}`) === al
                        ))
                        .map((al) => (
                          <option key={al} value={al}>
                            {al}
                          </option>
                        ))}
                    </select>
                  )}
                  <select value={o.direction} onChange={(e) => updateOrder(o.id, { direction: e.target.value })}>
                    <option value="desc">низходящо</option>
                    <option value="asc">възходящо</option>
                  </select>
                  <button type="button" className="reports-remove" onClick={() => removeOrder(o.id)}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="reports-add-btn" onClick={addOrder}>
                + Добави сортиране
              </button>
            </section>

            {/* LIMIT + RUN */}
            <section className="reports-section reports-run-section">
              <label>
                Лимит редове:{' '}
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  style={{ width: '90px' }}
                />
              </label>
              <button type="button" className="btn-primary" onClick={runReport} disabled={running}>
                {running ? 'Изпълнява се...' : 'Изпълни отчет'}
              </button>
            </section>
          </>
        )}

        {/* RESULT */}
        {result && (
          <section className="reports-section">
            <h3>
              Резултат ({result.data?.length || 0} реда)
              {result.data?.length > 0 && (
                <button type="button" className="reports-export-btn" onClick={exportCsv}>
                  Export CSV
                </button>
              )}
            </h3>

            {result.sql && (
              <details className="reports-sql-details">
                <summary>Виж генерирания SQL</summary>
                <pre className="reports-sql-pre">{result.sql}</pre>
              </details>
            )}

            {result.data?.length > 0 ? (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      {Object.keys(result.data[0]).map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row, i) => (
                      <tr key={i}>
                        {Object.keys(result.data[0]).map((h) => (
                          <td key={h}>{row[h] === null || row[h] === undefined ? '—' : String(row[h])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)' }}>Няма редове за показаните критерии.</p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
