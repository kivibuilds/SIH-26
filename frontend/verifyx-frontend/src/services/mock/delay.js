/**
 * Artificial delay helper to simulate network latency for realistic loading states
 */
export const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

export default delay
