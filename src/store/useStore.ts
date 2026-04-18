import { create } from "zustand"
import { persist } from "zustand/middleware"
import { getApiHandler } from "@/services/api-handlers/registry"

// Simple debounce function for testing API connection
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
    }, delay)
  }) as T
}

/** Schema version for bookmark data — bump when BookmarkConfig shape changes */
const BOOKMARK_SCHEMA_VERSION = 1

export interface BookmarkConfig {
  apiType: string
  apiUrl: string
  apiKey: string
  model: string
}

export interface ConfigBookmark {
  schemaVersion: number
  id: string
  name: string
  createdAt: string
  updatedAt: string
  config: BookmarkConfig
}

interface ConnectionTestResult {
  url: string
  timestamp: string
  method: string
  requestHeaders: Record<string, string>
  requestBody: any
  statusCode: number | null
  responseHeaders: Record<string, string> | null
  responseBody: any | null
  error: string | null
}

interface StoreState {
  theme: "light" | "dark"
  toggleTheme: () => void

  debugMode: boolean
  toggleDebugMode: () => void

  // Selected API type (handler type ID, e.g. "openai", "paddleocr")
  // Empty string means no specific type selected
  apiType: string
  setApiType: (apiType: string) => void

  // LLM configuration (persisted)
  apiUrl: string
  setApiUrl: (url: string) => void

  apiKey: string
  setApiKey: (key: string) => void

  model: string
  setModel: (model: string) => void

  systemPrompt: string
  setSystemPrompt: (prompt: string) => void

  maxTokens: number
  setMaxTokens: (tokens: number) => void

  // Token estimation: characters per token (default: 5)
  charsPerToken: number
  setCharsPerToken: (chars: number) => void

  // Config bookmarks
  bookmarks: ConfigBookmark[]
  addBookmark: (name: string) => void
  loadBookmark: (id: string) => void
  deleteBookmark: (id: string) => void
  updateBookmark: (id: string) => void

  // API connection status
  apiConnecting: boolean
  apiConnectable: boolean | null
  connectionTestResult: ConnectionTestResult | null

  testApiConnection: () => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "dark" ? "light" : "dark",
        })),

      debugMode: false,
      toggleDebugMode: () =>
        set((state) => ({ debugMode: !state.debugMode })),

      apiType: "openai",
      setApiType: (apiType) => set({ apiType }),

      apiUrl: "",
      setApiUrl: (url) => set({ apiUrl: url }),

      apiKey: "",
      setApiKey: (key) => set({ apiKey: key }),

      model: "",
      setModel: (model) => set({ model: model }),

      systemPrompt: "",
      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

      maxTokens: 32768,
      setMaxTokens: (tokens) => set({ maxTokens: tokens }),

      charsPerToken: 5,
      setCharsPerToken: (chars) => set({ charsPerToken: chars }),

      // Config bookmarks
      bookmarks: [],
      addBookmark: (name) => {
        const { apiType, apiUrl, apiKey, model } = get()
        const now = new Date().toISOString()
        const bookmark: ConfigBookmark = {
          schemaVersion: BOOKMARK_SCHEMA_VERSION,
          id: crypto.randomUUID(),
          name,
          createdAt: now,
          updatedAt: now,
          config: { apiType, apiUrl, apiKey, model },
        }
        set((state) => ({ bookmarks: [...state.bookmarks, bookmark] }))
      },
      loadBookmark: (id) => {
        const bookmark = get().bookmarks.find((b) => b.id === id)
        if (!bookmark) return
        set({
          apiType: bookmark.config.apiType,
          apiUrl: bookmark.config.apiUrl,
          apiKey: bookmark.config.apiKey,
          model: bookmark.config.model,
        })
      },
      deleteBookmark: (id) => {
        set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== id) }))
      },
      updateBookmark: (id) => {
        const { apiType, apiUrl, apiKey, model } = get()
        set((state) => ({
          bookmarks: state.bookmarks.map((b) =>
            b.id === id
              ? { ...b, updatedAt: new Date().toISOString(), config: { apiType, apiUrl, apiKey, model } }
              : b
          ),
        }))
      },

      // API connection status
      apiConnecting: false,
      apiConnectable: null,
      connectionTestResult: null,

      // Debounced API connection test — delegates to handler's testConnection function
      testApiConnection: debounce(() => {
        const { apiUrl, apiKey, apiType } = get()

        const handler = apiType ? getApiHandler(apiType) : undefined

        const isValidUrl = apiUrl.startsWith("http://") || apiUrl.startsWith("https://")

        if (!handler?.testConnection || !apiUrl || !isValidUrl) {
          set({
            apiConnecting: false,
            apiConnectable: null,
            connectionTestResult: {
              url: "",
              timestamp: new Date().toLocaleString(),
              method: "",
              requestHeaders: {},
              requestBody: null,
              statusCode: null,
              responseHeaders: null,
              responseBody: null,
              error: !apiUrl
                ? "Enter an API URL to test connectivity"
                : !isValidUrl
                  ? "API URL must start with http:// or https://"
                  : apiType
                    ? `No health check available for "${apiType}"`
                    : "Select an API type to test connectivity",
            },
          })
          return
        }

        set({ apiConnecting: true, apiConnectable: null, connectionTestResult: null })

        handler.testConnection({ apiBaseUrl: apiUrl, apiKey: apiKey })
          .then((result) => {
            set({
              apiConnecting: false,
              apiConnectable: result.error === null,
              connectionTestResult: {
                ...result,
                timestamp: new Date().toLocaleString(),
              },
            })
          })
          .catch((error) => {
            set({
              apiConnecting: false,
              apiConnectable: false,
              connectionTestResult: {
                url: apiUrl,
                timestamp: new Date().toLocaleString(),
                method: "",
                requestHeaders: {},
                requestBody: null,
                statusCode: null,
                responseHeaders: null,
                responseBody: null,
                error: error instanceof Error ? error.message : "Connection test failed",
              },
            })
          })
      }, 500),
    }),
    {
      name: "app-storage",
      partialize: (state) => ({
        theme: state.theme,
        debugMode: state.debugMode,
        apiType: state.apiType,
        apiUrl: state.apiUrl,
        apiKey: state.apiKey,
        model: state.model,
        systemPrompt: state.systemPrompt,
        maxTokens: state.maxTokens,
        bookmarks: state.bookmarks,
        apiConnectable: state.apiConnectable,
        connectionTestResult: state.connectionTestResult,
      }),
    }
  )
)
