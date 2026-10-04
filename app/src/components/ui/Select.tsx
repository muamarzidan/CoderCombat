import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/** Satu pilihan dropdown. */
export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  /** Id agar `<label htmlFor>` tetap mengasosiasikan label dengan kontrol. */
  id?: string
  /**
   * Tandai dropdown sebagai "aktif" (mis. ada filter terpasang) supaya border
   * menyala hijau seperti menu navbar yang aktif - bukan hanya saat difokus.
   */
  active?: boolean
  className?: string
}

/**
 * Dropdown custom (bukan `<select>` bawaan) supaya:
 *  - panah memakai ikon Lucide yang **berputar** saat dibuka/ditutup;
 *  - daftar pilihan dianimasikan halus (bukan popup OS yang kaku);
 *  - tampilan bisa ditata penuh (border hijau saat aktif/fokus).
 *
 * Aksesibilitas: mengikuti pola ARIA combobox/listbox - `aria-expanded`,
 * `aria-activedescendant`, navigasi panah/Home/End/Enter/Escape, dan klik-luar.
 */
export default function Select({
  value,
  options,
  onChange,
  id,
  active = false,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const baseId = useId()
  const listId = `${baseId}-list`

  const selected = options.find((o) => o.value === value) ?? options[0]

  // Sinkronkan sorotan dengan nilai terpilih tiap kali dibuka.
  useEffect(() => {
    if (!open) return
    const idx = options.findIndex((o) => o.value === value)
    setActiveIndex(idx < 0 ? 0 : idx)
  }, [open, value, options])

  // Tutup saat klik di luar.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Pastikan opsi tersorot terlihat saat navigasi keyboard.
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const commit = (index: number) => {
    const opt = options[index]
    if (!opt) return
    onChange(opt.value)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) setOpen(true)
        else setActiveIndex((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) setOpen(true)
        else setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        if (open) {
          e.preventDefault()
          setActiveIndex(0)
        }
        break
      case 'End':
        if (open) {
          e.preventDefault()
          setActiveIndex(options.length - 1)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) commit(activeIndex)
        else setOpen(true)
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  const border = active ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-primary/50'

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-bg py-2 pl-3 pr-3 text-left text-sm text-text transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ${border}`}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Panel selalu ter-render agar buka & tutup sama-sama beranimasi. */}
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-hidden={!open}
        className={`absolute z-20 mt-1 max-h-60 w-full origin-top overflow-auto rounded-md border border-border bg-bg-surface py-1 shadow-lg transition duration-150 ease-out ${
          open
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none invisible -translate-y-1 scale-95 opacity-0'
        }`}
      >
        {options.map((opt, i) => {
          const isSelected = opt.value === value
          const isActive = i === activeIndex
          return (
            <li
              key={opt.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => commit(i)}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-bg-raised text-text' : 'text-text-muted'
              } ${isSelected ? 'font-medium text-primary' : ''}`}
            >
              {opt.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
