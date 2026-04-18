import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/Select"
import { useStore } from "@/store/useStore"
import { Info, Share2, Check } from "lucide-react"
import { getConnectionStatusColor } from "@/utils/connectionStatusColor"
import { useState, useMemo, useCallback } from "react"
import { getAllHandlers } from "@/services/api-handlers/registry"
import { getSupportedPages, PAGE_ROUTES } from "@/services/api-handlers/page-compatibility"
import type { ApiHandler } from "@/services/api-handlers/types"
import { BookmarkPanel } from "@/components/BookmarkPanel"

/** Group handlers by their category field */
function groupHandlersByCategory(handlers: ApiHandler[]) {
  const groups = new Map<string, ApiHandler[]>()
  for (const handler of handlers) {
    const category = handler.category
    if (!groups.has(category)) groups.set(category, [])
    groups.get(category)!.push(handler)
  }
  return groups
}

export function LlmApi() {
  const { apiUrl, setApiUrl, apiKey, setApiKey, model, setModel, apiType, setApiType, apiConnecting, apiConnectable, connectionTestResult, testApiConnection } = useStore()
  const allHandlers = useMemo(() => getAllHandlers(), [])
  const groupedHandlers = useMemo(() => groupHandlersByCategory(allHandlers), [allHandlers])
  const [showRequest, setShowRequest] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  /** Build the full shareable URL with all config params including the API key */
  const handleShareUrl = useCallback(() => {
    const shareParams = new URLSearchParams()
    if (apiType) shareParams.set("type", apiType)
    if (apiUrl) shareParams.set("url", apiUrl)
    if (apiKey) shareParams.set("key", apiKey)
    if (model) shareParams.set("model", model)
    // Link to the first supported page for this API type (e.g. /llm), not the connection page
    const supportedPages = getSupportedPages(apiType)
    const targetPath = supportedPages.length > 0 ? PAGE_ROUTES[supportedPages[0]] : '/llm'
    const shareUrl = `${window.location.origin}${targetPath}?${shareParams.toString()}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }, [apiType, apiUrl, apiKey, model])

  const formatJson = (data: any) => {
    if (!data) return ""
    return JSON.stringify(data, null, 2)
  }

  return (
    <div className="max-w-5xl mx-auto py-12 flex gap-12">
      {/* Left column: Configuration */}
      <div className="flex-1 min-w-0">
      <h1 className="text-2xl font-bold mb-6">API Configuration</h1>

      {/* Connection Status */}
      <div className="mb-6 p-4 rounded-lg border relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Connection Status</p>
            <p className="text-xs text-muted-foreground mt-1">
              {apiConnecting
                ? "Testing connection..."
                : apiConnectable === true
                ? "Connection successful"
                : apiConnectable === false
                ? "Connection failed"
                : "No configuration provided"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const statusColor = getConnectionStatusColor(apiConnecting, apiConnectable);
              return (
                <div className={`h-2 w-2 rounded-full ${statusColor.bg} ${statusColor.animate ? 'animate-pulse' : ''}`}></div>
              );
            })()}
            {/* Info icon with tooltip */}
            <div className="group relative">
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 bg-popover text-popover-foreground text-xs rounded shadow-lg max-w-md hidden group-hover:block z-50 border">
                {connectionTestResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <p className="font-medium">Connection Test Details</p>
                      <span className="text-xs text-muted-foreground">{connectionTestResult.timestamp}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1">Request</p>
                      <div className="space-y-1">
                        <p>
                          <span className="font-semibold text-muted-foreground">Method:</span> {connectionTestResult.method}
                        </p>
                        <p>
                          <span className="font-semibold text-muted-foreground">URL:</span> {connectionTestResult.url}
                        </p>
                        <div className="mt-1">
                          <button
                            onClick={() => setShowRequest(!showRequest)}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            {showRequest ? "Hide" : "Show"} Request Body
                          </button>
                          {showRequest && (
                            <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto">
                              {formatJson(connectionTestResult.requestBody)}
                            </pre>
                          )}
                        </div>
                        <div className="mt-1">
                          <p className="text-xs font-semibold">Headers:</p>
                          <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto">
                            {formatJson(connectionTestResult.requestHeaders)}
                          </pre>
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-xs font-semibold mb-1">Response</p>
                      <div className="space-y-1">
                        <p>
                          <span className="font-semibold text-muted-foreground">Status:</span>{" "}
                          {connectionTestResult.statusCode
                            ? connectionTestResult.statusCode >= 200 && connectionTestResult.statusCode < 300
                              ? "200 OK"
                              : connectionTestResult.statusCode
                            : "N/A"}
                        </p>
                        <div className="mt-1">
                          <button
                            onClick={() => setShowResponse(!showResponse)}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            {showResponse ? "Hide" : "Show"} Response Body
                          </button>
                          {showResponse && (
                            <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto">
                              {formatJson(connectionTestResult.responseBody)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                    {connectionTestResult.error && (
                      <div className="mt-2 p-2 bg-destructive/20 text-destructive text-xs rounded">
                        <span className="font-semibold">Error:</span> {connectionTestResult.error}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="max-w-xs">Configure URL and API key, then click "Test Connection" to see details</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            API Type
          </label>
          <Select value={apiType || undefined} onValueChange={setApiType}>
            <SelectTrigger>
              <SelectValue placeholder="Select API type..." />
            </SelectTrigger>
            <SelectContent>
              {Array.from(groupedHandlers.entries()).map(([category, handlers]) => (
                <SelectGroup key={category}>
                  <SelectLabel>{category}</SelectLabel>
                  {handlers.map((handler) => (
                    <SelectItem key={handler.type} value={handler.type}>
                      {handler.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            API URL
          </label>
          <Input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://api.example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            API Key
          </label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Model
          </label>
          <Input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex gap-2">
          <Button onClick={testApiConnection} disabled={apiConnecting}>
            {apiConnecting ? "Testing..." : "Test Connection"}
          </Button>
          <Button variant="outline" onClick={handleShareUrl} title="Copy shareable URL with API key to clipboard">
            {shareCopied ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
            {shareCopied ? "Copied!" : "Share URL"}
          </Button>
        </div>
      </div>
      </div>

      {/* Right column: Bookmarks */}
      <div className="w-80 shrink-0">
        <BookmarkPanel />
      </div>
    </div>
  )
}
