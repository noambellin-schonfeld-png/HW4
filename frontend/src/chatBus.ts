/** Lets any page open the chat with a question ("Ask the Bulldog about this"). */
const EVENT = 'cc:ask-bulldog'

export function askBulldog(question: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: question }))
}

export function onAskBulldog(handler: (question: string) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
