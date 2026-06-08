import type { GameClient } from './GameClient'
import { MockGameClient } from './MockGameClient'

// Single shared client for the app. UI-first build always uses the in-browser
// mock. When the Go backend lands, swap to LiveGameClient behind the env flag:
//
//   export const game: GameClient = import.meta.env.VITE_BACKEND
//     ? new LiveGameClient()
//     : new MockGameClient()
//
export const game: GameClient = new MockGameClient()

export type { GameClient } from './GameClient'
export type { ConnectionState, InvokeResult } from './GameClient'
