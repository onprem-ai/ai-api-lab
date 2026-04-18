import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { getAllHandlers } from '@/services/api-handlers/registry';
import { API_HANDLER_DOCS } from '@/services/api-handlers/docs';
import { useStore } from '@/store/useStore';
import { getSupportedPages, PAGE_LABELS } from '@/services/api-handlers/page-compatibility';
import { getConnectionStatusColor } from '@/utils/connectionStatusColor';

/** Group handlers by their category field for sidebar organization */
function groupHandlersByCategory(handlers: ReturnType<typeof getAllHandlers>) {
  const groups = new Map<string, typeof handlers>();

  for (const handler of handlers) {
    const category = handler.category;
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(handler);
  }

  return groups;
}

export function ApiStandards() {
  const { handlerType } = useParams<{ handlerType: string }>();
  const navigate = useNavigate();
  const { apiType, setApiType, apiConnecting, apiConnectable } = useStore();

  const allHandlers = useMemo(() => getAllHandlers(), []);
  const groupedHandlers = useMemo(() => groupHandlersByCategory(allHandlers), [allHandlers]);

  // Resolve current doc content
  const currentDoc = handlerType ? API_HANDLER_DOCS[handlerType] : null;
  const currentHandler = handlerType
    ? allHandlers.find((h) => h.type === handlerType)
    : null;

  // Pages supported by the currently viewed handler
  const supportedPages = handlerType ? getSupportedPages(handlerType) : [];

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Sidebar */}
      <nav className="w-56 shrink-0">
        <h2 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">
          API Standards
        </h2>
        <ul className="space-y-1">
          {Array.from(groupedHandlers.entries()).map(([vendor, handlers]) => (
            <li key={vendor}>
              <div className="text-xs font-medium text-subtle mt-3 mb-1 uppercase tracking-wider">
                {vendor}
              </div>
              <ul className="space-y-0.5">
                {handlers.map((handler) => {
                  const isActive = handler.type === handlerType;
                  const isSelectedApiType = handler.type === apiType;
                  const hasDoc = !!API_HANDLER_DOCS[handler.type];
                  return (
                    <li key={handler.type}>
                      <button
                        type="button"
                        onClick={() => navigate(`/api-standards/${handler.type}`)}
                        disabled={!hasDoc}
                        className={`w-full text-left px-3 py-1.5 text-sm transition-all ${
                          isActive
                            ? 'font-semibold underline underline-offset-4 decoration-2'
                            : hasDoc
                              ? 'opacity-50 hover:opacity-80'
                              : 'opacity-30 cursor-not-allowed'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span>{handler.label}</span>
                          {isSelectedApiType && (() => {
                            const statusColor = getConnectionStatusColor(apiConnecting, apiConnectable);
                            return (
                              <span
                                className={`w-1.5 h-1.5 rounded-full inline-block ${statusColor.bg} ${statusColor.animate ? 'animate-pulse' : ''}`}
                                title="Active API type"
                              />
                            );
                          })()}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {currentDoc && currentHandler ? (
          <div>
            {/* Handler metadata header with type ID and "Use" button */}
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                  {currentHandler.type}
                </code>
                <span className="text-sm text-subtle">{currentHandler.description}</span>
              </div>
              <button
                type="button"
                onClick={() => setApiType(currentHandler.type)}
                disabled={apiType === currentHandler.type}
                className={`text-xs px-3 py-1.5 rounded-sm transition-colors ${
                  apiType === currentHandler.type
                    ? 'bg-green-500/20 text-green-600 cursor-default'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                }`}
              >
                {apiType === currentHandler.type ? 'Active' : 'Use this API type'}
              </button>
            </div>

            {/* Supported pages info */}
            {supportedPages.length > 0 && (
              <div className="mb-4 text-xs text-subtle">
                Supported pages:{' '}
                {supportedPages.map((pageId, index) => (
                  <span key={pageId}>
                    {index > 0 && ', '}
                    <span className="font-medium">{PAGE_LABELS[pageId]}</span>
                  </span>
                ))}
              </div>
            )}

            <article className="api-standards-doc prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {currentDoc}
              </ReactMarkdown>
            </article>
          </div>
        ) : handlerType ? (
          <div className="text-center py-16 text-subtle">
            <p className="text-lg mb-2">No documentation available</p>
            <p className="text-sm">Handler <code className="bg-muted px-1 rounded">{handlerType}</code> has no API.md file yet.</p>
          </div>
        ) : (
          <div className="text-center py-16 text-subtle">
            <p className="text-lg mb-2">Select an API standard</p>
            <p className="text-sm">Choose a handler from the sidebar to view its API documentation.</p>
          </div>
        )}
      </main>
    </div>
  );
}
