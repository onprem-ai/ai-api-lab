import { Button } from "@/components/ui/Button"
import { Moon, Sun, Plug, BookOpen } from "lucide-react"
import { useStore } from "@/store/useStore"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { useEffect, useMemo } from "react"
import { getSupportedPages, PAGE_LABELS, PAGE_ROUTES } from "@/services/api-handlers/page-compatibility"
import { getConnectionStatusColor } from "@/utils/connectionStatusColor"

/** Nav link with typographic active highlight: underline + full opacity when active, dimmed when not */
function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`text-sm px-2 py-1 transition-all ${
        active
          ? "font-semibold underline underline-offset-4 decoration-2"
          : "opacity-50 hover:opacity-80"
      }`}
    >
      {children}
    </Link>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { theme, toggleTheme, apiUrl, setApiUrl, apiKey, setApiKey, model, setModel, apiType, setApiType, apiConnecting, apiConnectable, testApiConnection } = useStore()
  const isDark = theme === "dark"
  const supportedPages = useMemo(() => getSupportedPages(apiType), [apiType])


  // Test API connection when URL, key, or API type changes (debounced)
  useEffect(() => {
    if (apiType) {
      testApiConnection()
    }
  }, [apiUrl, apiKey, apiType, testApiConnection])

  const [searchParams, setSearchParams] = useSearchParams()

  // Sync URL params to store on mount, then strip the key from the URL
  useEffect(() => {
    const url = searchParams.get("url")
    const key = searchParams.get("key")
    const modelParam = searchParams.get("model")
    const apiTypeParam = searchParams.get("type")

    if (url) setApiUrl(url)
    if (key) setApiKey(key)
    if (modelParam) setModel(modelParam)
    if (apiTypeParam) setApiType(apiTypeParam)

    // Strip key from URL immediately so it's not visible in the address bar
    if (key) {
      const cleanParams = new URLSearchParams(searchParams)
      cleanParams.delete("key")
      setSearchParams(cleanParams, { replace: true })
    }
  }, [])

  // Sync store changes to URL params (key is intentionally excluded — use Share button to include it)
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams)
    if (apiUrl) newParams.set("url", apiUrl)
    else newParams.delete("url")
    newParams.delete("key") // never expose key in address bar
    if (model) newParams.set("model", model)
    else newParams.delete("model")
    if (apiType) newParams.set("type", apiType)
    else newParams.delete("type")
    // replace: true prevents flooding browser history with every param change
    setSearchParams(newParams, { replace: true })
  }, [apiUrl, model, apiType, setSearchParams, searchParams])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/llm-api" className="font-bold text-xl">
            AI API Lab
          </Link>
          <nav className="flex items-center gap-1">
            {supportedPages.map((pageId) => (
              <NavLink key={pageId} to={PAGE_ROUTES[pageId]} active={location.pathname === PAGE_ROUTES[pageId]}>
                {PAGE_LABELS[pageId]}
              </NavLink>
            ))}
            <div className="w-px h-6 bg-border mx-1"></div>
            <Link to="/llm-api">
              <Button
                variant="ghost"
                size="icon"
                title="API Configuration"
                className={getConnectionStatusColor(apiConnecting, apiConnectable).text}
              >
                <Plug className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/api-standards">
              <Button
                variant="ghost"
                size="icon"
                title="API Standards"
                className={location.pathname.startsWith("/api-standards") ? "" : "opacity-50 hover:opacity-80"}
              >
                <BookOpen className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </nav>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-xs text-subtle">
          <p>AI API Lab by <a href="https://onprem.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">onprem.ai</a></p>
        </div>
      </footer>
    </div>
  )
}
