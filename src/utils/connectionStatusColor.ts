/**
 * Shared connection status color mapping.
 * Returns both text-* and bg-* Tailwind classes based on connection state.
 *
 * - connecting: orange (pulsing)
 * - connected: green
 * - failed: red
 * - unknown (null): orange
 */
export function getConnectionStatusColor(apiConnecting: boolean, apiConnectable: boolean | null) {
  if (apiConnecting) return { text: "text-orange-500", bg: "bg-orange-500", animate: true }
  if (apiConnectable === true) return { text: "text-green-500", bg: "bg-green-500", animate: false }
  if (apiConnectable === false) return { text: "text-red-500", bg: "bg-red-500", animate: false }
  // null = unknown state (no URL, no API type selected)
  return { text: "text-orange-500", bg: "bg-orange-500", animate: false }
}
