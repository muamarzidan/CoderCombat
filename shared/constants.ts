import type { CharacterId } from './types.js'


export const MODULE_IDS = [
  // Web dasar
  'html-dasar',
  'css-dasar',
  'js-dasar',
  // Fundamental berpikir & komputer
  'mathematical',
  'computational',
  'algo-dsa',
  // App development (Flutter + Dart)
  'dart-dasar',
  'flutter-dasar',
  'flutter-lanjutan',
  // AI / Machine Learning
  'ai-dasar',
  'ml-dasar',
  'ai-tools',
] as const

export type ModuleId = (typeof MODULE_IDS)[number]

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === 'string' && (MODULE_IDS as readonly string[]).includes(value)
}

export const DEFAULT_MODULE_ID: ModuleId = 'html-dasar'

export const CHARACTER_IDS = ['samurai', 'shinobi'] as const

export const DEFAULT_CHARACTER_ID: CharacterId = 'shinobi'

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && (CHARACTER_IDS as readonly string[]).includes(value)
}
