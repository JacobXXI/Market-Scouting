import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Step = 'start' | 'age' | 'type' | 'amount' | 'confirm'

type Entry = {
  age: string
  type: string
  amount: string
}

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

function App() {
  const [step, setStep] = useState<Step>('start')
  const [form, setForm] = useState<Entry>({ age: '', type: '', amount: '' })
  const [amountCounts, setAmountCounts] = useState<Record<string, number>>({})
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    const storedEntries = localStorage.getItem('market-entries')
    const storedCounts = localStorage.getItem('market-amount-counts')
    if (storedEntries) {
      try {
        setEntries(JSON.parse(storedEntries))
      } catch (error) {
        console.error('Failed to parse saved entries', error)
      }
    }
    if (storedCounts) {
      try {
        setAmountCounts(JSON.parse(storedCounts))
      } catch (error) {
        console.error('Failed to parse saved counts', error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('market-entries', JSON.stringify(entries))
  }, [entries])

  useEffect(() => {
    localStorage.setItem('market-amount-counts', JSON.stringify(amountCounts))
  }, [amountCounts])

  const csvContent = useMemo(() => {
    const header = 'age,type,amount'
    const rows = entries.map((entry) => `${entry.age},${entry.type},${entry.amount}`)
    return [header, ...rows].join('\n')
  }, [entries])

  const handleSelectAge = (age: string) => {
    setForm((prev) => ({ ...prev, age }))
    setStep('type')
  }

  const handleSelectType = (type: string) => {
    setForm((prev) => ({ ...prev, type }))
    setStep('amount')
  }

  const handleSelectAmount = (amount: string) => {
    setForm((prev) => ({ ...prev, amount }))
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
    if (!form.age || !form.type || !form.amount) return
    setEntries((prev) => [...prev, form])
    setForm({ age: '', type: '', amount: '' })
    setStep('start')
  }

  const resetToStart = () => {
    setForm({ age: '', type: '', amount: '' })
    setStep('start')
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
          <div className="table-headings">
            <span>Age</span>
            <span>Type</span>
            <span>Amount</span>
          </div>
          <div className="table-body">
            {entries.map((entry, index) => (
              <div key={`${entry.age}-${entry.type}-${index}`} className="table-row">
                <span>{entry.age}</span>
                <span>{entry.type}</span>
                <span>{entry.amount}</span>
              </div>
            ))}
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
        const isSelected = form.amount === option.label
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
              setForm((prev) => ({ ...prev, type: '', amount: '' }))
              setStep('type')
            }}
          />
          <div className="title with-action">
            <div>
              <h2>Select Spend Amount</h2>
              <p>Tap to add +1. Use the cross to reduce.</p>
            </div>
            <button className="primary" disabled={!form.amount} onClick={() => setStep('confirm')}>
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
              <div>
                <span className="hint">Amount</span>
                <strong>{form.amount}</strong>
              </div>
            </div>
            <button className="primary full" onClick={handleConfirm} disabled={!form.age || !form.type || !form.amount}>
              Confirm & Save to CSV
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
