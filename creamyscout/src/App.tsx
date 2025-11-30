import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Step = 'start' | 'age' | 'type' | 'amount' | 'confirm'

type Entry = {
  age: string
  type: string
  amounts: Record<string, number>
}

const createEmptyAmountCounts = () =>
  amountOptions.reduce<Record<string, number>>((acc, option) => {
    acc[option.label] = 0
    return acc
  }, {})

const ageOptions = [
  { label: '0-10', color: '#FFE0E0' },
  { label: '10-20', color: '#E0F7FF' },
  { label: '20-30', color: '#E6E7FF' },
  { label: '30-50', color: '#E2FFE3' },
  { label: '50+', color: '#FFF4D6' },
]

const typeOptions = [
  { label: 'Western', color: '#FFD6E0' },
  { label: 'Asian', color: '#D6FFF5' },
  { label: 'Indian / African', color: '#FFF0D6' },
  { label: 'Others', color: '#E7D6FF' },
]

const amountOptions = [
  { label: '$0 - 5', color: '#E8F5E9' },
  { label: '$5 - 10', color: '#FFF3E0' },
  { label: '$10 - 20', color: '#E3F2FD' },
  { label: '$20+', color: '#F3E5F5' },
]

const isLocalStorageAvailable = () => {
  try {
    const testKey = '__market-storage-test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch (error) {
    console.warn('Local storage is not available; data will not persist across sessions.', error)
    return false
  }
}

function App() {
  const [step, setStep] = useState<Step>('start')
  const [form, setForm] = useState<{ age: string; type: string }>({ age: '', type: '' })
  const [selectedAmount, setSelectedAmount] = useState('')
  const [amountCounts, setAmountCounts] = useState<Record<string, number>>(createEmptyAmountCounts)
  const [entries, setEntries] = useState<Entry[]>([])

  const storageAvailable = useMemo(() => {
    if (typeof window === 'undefined' || !('localStorage' in window)) return false
    return isLocalStorageAvailable()
  }, [])

  const entryColumnTemplate = useMemo(
    () => `1fr 1fr repeat(${amountOptions.length}, minmax(80px, 0.8fr)) 90px`,
    [],
  )

  useEffect(() => {
    if (!storageAvailable) return

    const storedEntries = localStorage.getItem('market-entries')
    const storedCounts = localStorage.getItem('market-amount-counts')
    const storedForm = localStorage.getItem('market-form-state')
    const storedStep = localStorage.getItem('market-step') as Step | null
    const storedSelectedAmount = localStorage.getItem('market-selected-amount')

    if (storedEntries) {
      try {
        const parsed = JSON.parse(storedEntries)
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((entry) => {
            if (entry && typeof entry === 'object' && entry.amounts) {
              return {
                age: entry.age || '',
                type: entry.type || '',
                amounts: {
                  ...createEmptyAmountCounts(),
                  ...entry.amounts,
                },
              } as Entry
            }

            const fallbackCounts = createEmptyAmountCounts()
            if (entry && typeof entry === 'object' && entry.amount) {
              fallbackCounts[entry.amount] = 1
            }

            return {
              age: entry?.age || '',
              type: entry?.type || '',
              amounts: fallbackCounts,
            }
          })

          setEntries(normalized)
        }
      } catch (error) {
        console.error('Failed to parse saved entries', error)
      }
    }
    if (storedCounts) {
      try {
        const parsedCounts = JSON.parse(storedCounts)
        if (parsedCounts && typeof parsedCounts === 'object') {
          setAmountCounts({ ...createEmptyAmountCounts(), ...parsedCounts })
        }
      } catch (error) {
        console.error('Failed to parse saved counts', error)
      }
    }
    if (storedForm) {
      try {
        const parsedForm = JSON.parse(storedForm)
        if (parsedForm && typeof parsedForm === 'object') {
          setForm({
            age: parsedForm.age || '',
            type: parsedForm.type || '',
          })
        }
      } catch (error) {
        console.error('Failed to parse saved form', error)
      }
    }
    if (storedStep && ['start', 'age', 'type', 'amount', 'confirm'].includes(storedStep)) {
      setStep(storedStep)
    }
    if (storedSelectedAmount) {
      setSelectedAmount(storedSelectedAmount)
    }
  }, [storageAvailable])

  useEffect(() => {
    if (!storageAvailable) return
    localStorage.setItem('market-entries', JSON.stringify(entries))
  }, [entries, storageAvailable])

  useEffect(() => {
    if (!storageAvailable) return
    localStorage.setItem('market-amount-counts', JSON.stringify(amountCounts))
  }, [amountCounts, storageAvailable])

  useEffect(() => {
    if (!storageAvailable) return
    localStorage.setItem('market-form-state', JSON.stringify(form))
  }, [form, storageAvailable])

  useEffect(() => {
    if (!storageAvailable) return
    localStorage.setItem('market-step', step)
  }, [step, storageAvailable])

  useEffect(() => {
    if (!storageAvailable) return
    localStorage.setItem('market-selected-amount', selectedAmount)
  }, [selectedAmount, storageAvailable])

  const csvContent = useMemo(() => {
    const header = ['age', 'type', ...amountOptions.map((option) => option.label)].join(',')
    const rows = entries.map((entry) =>
      [entry.age, entry.type, ...amountOptions.map((option) => entry.amounts[option.label] || 0)].join(','),
    )
    return [header, ...rows].join('\n')
  }, [entries])

  const hasAmountSelections = useMemo(
    () => Object.values(amountCounts).some((count) => count > 0),
    [amountCounts],
  )

  const handleSelectAge = (age: string) => {
    setForm((prev) => ({ ...prev, age }))
    setStep('type')
  }

  const handleSelectType = (type: string) => {
    setForm((prev) => ({ ...prev, type }))
    setStep('amount')
  }

  const handleSelectAmount = (amount: string) => {
    setSelectedAmount(amount)
    setAmountCounts((prev) => ({
      ...prev,
      [amount]: (prev[amount] || 0) + 1,
    }))
  }

  const decrementAmountCount = (amount: string) => {
    setAmountCounts((prev) => {
      const current = prev[amount] || 0
      const next = Math.max(current - 1, 0)
      const updated = { ...prev, [amount]: next }
      return updated
    })
  }

  const handleConfirm = () => {
    if (!form.age || !form.type || !hasAmountSelections) return
    const entry: Entry = {
      age: form.age,
      type: form.type,
      amounts: { ...createEmptyAmountCounts(), ...amountCounts },
    }

    setEntries((prev) => [...prev, entry])
    setForm({ age: '', type: '' })
    setSelectedAmount('')
    setAmountCounts(createEmptyAmountCounts())
    setStep('start')
  }

  const resetToStart = () => {
    setForm({ age: '', type: '' })
    setSelectedAmount('')
    setAmountCounts(createEmptyAmountCounts())
    setStep('start')
  }

  const handleDeleteEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const StartScreen = () => (
    <div className="screen start-screen">
      <div className="header">
        <h1>Sunday Market Scouting</h1>
        <p>Quickly capture visitor insights and export as CSV.</p>
      </div>
      <div className="center-content">
        <button className="primary" onClick={() => setStep('age')}>
          Start
        </button>
      </div>
      {entries.length > 0 && (
        <div className="csv-preview">
          <div className="csv-header">
            <div>
              <h3>Saved Entries</h3>
              <p>Each confirmation appends to the CSV log.</p>
            </div>
            <a
              className="download"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`}
              download="market-scouting.csv"
            >
              Download CSV
            </a>
          </div>
          <div className="csv-content">
            <div className="table-headings" style={{ gridTemplateColumns: entryColumnTemplate }}>
              <span>Age</span>
              <span>Type</span>
              {amountOptions.map((option) => (
                <span key={option.label} className="amount-heading">
                  {option.label}
                </span>
              ))}
              <span></span>
            </div>
            <div className="table-body">
              {entries.map((entry, index) => (
                <div
                  key={`${entry.age}-${entry.type}-${index}`}
                  className="table-row"
                  style={{ gridTemplateColumns: entryColumnTemplate }}
                >
              <span>{entry.age}</span>
              <span>{entry.type}</span>
              {amountOptions.map((option) => (
                <span key={option.label} className="amount-value">
                  {entry.amounts[option.label] ? <span className="pill">{entry.amounts[option.label]}</span> : '0'}
                </span>
              ))}
                  <button className="link danger" onClick={() => handleDeleteEntry(index)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button className="back" onClick={onClick}>
      ← Back
    </button>
  )

  const SelectionGrid = ({
    options,
    onSelect,
  }: {
    options: { label: string; color: string }[]
    onSelect: (label: string) => void
  }) => (
    <div className="grid">
      {options.map((option) => (
        <button
          key={option.label}
          className="grid-card"
          style={{ backgroundColor: option.color }}
          onClick={() => onSelect(option.label)}
        >
          <span className="label">{option.label}</span>
        </button>
      ))}
    </div>
  )

  const AmountGrid = () => (
    <div className="grid">
      {amountOptions.map((option) => {
        const count = amountCounts[option.label] || 0
        const isSelected = selectedAmount === option.label
        return (
          <div key={option.label} className="grid-card amount-card" style={{ backgroundColor: option.color }}>
            <button className="amount-select" onClick={() => handleSelectAmount(option.label)}>
              <span className="label">{option.label}</span>
              <span className="count">{count}</span>
            </button>
            {count > 0 && (
              <button className="decrement" onClick={() => decrementAmountCount(option.label)} aria-label={`decrease ${option.label}`}>
                ✕
              </button>
            )}
            {isSelected && <div className="selected-indicator">Selected</div>}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="app-shell">
      {step === 'start' && <StartScreen />}

      {step === 'age' && (
        <div className="screen">
          <BackButton onClick={resetToStart} />
          <div className="title">
            <h2>Select Age Range</h2>
            <p>Tap a block to continue.</p>
          </div>
          <SelectionGrid options={ageOptions} onSelect={handleSelectAge} />
        </div>
      )}

      {step === 'type' && (
        <div className="screen">
          <BackButton
            onClick={() => {
              setForm((prev) => ({ ...prev, age: '' }))
              setStep('age')
            }}
          />
          <div className="title">
            <h2>Select Cuisine Type</h2>
            <p>Pick the closest fit.</p>
          </div>
          <SelectionGrid options={typeOptions} onSelect={handleSelectType} />
        </div>
      )}

      {step === 'amount' && (
        <div className="screen">
          <BackButton
            onClick={() => {
              setForm((prev) => ({ ...prev, type: '' }))
              setSelectedAmount('')
              setAmountCounts(createEmptyAmountCounts())
              setStep('type')
            }}
          />
          <div className="title with-action">
            <div>
              <h2>Select Spend Amount</h2>
              <p>Tap to add +1. Use the cross to reduce.</p>
            </div>
            <button className="primary" disabled={!hasAmountSelections} onClick={() => setStep('confirm')}>
              Proceed
            </button>
          </div>
          <AmountGrid />
        </div>
      )}

      {step === 'confirm' && (
        <div className="screen">
          <BackButton
            onClick={() => {
              setStep('amount')
            }}
          />
          <div className="confirm-card">
            <h2>Confirm Entry</h2>
            <div className="summary">
              <div>
                <span className="hint">Age range</span>
                <strong>{form.age}</strong>
              </div>
              <div>
                <span className="hint">Type</span>
                <strong>{form.type}</strong>
              </div>
            </div>
            <div className="amount-summary columned">
              <div className="amount-summary-title">Amount selections</div>
              <div className="amount-grid">
                {amountOptions.map((option) => (
                  <div key={option.label} className="amount-summary-cell">
                    <span className="amount-label">{option.label}</span>
                    <span className="pill">{amountCounts[option.label] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="primary full" onClick={handleConfirm} disabled={!form.age || !form.type || !hasAmountSelections}>
              Confirm & Save to CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
