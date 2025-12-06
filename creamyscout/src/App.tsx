import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

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
  { label: '$6 - 10', color: '#FFF3E0' },
  { label: '$11 - 20', color: '#E3F2FD' },
  { label: '$21 - 50', color: '#F3E5F5' },
]

const categoryOptions = [
  { label: 'Accessories', color: '#FFE6F0' },
  { label: 'Clothes', color: '#E6FFF5' },
  { label: 'Second Hand', color: '#E3F2FD'},
  { label: 'Others', color: '#FFF7E6' },
]

type Step = 'start' | 'age' | 'type' | 'amount' | 'confirm'

type CategoryAmounts = Record<string, Record<string, number>>

type Entry = {
  age: string
  type: string
  categoryAmounts: CategoryAmounts
  timestamp: string
}

const formatTimestamp = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const createEmptyAmountCounts = () =>
  amountOptions.reduce<Record<string, number>>((acc, option) => {
    acc[option.label] = 0
    return acc
  }, {})

const createEmptyCategoryAmountCounts = () =>
  categoryOptions.reduce<CategoryAmounts>((acc, category) => {
    acc[category.label] = createEmptyAmountCounts()
    return acc
  }, {})

const createEmptySelectedAmounts = () =>
  categoryOptions.reduce<Record<string, string>>((acc, category) => {
    acc[category.label] = ''
    return acc
  }, {})

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
  const [selectedCategory, setSelectedCategory] = useState(categoryOptions[0].label)
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, string>>(createEmptySelectedAmounts)
  const [categoryAmounts, setCategoryAmounts] = useState<CategoryAmounts>(createEmptyCategoryAmountCounts)
  const [entries, setEntries] = useState<Entry[]>([])
  const savedEntriesRef = useRef<HTMLDivElement | null>(null)
  const [isCompactSavedEntries, setIsCompactSavedEntries] = useState(false)

  const storageAvailable = useMemo(() => {
    if (typeof window === 'undefined' || !('localStorage' in window)) return false
    return isLocalStorageAvailable()
  }, [])

  const entryColumnTemplate = useMemo(
    () =>
      isCompactSavedEntries
        ? `0.9fr 0.9fr repeat(${categoryOptions.length}, minmax(48px, 0.6fr)) 76px`
        : `1fr 1fr repeat(${categoryOptions.length}, minmax(80px, 0.8fr)) 90px`,
    [isCompactSavedEntries],
  )

  useEffect(() => {
    if (!storageAvailable) return

    const storedEntries = localStorage.getItem('market-entries')
    const storedCounts = localStorage.getItem('market-category-amounts')
    const storedForm = localStorage.getItem('market-form-state')
    const storedStep = localStorage.getItem('market-step') as Step | null
    const storedSelectedAmount = localStorage.getItem('market-selected-amount')
    const storedSelectedCategory = localStorage.getItem('market-selected-category')
    const storedSelectedAmounts = localStorage.getItem('market-selected-amounts')

    if (storedEntries) {
      try {
        const parsed = JSON.parse(storedEntries)
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((entry) => {
            const baseCategoryCounts = createEmptyCategoryAmountCounts()

            if (entry && typeof entry === 'object') {
              if (entry.categoryAmounts && typeof entry.categoryAmounts === 'object') {
                categoryOptions.forEach((category) => {
                  baseCategoryCounts[category.label] = {
                    ...baseCategoryCounts[category.label],
                    ...(entry.categoryAmounts[category.label] || {}),
                  }
                })
              } else if (entry.amounts && typeof entry.amounts === 'object') {
                const defaultCategory = categoryOptions[0].label
                baseCategoryCounts[defaultCategory] = {
                  ...baseCategoryCounts[defaultCategory],
                  ...entry.amounts,
                }
              } else if (entry.amount && typeof entry.amount === 'string') {
                const defaultCategory = categoryOptions[0].label
                baseCategoryCounts[defaultCategory] = {
                  ...baseCategoryCounts[defaultCategory],
                  [entry.amount]: 1,
                }
              }
            }

            return {
              age: entry?.age || '',
              type: entry?.type || '',
              categoryAmounts: baseCategoryCounts,
              timestamp:
                typeof entry?.timestamp === 'string' && entry.timestamp
                  ? entry.timestamp
                  : '',
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
          const normalizedCounts = createEmptyCategoryAmountCounts()

          if (Object.values(parsedCounts).every((value) => typeof value === 'number')) {
            const defaultCategory = categoryOptions[0].label
            normalizedCounts[defaultCategory] = {
              ...normalizedCounts[defaultCategory],
              ...parsedCounts,
            }
          } else {
            categoryOptions.forEach((category) => {
              normalizedCounts[category.label] = {
                ...normalizedCounts[category.label],
                ...(parsedCounts[category.label] || {}),
              }
            })
          }

          setCategoryAmounts(normalizedCounts)
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
    if (storedSelectedCategory && categoryOptions.some((category) => category.label === storedSelectedCategory)) {
      setSelectedCategory(storedSelectedCategory)
    }
    if (storedSelectedAmounts) {
      try {
        const parsedSelected = JSON.parse(storedSelectedAmounts)
        if (parsedSelected && typeof parsedSelected === 'object') {
          setSelectedAmounts({ ...createEmptySelectedAmounts(), ...parsedSelected })
        }
      } catch (error) {
        console.error('Failed to parse selected amounts', error)
      }
    } else if (storedSelectedAmount) {
      const defaultCategory = categoryOptions[0].label
      setSelectedAmounts((prev) => ({ ...prev, [defaultCategory]: storedSelectedAmount }))
    }
  }, [storageAvailable])

  useEffect(() => {
    if (!storageAvailable) return
    localStorage.setItem('market-entries', JSON.stringify(entries))
  }, [entries, storageAvailable])

  useEffect(() => {
    if (!storageAvailable) return
    localStorage.setItem('market-category-amounts', JSON.stringify(categoryAmounts))
  }, [categoryAmounts, storageAvailable])

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
    localStorage.setItem('market-selected-category', selectedCategory)
  }, [selectedCategory, storageAvailable])

  useEffect(() => {
    if (!storageAvailable) return
    localStorage.setItem('market-selected-amounts', JSON.stringify(selectedAmounts))
  }, [selectedAmounts, storageAvailable])

  useEffect(() => {
    const element = savedEntriesRef.current
    if (!element) return

    const updateCompactMode = () => {
      const hasOverflow = element.scrollWidth - element.clientWidth > 2
      const isNarrow = element.clientWidth < 560
      setIsCompactSavedEntries(hasOverflow || isNarrow)
    }

    const resizeObserver = new ResizeObserver(updateCompactMode)
    resizeObserver.observe(element)
    updateCompactMode()

    return () => resizeObserver.disconnect()
  }, [entries.length])

  const csvContent = useMemo(() => {
    const categoryAmountHeaders = categoryOptions.flatMap((category) => [
      ...amountOptions.map((amount) => `${category.label} ${amount.label}`),
      `${category.label} Total`,
    ])

    const header = ['time', 'age', 'type', ...categoryAmountHeaders].join(',')
    const rows = entries.map((entry) => {
      const categoryDetails = categoryOptions.flatMap((category) => {
        const amounts = entry.categoryAmounts[category.label] || {}
        const amountCounts = amountOptions.map((amount) => amounts[amount.label] || 0)
        const total = amountCounts.reduce((sum, value) => sum + value, 0)
        return [...amountCounts, total]
      })

      return [entry.timestamp || '', entry.age, entry.type, ...categoryDetails].join(',')
    })

    return [header, ...rows].join('\n')
  }, [entries])

  const hasAmountSelections = useMemo(
    () =>
      Object.values(categoryAmounts).some((category) =>
        Object.values(category).some((count: number) => count > 0),
      ),
    [categoryAmounts],
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
    setSelectedAmounts((prev) => ({
      ...prev,
      [selectedCategory]: amount,
    }))

    setCategoryAmounts((prev) => ({
      ...prev,
      [selectedCategory]: {
        ...prev[selectedCategory],
        [amount]: (prev[selectedCategory]?.[amount] || 0) + 1,
      },
    }))
  }

  const decrementAmountCount = (amount: string) => {
    setCategoryAmounts((prev) => {
      const current = prev[selectedCategory]?.[amount] || 0
      const next = Math.max(current - 1, 0)

      return {
        ...prev,
        [selectedCategory]: {
          ...prev[selectedCategory],
          [amount]: next,
        },
      }
    })
  }

  const handleConfirm = () => {
    if (!form.age || !form.type || !hasAmountSelections) return
    const entry: Entry = {
      age: form.age,
      type: form.type,
      categoryAmounts: { ...createEmptyCategoryAmountCounts(), ...categoryAmounts },
      timestamp: formatTimestamp(new Date()),
    }

    setEntries((prev) => [...prev, entry])
    setForm({ age: '', type: '' })
    setSelectedCategory(categoryOptions[0].label)
    setSelectedAmounts(createEmptySelectedAmounts())
    setCategoryAmounts(createEmptyCategoryAmountCounts())
    setStep('start')
  }

  const resetToStart = () => {
    setForm({ age: '', type: '' })
    setSelectedCategory(categoryOptions[0].label)
    setSelectedAmounts(createEmptySelectedAmounts())
    setCategoryAmounts(createEmptyCategoryAmountCounts())
    setStep('start')
  }

  const handleDeleteEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDownloadCsv = async () => {
    const fileName = 'market-scouting.csv'
    const triggerDownload = (url: string) => {
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      link.remove()
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const { uri } = await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        })

        triggerDownload(Capacitor.convertFileSrc(uri))
        alert('CSV saved to your device in the Documents folder.')
      } catch (error) {
        console.error('Failed to save CSV on device', error)
        alert('Unable to save CSV file. Please check storage permissions and try again.')
      }
      return
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url)
    URL.revokeObjectURL(url)
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
            <button className="download" type="button" onClick={handleDownloadCsv}>
              Download CSV
            </button>
          </div>
          <div className="csv-content" ref={savedEntriesRef}>
            <div className="table-headings" style={{ gridTemplateColumns: entryColumnTemplate }}>
              <span>Time</span>
              <span>Age</span>
              {categoryOptions.map((option) => (
                <span key={option.label} className="amount-heading">
                  {option.label}
                </span>
              ))}
              <span></span>
            </div>
            <div className="table-body">
              {entries.map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${entry.age}-${entry.type}-${index}`}
                  className="table-row"
                  style={{ gridTemplateColumns: entryColumnTemplate }}
                >
                  <span className="time-value">
                    {isCompactSavedEntries
                      ? (entry.timestamp?.split(' ')[1] || entry.timestamp || '—')
                      : entry.timestamp || '—'}
                  </span>
                  <span className="age-value">{entry.age || '—'}</span>
                  {categoryOptions.map((option) => {
                    const amounts = entry.categoryAmounts[option.label] || {}
                    const total = Object.values(amounts).reduce((sum, value) => sum + value, 0)
                    return (
                      <span key={option.label} className="amount-value">
                        {isCompactSavedEntries ? '—' : total ? <span className="pill">{total}</span> : '0'}
                      </span>
                    )
                  })}
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
        const count = categoryAmounts[selectedCategory]?.[option.label] || 0
        const isSelected = selectedAmounts[selectedCategory] === option.label
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
            <h2>Select Type</h2>
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
              setSelectedCategory(categoryOptions[0].label)
              setSelectedAmounts(createEmptySelectedAmounts())
              setCategoryAmounts(createEmptyCategoryAmountCounts())
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
          <div className="category-tabs">
            {categoryOptions.map((category) => {
              const categoryTotal = Object.values(categoryAmounts[category.label] || {}).reduce(
                (sum, value) => sum + value,
                0,
              )

              return (
                <button
                  key={category.label}
                  className={`category-tab ${selectedCategory === category.label ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.label)}
                  style={{ backgroundColor: selectedCategory === category.label ? category.color : undefined }}
                >
                  {category.label}
                  <span className="category-total">{categoryTotal}</span>
                </button>
              )
            })}
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
              <div className="amount-summary-title">Amount selections by category</div>
              <div className="category-summary-grid">
                {categoryOptions.map((category) => {
                  const amounts = categoryAmounts[category.label] || {}
                  const categoryTotal = Object.values(amounts).reduce((sum, value) => sum + value, 0)
                  if (categoryTotal === 0) return null

                  const nonZeroAmounts = amountOptions.filter((option) => (amounts[option.label] || 0) > 0)
                  return (
                    <div key={category.label} className="category-summary">
                      <div className="category-summary-header">
                        <span className="amount-label">{category.label}</span>
                        <span className="pill">{categoryTotal}</span>
                      </div>
                      <div className="amount-grid compact">
                        {nonZeroAmounts.map((option) => (
                          <div key={option.label} className="amount-summary-cell">
                            <span className="amount-label">{option.label}</span>
                            <span className="pill">{amounts[option.label] || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
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
