'use client'

import { useEffect, useId, useRef, useState } from 'react'

export type CustomSelectOption = {
  value: string
  label: string
}

type CustomSelectProps = {
  id: string
  value: string
  onChange: (value: string) => void
  options: readonly CustomSelectOption[]
}

export function CustomSelect({ id, value, onChange, options }: CustomSelectProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? ''

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={`customSelect${open ? ' customSelectOpen' : ''}`} ref={rootRef}>
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="customSelectTrigger"
        id={id}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="customSelectValue">{selectedLabel}</span>
        <span aria-hidden className="customSelectChevron" />
      </button>

      {open ? (
        <ul className="customSelectMenu" id={listboxId} role="listbox">
          {options.map((option) => (
            <li key={option.value || '__empty'} role="none">
              <button
                aria-selected={option.value === value}
                className={`customSelectOption${option.value === value ? ' isSelected' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                role="option"
                type="button"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
