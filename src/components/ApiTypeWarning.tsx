import { useStore } from '@/store/useStore';
import { isPageSupportedByApiType, getSupportedHandlerTypes, PAGE_LABELS, type PageId } from '@/services/api-handlers/page-compatibility';
import { getApiHandler } from '@/services/api-handlers/registry';

interface ApiTypeWarningProps {
  pageId: PageId;
}

/**
 * Displays a prominent warning banner when the currently selected API type
 * does not support this page. Uses the centralized page-compatibility map.
 *
 * Place this at the top of each page component:
 *   <ApiTypeWarning pageId="text" />
 */
export function ApiTypeWarning({ pageId }: ApiTypeWarningProps) {
  const { apiType, setApiType } = useStore();

  // No API type selected or page is supported → render nothing
  if (!apiType || isPageSupportedByApiType(pageId, apiType)) {
    return null;
  }

  const handler = getApiHandler(apiType);
  const handlerLabel = handler?.label ?? apiType;
  const pageLabel = PAGE_LABELS[pageId];

  // Get handler types that support this page, with their labels
  const supportedHandlerTypes = getSupportedHandlerTypes(pageId);
  const supportedHandlers = supportedHandlerTypes.map((type) => {
    const h = getApiHandler(type);
    return { type, label: h?.label ?? type };
  });

  return (
    <div className="mb-6 rounded-sm border border-orange-500/40 bg-orange-500/10 p-4">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-orange-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-orange-500">
            Unsupported API Type
          </p>
          <p className="text-sm mt-1">
            The <strong>{pageLabel}</strong> page is not suitable for the currently selected API type{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{apiType}</code>{' '}
            ({handlerLabel}).
          </p>
          {supportedHandlers.length > 0 && (
            <p className="text-xs text-subtle mt-2">
              Supported APIs:{' '}
              {supportedHandlers.map((h, index) => (
                <span key={h.type}>
                  {index > 0 && ', '}
                  <button
                    type="button"
                    onClick={() => setApiType(h.type)}
                    className="text-primary underline hover:no-underline cursor-pointer"
                  >
                    {h.label}
                  </button>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
