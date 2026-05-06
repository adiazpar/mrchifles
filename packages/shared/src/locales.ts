/**
 * Locale registry — single source of truth for adding a new language.
 *
 * To add a language:
 *   1. Add an entry to LOCALES with label, acceptPrefixes, and translate
 *      metadata (name + guidance).
 *   2. Copy `en-US.json` → `<code>.json` in src/i18n/messages/.
 *   3. Run `npm run i18n:translate -- --target <code>`.
 *
 * Everything else (the next-intl supported list, the Accept-Language
 * picker's prefix matching, the business-locale → translation-file
 * resolver, the language-row label, and the translate script's system
 * prompt) derives from this object.
 */

export interface LocaleConfig {
  /** Display label shown in the language picker (native script). */
  label: string
  /**
   * Accept-Language base codes that map to this locale. For en-US this is
   * `['en']` so en-GB / en-AU also resolve here; for es it is `['es']` so
   * es-MX / es-PE / es-AR all collapse here.
   */
  acceptPrefixes: readonly string[]
  /**
   * Translate-script metadata. The English source omits this — there is
   * nothing to translate from English to English. Every other locale must
   * provide it for `npm run i18n:translate -- --target <code>` to work.
   */
  translate?: {
    /** Human-readable language name injected into the translate prompt. */
    name: string
    /** Locale-specific tone / vocabulary rules injected into the prompt. */
    guidance: string
  }
}

export const LOCALES = {
  'en-US': {
    label: 'English',
    acceptPrefixes: ['en'],
  },
  es: {
    label: 'Español',
    acceptPrefixes: ['es'],
    translate: {
      name: 'Spanish',
      guidance: `Spanish-specific rules:
- Use the "usted" form, not "tu".
- Avoid anglicisms where a natural Spanish term exists. Prefer: "Guardar" not "Salvar"; "Atras" not "Espalda"; "Iniciar sesion" not "Loguearse"; "Contrasena" not "Password"; "Correo" not "Email" unless space-constrained.
- Match POS / retail vocabulary the Latin American market actually uses.`,
    },
  },
  ja: {
    label: '日本語',
    acceptPrefixes: ['ja'],
    translate: {
      name: 'Japanese',
      guidance: `Japanese-specific rules:
- Use polite form (desu/masu, です/ます). Do not use plain form (da/ru).
- Do not use overly humble keigo (sonkeigo/kenjogo) — neutral polite is correct for a POS app used by the business owner.
- Use kanji where natural; avoid forcing hiragana for words that are normally written in kanji (e.g. 商品 not しょうひん, 在庫 not ざいこ, 顧客 not こきゃく).
- Use katakana for loanwords that are standard in Japanese retail/POS vocabulary (バーコード, カテゴリ, パスワード, メール, ログイン, ログアウト, アイコン).
- Common POS / inventory vocabulary: 商品 (product), 在庫 (stock), カテゴリ (category), 仕入先 (supplier/provider), 発注 (order), 売上 (sales), 価格 (price), 数量 (quantity), 業務 (business), チーム (team), メンバー (member), オーナー (owner), 招待コード (invite code).
- Buttons / actions stay short. Use 保存 (save), キャンセル (cancel), 削除 (delete), 戻る (back), 次へ (next), 続ける (continue), 完了 (done), 追加 (add), 編集 (edit).
- Do NOT add Japanese sentence-ending punctuation (。) where the English source has none. Mirror the source's punctuation discipline — UI labels, button text, and short headers stay punctuation-free.
- Use full-width Japanese punctuation (。、) only inside actual sentences (toasts, paragraphs, helper text), never inside ICU placeholders or button labels.
- Spacing: do NOT insert spaces between Japanese characters. Keep spaces only around Latin words, numbers, and ICU placeholders ({name}, {count}).`,
    },
  },
} as const satisfies Record<string, LocaleConfig>

export type SupportedLocale = keyof typeof LOCALES

export const SUPPORTED_LOCALES = Object.keys(LOCALES) as readonly SupportedLocale[]

export const DEFAULT_LOCALE: SupportedLocale = 'en-US'

/**
 * Look up a locale config by an arbitrary string (e.g. a CLI argument).
 * Returns `undefined` for unknown locales — callers decide how to fall back.
 */
export function getLocaleConfig(locale: string): LocaleConfig | undefined {
  return (LOCALES as Record<string, LocaleConfig>)[locale]
}

/**
 * Resolve a BCP-47 tag (e.g. `'es-PE'`, `'en-GB'`, `'ja-JP'`) to a
 * supported locale via its base prefix. Returns `undefined` when no
 * registered locale claims the prefix.
 */
export function resolveLocaleByPrefix(tag: string): SupportedLocale | undefined {
  const base = tag.split('-')[0].toLowerCase()
  for (const [locale, config] of Object.entries(LOCALES) as [
    SupportedLocale,
    LocaleConfig,
  ][]) {
    if (config.acceptPrefixes.includes(base)) return locale
  }
  return undefined
}
