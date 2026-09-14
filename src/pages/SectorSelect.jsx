import { useState, useRef, useEffect } from 'react'
import { SectorIcon } from './SectorIcon'

export function SectorSelect({ value, onChange, options, placeholder = '-- Избери сектор --', disabled, iconSize }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(option) {
    onChange(option)
    setOpen(false)
  }

  return (
    <div className="sector-select" ref={rootRef}>
      <button
        type="button"
        className="input sector-select-trigger"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className="sector-select-trigger-label">
          {value ? (
            <>
              <SectorIcon sector={value} size={iconSize} /> {value}            </>
          ) : (
            <span style={{ color: 'var(--color-text)' }}>{placeholder}</span>
          )}
        </span>
        <span className="sector-select-arrow">▾</span>
      </button>

      {open && (
        <div className="sector-select-panel">
          <div className="sector-select-option" onClick={() => handleSelect('')}>
            {placeholder}
          </div>
          {options.map((option) => (
            <div
              key={option}
              className={`sector-select-option ${value === option ? 'is-selected' : ''}`}
              onClick={() => handleSelect(option)}
            >
              <SectorIcon sector={option} size={iconSize} /> {option}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
