import { useState } from "react"
import { Trash2 } from "lucide-react"
import { useStore } from "@/store/useStore"

/** Inline bookmark panel for the connection config page (non-modal) */
export function BookmarkPanel() {
  const { apiType, model, bookmarks, addBookmark, loadBookmark, deleteBookmark, updateBookmark } = useStore()

  const defaultBookmarkName = [apiType, model].filter(Boolean).join(" / ") || "Untitled"
  const [bookmarkName, setBookmarkName] = useState(defaultBookmarkName)

  const handleSave = () => {
    const trimmedName = bookmarkName.trim()
    if (!trimmedName) return
    addBookmark(trimmedName)
    setBookmarkName(defaultBookmarkName)
  }

  const handleLoad = (id: string) => {
    loadBookmark(id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
  }

  const truncate = (text: string, maxLength: number) =>
    text.length > maxLength ? text.slice(0, maxLength) + "…" : text

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Bookmarks</h2>

      {/* Save current config */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={bookmarkName}
          onChange={(e) => setBookmarkName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Bookmark name..."
          className="flex-1 h-8 px-2 text-xs border border-input rounded-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!bookmarkName.trim()}
          className="h-8 px-3 text-xs bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>

      {/* Bookmark list */}
      {bookmarks.length === 0 ? (
        <p className="text-xs text-subtle text-center py-4">No bookmarks saved yet.</p>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="group flex items-center gap-2 p-2 rounded-sm border border-border hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => handleLoad(bookmark.id)}
              title={`Load: ${bookmark.name}\nURL: ${bookmark.config.apiUrl}\nCreated: ${new Date(bookmark.createdAt).toLocaleString()}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{bookmark.name}</div>
                <div className="text-[10px] text-subtle truncate">
                  {bookmark.config.apiType && (
                    <span className="inline-block bg-muted px-1 rounded-sm mr-1">{bookmark.config.apiType}</span>
                  )}
                  {truncate(bookmark.config.apiUrl || "no url", 40)}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  updateBookmark(bookmark.id)
                }}
                className="shrink-0 p-1 text-subtle hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                title="Update bookmark with current config"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteBookmark(bookmark.id)
                }}
                className="shrink-0 p-1 text-subtle hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete bookmark"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
