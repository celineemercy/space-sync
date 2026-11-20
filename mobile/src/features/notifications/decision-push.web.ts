export async function registerDecisionPush(_accessToken: string, _isCurrent = () => true): Promise<string | null> { return null; }
export async function removeDecisionPush(_accessToken: string, _token: string): Promise<void> {}
export function watchDecisionPushTokens(_listener: () => void) { return () => {}; }
