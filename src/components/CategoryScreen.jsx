import { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import { SHEET_CSV_URL } from '../config'

export default function CategoryScreen({ usedWords = [], initialSelection = [], onStartGame, onBackToDashboard }) {
  const [rawCategories, setRawCategories] = useState({}) // all words from sheet
  const [selectedCategories, setSelectedCategories] = useState(initialSelection)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  // Filter out already-used words (case-insensitive) from every category
  const usedSet = useMemo(
    () => new Set(usedWords.map((w) => w.toLowerCase())),
    [usedWords]
  )

  const categories = useMemo(() => {
    const filtered = {}
    Object.entries(rawCategories).forEach(([header, words]) => {
      const fresh = words.filter((w) => !usedSet.has(w.toLowerCase()))
      if (fresh.length > 0) {
        filtered[header] = fresh
      }
    })
    return filtered
  }, [rawCategories, usedSet])

  // Total words across ALL categories (before and after filtering)
  const totalRawWords = Object.values(rawCategories).reduce((s, w) => s + w.length, 0)
  const totalFreshWords = Object.values(categories).reduce((s, w) => s + w.length, 0)
  const allExhausted = !loading && totalRawWords > 0 && totalFreshWords === 0

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

        {/* Select All / Deselect All toggle + count */}
        {Object.keys(categories).length > 0 && (
          <div className="flex items-center gap-3 mb-3 animate-fade-in">
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className={`
                px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.96]
                ${allSelected
                  ? 'bg-purple-500/15 border border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
                  : 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-900/25 hover:shadow-purple-900/40 hover:from-purple-500 hover:to-violet-500'
                }
              `}
            >
              {allSelected ? '✕ Deselect All' : '✦ Select All'}
            </button>
            <span className="text-xs text-text-muted">
              {Object.keys(categories).length} {Object.keys(categories).length === 1 ? 'category' : 'categories'}
            </span>
          </div>
        )}

        {/* Category Grid */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="grid grid-cols-2 gap-2.5 stagger-children">
            {Object.keys(categories).map((cat, i) => {
              const isSelected = selectedCategories.includes(cat)
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`
                    relative p-3.5 rounded-xl border text-left transition-all duration-200 active:scale-[0.97]
                    ${isSelected
                      ? 'bg-purple-600/20 border-purple-500/40 shadow-lg shadow-purple-900/20'
                      : 'bg-bg-card/50 border-border/50 hover:bg-bg-card-hover hover:border-border'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{categoryIcons[i % categoryIcons.length]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-purple-300' : 'text-text-primary'}`}>
                        {cat}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {categories[cat].length} words
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center animate-scale-in">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

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
