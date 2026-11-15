import { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import { SHEET_CSV_URL } from '../config'

const CUSTOM_CATEGORIES_KEY = 'imposter_custom_categories'

function loadCustomCategories() {
  try {
    const data = localStorage.getItem(CUSTOM_CATEGORIES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function persistCustomCategories(cats) {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats))
  } catch {
    // ignore
  }
}

function parsePastedWords(text) {
  if (!text) return []
  // Split by line breaks (\r\n or \n)
  let rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  // Fallback: if only 1 line and it contains commas, split by comma
  if (rawLines.length === 1 && rawLines[0].includes(',')) {
    rawLines = rawLines[0].split(',')
  }

  const words = []
  const seen = new Set()

  for (const raw of rawLines) {
    let line = raw.trim()
    // Strip common copy-paste list prefixes like: "1. ", "1) ", "- ", "• ", "* "
    line = line.replace(/^[\s*\-•\d.)\]]+\s*/, '').trim()
    // Strip outer quotes if any
    if (
      (line.startsWith('"') && line.endsWith('"')) ||
      (line.startsWith("'") && line.endsWith("'"))
    ) {
      line = line.slice(1, -1).trim()
    }

    if (line.length > 0) {
      const lower = line.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        words.push(line)
      }
    }
  }
  return words
}

export default function CategoryScreen({ usedWords = [], initialSelection = [], onStartGame, onBackToDashboard }) {
  const [rawCategories, setRawCategories] = useState({}) // all words from sheet
  const [customCategories, setCustomCategories] = useState(loadCustomCategories)
  const [selectedCategories, setSelectedCategories] = useState(initialSelection)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add custom category modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatWordsText, setNewCatWordsText] = useState('')
  const [newCatError, setNewCatError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(SHEET_CSV_URL)
      if (!response.ok) throw new Error('Failed to fetch sheet data')
      const csvText = await response.text()

      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      })

      if (!result.data || result.data.length === 0) {
        throw new Error('No data found in the sheet')
      }

      // Row 1 headers = category names, rows below = words
      const headers = result.meta.fields.filter((h) => h.trim() !== '')
      const catData = {}

      headers.forEach((header) => {
        const words = result.data
          .map((row) => row[header]?.trim())
          .filter((word) => word && word.length > 0)
        if (words.length > 0) {
          catData[header] = words
        }
      })

      if (Object.keys(catData).length === 0) {
        throw new Error('No categories with words found')
      }

      setRawCategories(catData)
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Combine sheet categories and custom temporary categories
  const combinedRawCategories = useMemo(() => {
    const merged = { ...rawCategories }
    customCategories.forEach((cat) => {
      if (cat.name && Array.isArray(cat.words) && cat.words.length > 0) {
        merged[cat.name] = cat.words
      }
    })
    return merged
  }, [rawCategories, customCategories])

  // Filter out already-used words (case-insensitive) from every category
  const usedSet = useMemo(
    () => new Set(usedWords.map((w) => w.toLowerCase())),
    [usedWords]
  )

  const categories = useMemo(() => {
    const filtered = {}
    Object.entries(combinedRawCategories).forEach(([header, words]) => {
      const fresh = words.filter((w) => !usedSet.has(w.toLowerCase()))
      if (fresh.length > 0) {
        filtered[header] = fresh
      }
    })
    return filtered
  }, [combinedRawCategories, usedSet])

  // Total words across ALL categories (before and after filtering)
  const totalRawWords = Object.values(combinedRawCategories).reduce((s, w) => s + w.length, 0)
  const totalFreshWords = Object.values(categories).reduce((s, w) => s + w.length, 0)
  const allExhausted = !loading && totalRawWords > 0 && totalFreshWords === 0

  // Live parsed words for the add category modal
  const liveParsedWords = useMemo(
    () => parsePastedWords(newCatWordsText),
    [newCatWordsText]
  )

  const handleAddCustomCategory = (e) => {
    if (e) e.preventDefault()
    const name = newCatName.trim()
    if (!name) {
      setNewCatError('Please enter a category name.')
      return
    }

    const words = parsePastedWords(newCatWordsText)
    if (words.length === 0) {
      setNewCatError('Please enter at least one word (one word or name per line).')
      return
    }

    // Check if category name matches a sheet category
    const existingSheet = Object.keys(rawCategories).find(
      (k) => k.toLowerCase() === name.toLowerCase()
    )
    if (existingSheet) {
      setNewCatError(`"${existingSheet}" already exists in sheet categories. Please use a different name.`)
      return
    }

    const existingCustomIndex = customCategories.findIndex(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    )

    let updated
    if (existingCustomIndex >= 0) {
      updated = [...customCategories]
      updated[existingCustomIndex] = {
        ...updated[existingCustomIndex],
        name,
        words,
      }
    } else {
      const newCat = {
        id: 'cat_' + Date.now(),
        name,
        words,
        createdAt: new Date().toISOString(),
      }
      updated = [newCat, ...customCategories]
    }

    setCustomCategories(updated)
    persistCustomCategories(updated)

    // Auto-select this newly created category so it is immediately ready to play
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev : [...prev, name]
    )

    // Reset & close
    setNewCatName('')
    setNewCatWordsText('')
    setNewCatError('')
    setShowAddModal(false)
  }

  const handleDeleteCustomCategory = (catName) => {
    const confirmed = window.confirm(`Delete temporary category "${catName}"?`)
    if (!confirmed) return

    const updated = customCategories.filter(
      (c) => c.name.toLowerCase() !== catName.toLowerCase()
    )
    setCustomCategories(updated)
    persistCustomCategories(updated)
    setSelectedCategories((prev) => prev.filter((c) => c !== catName))
  }

  // Prune any stale selections (categories that became empty after usedWords filtering)
  useEffect(() => {
    if (Object.keys(categories).length > 0) {
      setSelectedCategories((prev) =>
        prev.filter((cat) => cat in categories)
      )
    }
  }, [categories])

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const selectAll = () => {
    setSelectedCategories(Object.keys(categories))
  }

  const deselectAll = () => {
    setSelectedCategories([])
  }

  const catKeys = Object.keys(categories)
  const allSelected =
    catKeys.length > 0 && selectedCategories.length === catKeys.length

  const handleStart = () => {
    // Gather fresh words from selected categories only
    const pool = selectedCategories.flatMap((cat) => categories[cat] || [])
    if (pool.length === 0) return
    const secretWord = pool[Math.floor(Math.random() * pool.length)]
    onStartGame(secretWord, selectedCategories)
  }

  const totalWords = selectedCategories.reduce(
    (sum, cat) => sum + (categories[cat]?.length || 0),
    0
  )

  const categoryIcons = [
    '⚽', '🏏', '🍎', '🎬', '🌍', '🎵', '📚', '🎮',
    '🏀', '🍕', '🚗', '🧪', '💼', '🎯', '🌸',
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-5">
        <div className="animate-pulse-glow w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-4">
          <span className="text-3xl animate-spin" style={{ animationDuration: '2s' }}>⏳</span>
        </div>
        <p className="text-text-secondary text-sm animate-fade-in">Loading categories from Google Sheets...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh px-5 py-8 relative">
      <div className="bg-glow-purple top-0 left-0 opacity-20" />

      <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col">
        {/* Back to Dashboard */}
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-purple-400 transition-colors mb-4 self-start"
        >
          <span>←</span> Dashboard
        </button>

        {/* Header */}
        <div className="text-center mb-6 animate-fade-in-up">
          <h2 className="text-2xl font-bold text-text-primary mb-1">Choose Categories</h2>
          <p className="text-text-secondary text-sm">Select one or more word categories</p>
        </div>

        {/* Used words notice */}
        {usedWords.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/15 mb-4 animate-fade-in">
            <span className="text-sm">📝</span>
            <p className="text-xs text-amber-400">
              {usedWords.length} {usedWords.length === 1 ? 'word' : 'words'} already used this session
              {totalFreshWords > 0 && <> · <span className="text-emerald-400">{totalFreshWords} fresh words left</span></>}
            </p>
          </div>
        )}

        {/* All words exhausted warning */}
        {allExhausted && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 mb-4 text-center animate-scale-in">
            <span className="text-3xl mb-2 block">🎉</span>
            <p className="text-red-400 text-sm font-semibold mb-1">All words have been used!</p>
            <p className="text-text-muted text-xs">
              You've played through every word. Start a new game or add more words to your Google Sheet.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 animate-scale-in">
            <p className="text-red-400 text-sm mb-2">⚠️ {error}</p>
            <button
              onClick={() => fetchData()}
              className="text-sm text-purple-400 underline hover:text-purple-300"
            >
              Try again
            </button>
          </div>
        )}

        {/* Actions Bar: Select All / Deselect All + Add Category */}
        <div className="flex items-center justify-between gap-2.5 mb-3.5 animate-fade-in">
          <button
            onClick={allSelected ? deselectAll : selectAll}
            className={`
              px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-[0.96]
              ${allSelected
                ? 'bg-purple-500/15 border border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
                : 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-900/25 hover:shadow-purple-900/40 hover:from-purple-500 hover:to-violet-500'
              }
            `}
          >
            {allSelected ? '✕ Deselect All' : '✦ Select All'}
          </button>

          <button
            onClick={() => {
              setShowAddModal(true)
              setNewCatError('')
            }}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-950/40 transition-all duration-200 active:scale-[0.96] flex items-center gap-1.5 border border-emerald-400/30"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>Add Category</span>
          </button>
        </div>

        {/* Category Grid */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="grid grid-cols-2 gap-2.5 stagger-children">
            {Object.keys(categories).map((cat, i) => {
              const isSelected = selectedCategories.includes(cat)
              const isCustom = customCategories.some((c) => c.name.toLowerCase() === cat.toLowerCase())

              return (
                <div
                  key={cat}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCategory(cat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleCategory(cat)
                    }
                  }}
                  className={`
                    relative p-3.5 rounded-xl border text-left transition-all duration-200 active:scale-[0.97] cursor-pointer select-none group
                    ${isSelected
                      ? 'bg-purple-600/20 border-purple-500/40 shadow-lg shadow-purple-900/20'
                      : 'bg-bg-card/50 border-border/50 hover:bg-bg-card-hover hover:border-border'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl shrink-0">
                      {isCustom ? '✨' : categoryIcons[i % categoryIcons.length]}
                    </span>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-purple-300' : 'text-text-primary'}`}>
                        {cat}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-text-muted">
                          {categories[cat].length} words
                        </p>
                        {isCustom && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top-right action icons */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCustomCategory(cat)
                        }}
                        className="w-5 h-5 rounded-full bg-red-500/15 hover:bg-red-500/30 text-red-400 hover:text-red-300 flex items-center justify-center text-[10px] transition-colors"
                        title="Delete custom category"
                      >
                        ✕
                      </button>
                    )}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center animate-scale-in">
                        <span className="text-white text-[10px]">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Add Custom Category Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#16162a] border border-purple-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-purple-950/60 animate-scale-in flex flex-col max-h-[90dvh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-bold">
                    +
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-text-primary">Add Custom Category</h3>
                    <p className="text-xs text-text-secondary">Saved on your phone for future rounds</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-7 h-7 rounded-lg bg-bg-card-hover text-text-muted hover:text-text-primary flex items-center justify-center text-xs transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleAddCustomCategory} className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Category Name */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => {
                      setNewCatName(e.target.value)
                      if (newCatError) setNewCatError('')
                    }}
                    placeholder="e.g. Friends Gang, Web Series, Marathi Actors"
                    className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary border border-border focus:border-purple-500 focus:outline-none text-text-primary placeholder:text-text-muted text-sm transition-colors"
                    autoFocus
                  />
                </div>

                {/* Words Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Words (1 per line)
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-400">
                      {liveParsedWords.length} {liveParsedWords.length === 1 ? 'word' : 'words'} detected
                    </span>
                  </div>
                  <textarea
                    value={newCatWordsText}
                    onChange={(e) => {
                      setNewCatWordsText(e.target.value)
                      if (newCatError) setNewCatError('')
                    }}
                    rows={6}
                    placeholder={`Amey\nTanvi\nKunal\nAnushka`}
                    className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary border border-border focus:border-purple-500 focus:outline-none text-text-primary placeholder:text-text-muted text-sm font-mono transition-colors resize-none leading-relaxed"
                  />
                  <p className="text-[11px] text-text-muted mt-1 leading-normal">
                    💡 Directly copy-paste from ChatGPT or notes. Each line is counted as 1 secret word or name.
                  </p>
                </div>

                {/* Words Preview Chips */}
                {liveParsedWords.length > 0 && (
                  <div className="bg-bg-secondary/70 rounded-xl p-3 border border-border/60">
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                      Preview ({liveParsedWords.length} words):
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {liveParsedWords.slice(0, 10).map((w, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium truncate max-w-[140px]"
                        >
                          {w}
                        </span>
                      ))}
                      {liveParsedWords.length > 10 && (
                        <span className="px-2 py-0.5 rounded-md bg-bg-card border border-border text-text-muted text-xs font-medium">
                          +{liveParsedWords.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {newCatError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
                    ⚠️ {newCatError}
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-text-secondary bg-bg-card-hover hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newCatName.trim() || liveParsedWords.length === 0}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      newCatName.trim() && liveParsedWords.length > 0
                        ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.97]'
                        : 'bg-bg-card-hover text-text-muted border border-border cursor-not-allowed'
                    }`}
                  >
                    Add & Select Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom info + Start */}
        <div className="pt-4 space-y-3 shrink-0">
          {selectedCategories.length > 0 && (
            <div className="flex items-center justify-center gap-4 text-xs text-text-secondary animate-fade-in">
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                {totalWords} words in pool
              </span>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={selectedCategories.length === 0 || totalWords === 0}
            className={`w-full py-4 text-lg tracking-wide rounded-xl font-semibold transition-all duration-200 ${
              selectedCategories.length > 0 && totalWords > 0
                ? 'btn-success animate-pulse-glow'
                : 'bg-bg-card text-text-muted border border-border cursor-not-allowed'
            }`}
            style={selectedCategories.length > 0 && totalWords > 0 ? { '--tw-shadow-color': 'rgba(16, 185, 129, 0.3)' } : {}}
          >
            {selectedCategories.length > 0
              ? totalWords > 0
                ? '🎮 Start Round'
                : 'No fresh words left in selection'
              : 'Select at least 1 category'}
          </button>
        </div>
      </div>
    </div>
  )
}
