export const gameConfig = {
  /** ルームに参加できる最大人数 */
  maxPlayers: 2,
  /** ゲーム開始に必要な最小人数 */
  minPlayersToStart: 2,
  /** ルームの有効期限（秒） */
  roomTtlSeconds: 3600,
} as const;

export type GameConfig = typeof gameConfig;
