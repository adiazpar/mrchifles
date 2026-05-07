#!/usr/bin/env node
// Codemod: next-intl `useTranslations(ns) + t('key')` => react-intl
// `useIntl() + intl.formatMessage({ id: 'ns.key' })`. Preserves the values
// object as second argument when present.
//
// Strategy:
// - For each `const t = useTranslations('ns')` declaration, capture the
//   bound name (`t`, `tCommon`, etc.) and the namespace string.
// - Replace the init with `useIntl()` (so the variable is now an IntlShape).
// - Within the enclosing function scope, rewrite every CallExpression of
//   `<varName>(...)` to `<varName>.formatMessage({ id: 'ns.key' }, values?)`.
// - Also handles template-literal keys: `t(\`tab_${id}\`)` becomes
//   `t.formatMessage({ id: \`ns.tab_${id}\` }, ...)` (template literal preserved).
// - Replaces `useLocale()` calls with `intl.locale` reads (auto-injects
//   `const intl = useIntl()` if not already declared in that scope).
// - Replaces the import: `useTranslations`/`useLocale` from 'next-intl'
//   becomes `useIntl` from 'react-intl'. `NextIntlClientProvider` is
//   dropped (caller handles separately).
//
// Run from apps/web/: `node scripts/codemod-intl.mjs`

import jscodeshift from 'jscodeshift'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(__dirname, '../src')

const files = await glob('**/*.{ts,tsx}', { cwd: srcRoot, absolute: true })

const j = jscodeshift.withParser('tsx')
let transformedCount = 0
const warnings = []

function warn(msg) {
  warnings.push(msg)
  console.warn(`[codemod] ${msg}`)
}

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('next-intl')) continue

  const root = j(source)
  let changed = false
  const relFile = path.relative(srcRoot, file)

  // ---------------------------------------------------------------
  // 1. Process import declarations from 'next-intl'.
  // ---------------------------------------------------------------
  const nextIntlImports = root.find(j.ImportDeclaration, {
    source: { value: 'next-intl' },
  })

  let importsUseIntl = false
  let importsUseTranslations = false
  let importsUseLocale = false
  let importsClientProvider = false
  const otherSpecs = []

  nextIntlImports.forEach((p) => {
    const specs = p.node.specifiers || []
    for (const spec of specs) {
      const name = spec.imported?.name
      if (name === 'useTranslations') importsUseTranslations = true
      else if (name === 'useLocale') importsUseLocale = true
      else if (name === 'NextIntlClientProvider') importsClientProvider = true
      else if (name) {
        otherSpecs.push({ name, spec })
        warn(`Unhandled next-intl import "${name}" in ${relFile} — left in place.`)
      }
    }
  })

  // Decide whether file needs a `useIntl` import (from react-intl).
  // Any file that imported useTranslations or useLocale will need it.
  if (importsUseTranslations || importsUseLocale) importsUseIntl = true

  // ---------------------------------------------------------------
  // 2. Rewrite `const t = useTranslations('ns')` declarations.
  //    Track binding names by enclosing function scope so we know
  //    where to look when injecting `const intl = useIntl()` later.
  // ---------------------------------------------------------------

  // Map enclosing function node => Set of bound t-names
  const fnToTNames = new Map()
  // Map (functionNode, varName) => namespace string
  const tNamespaces = new Map()

  function fnKey(fn, name) {
    // Use a unique pair-ish key. WeakMap doesn't serialize, so use map of fn
    // to inner map.
    return [fn, name]
  }

  root.find(j.VariableDeclarator).forEach((declPath) => {
    const init = declPath.node.init
    if (
      init?.type === 'CallExpression' &&
      init.callee?.type === 'Identifier' &&
      init.callee.name === 'useTranslations'
    ) {
      if (declPath.node.id.type !== 'Identifier') {
        warn(`Non-identifier binding for useTranslations in ${relFile}; skipping.`)
        return
      }
      const tName = declPath.node.id.name

      // Capture namespace from the argument.
      let namespace = ''
      const arg = init.arguments?.[0]
      if (arg) {
        if (arg.type === 'StringLiteral' || arg.type === 'Literal') {
          namespace = String(arg.value || '')
        } else {
          warn(`Computed namespace in ${relFile} (var ${tName}); skipping declaration. Manual fix required.`)
          return
        }
      }

      // Replace the init: useTranslations(ns) => useIntl()
      declPath.node.init = j.callExpression(j.identifier('useIntl'), [])

      // Find enclosing function scope.
      const fnScope = j(declPath).closest(j.Function)
      if (fnScope.length === 0) {
        warn(`No enclosing function for ${tName} in ${relFile}`)
        return
      }
      const fnNode = fnScope.get().node
      if (!fnToTNames.has(fnNode)) fnToTNames.set(fnNode, new Map())
      fnToTNames.get(fnNode).set(tName, namespace)

      changed = true
    }
  })

  // ---------------------------------------------------------------
  // 3. Rewrite calls `<tName>(<key>, <values>?)` inside the matching
  //    function scope to `<tName>.formatMessage({ id: 'ns.key' }, values?)`.
  //    Walk each function scope separately so name collisions across
  //    components don't cross-contaminate.
  // ---------------------------------------------------------------
  for (const [fnNode, names] of fnToTNames) {
    j(fnNode)
      .find(j.CallExpression)
      .forEach((callPath) => {
        const callee = callPath.node.callee
        if (callee.type !== 'Identifier') return
        if (!names.has(callee.name)) return

        // Make sure we don't accidentally rewrite the `useTranslations(...)`
        // init we just replaced (it's now `useIntl()` so callee name doesn't
        // match anyway). And don't rewrite our own replacements: but those
        // are MemberExpressions, so skip naturally.

        const tName = callee.name
        const namespace = names.get(tName)
        const args = callPath.node.arguments
        const keyArg = args[0]
        if (!keyArg) {
          warn(`Empty t() call in ${relFile}; skipping.`)
          return
        }

        let idNode
        if (keyArg.type === 'StringLiteral' || keyArg.type === 'Literal') {
          const fullKey = namespace
            ? `${namespace}.${keyArg.value}`
            : String(keyArg.value)
          idNode = j.literal(fullKey)
        } else if (keyArg.type === 'TemplateLiteral') {
          // Prefix the leading quasi with `<namespace>.` to keep the
          // resolved id correct: `tab_${id}` => `providers.tab_${id}`.
          if (namespace) {
            const newQuasis = keyArg.quasis.map((q, i) => {
              if (i === 0) {
                const raw = q.value.raw
                const cooked = q.value.cooked
                return j.templateElement(
                  { raw: `${namespace}.${raw}`, cooked: `${namespace}.${cooked}` },
                  q.tail,
                )
              }
              return q
            })
            idNode = j.templateLiteral(newQuasis, keyArg.expressions)
          } else {
            idNode = keyArg
          }
        } else {
          // Computed key — wrap with namespace prefix at runtime if any.
          if (namespace) {
            idNode = j.binaryExpression('+', j.literal(`${namespace}.`), keyArg)
            warn(`Computed key in ${relFile} (var ${tName}); rewrote with concat fallback. Verify.`)
          } else {
            idNode = keyArg
          }
        }

        const valuesArg = args[1]
        callPath.replace(
          j.callExpression(
            j.memberExpression(j.identifier(tName), j.identifier('formatMessage')),
            [
              j.objectExpression([
                j.property('init', j.identifier('id'), idNode),
              ]),
              ...(valuesArg ? [valuesArg] : []),
            ],
          ),
        )

        // Warn if t.rich/t.raw show up — they're MemberExpression callees
        // so we won't have rewritten them above. We catch them in a separate
        // pass below.
      })
  }

  // ---------------------------------------------------------------
  // 4. Detect and warn about <tName>.rich / .raw calls (left untouched).
  // ---------------------------------------------------------------
  for (const [fnNode, names] of fnToTNames) {
    j(fnNode)
      .find(j.CallExpression)
      .forEach((callPath) => {
        const callee = callPath.node.callee
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          names.has(callee.object.name) &&
          callee.property.type === 'Identifier' &&
          (callee.property.name === 'rich' || callee.property.name === 'raw')
        ) {
          warn(
            `${callee.object.name}.${callee.property.name}() in ${relFile}; manual fix required.`,
          )
        }
      })
  }

  // ---------------------------------------------------------------
  // 5. Rewrite useLocale() calls.
  //    - For each useLocale() call inside a function scope, replace
  //      with `<intlVar>.locale` where `<intlVar>` is `useIntl()` in
  //      that scope. If no `useIntl()` exists, inject one and reuse
  //      the standard name `intl`.
  // ---------------------------------------------------------------
  if (importsUseLocale) {
    // Collect function scopes containing useLocale calls.
    const useLocaleCalls = root.find(j.CallExpression, {
      callee: { type: 'Identifier', name: 'useLocale' },
    })

    useLocaleCalls.forEach((callPath) => {
      const fnScope = j(callPath).closest(j.Function)
      if (fnScope.length === 0) {
        warn(`useLocale() outside function scope in ${relFile}; skipping.`)
        return
      }
      const fnNode = fnScope.get().node

      // Find an existing intl-binding from a prior `useIntl()` call in
      // this scope. Prefer the standard `intl` name; if a `useTranslations`
      // was already rewritten in this scope to `useIntl()`, reuse one of
      // those bound names.
      let intlVarName = null
      const existingNames = fnToTNames.get(fnNode)
      if (existingNames && existingNames.size > 0) {
        // Reuse first existing binding (any IntlShape works).
        intlVarName = existingNames.keys().next().value
      } else {
        // Look for an explicit useIntl() declaration in this scope.
        j(fnNode)
          .find(j.VariableDeclarator)
          .forEach((dPath) => {
            if (intlVarName) return
            const i = dPath.node.init
            if (
              i?.type === 'CallExpression' &&
              i.callee?.type === 'Identifier' &&
              i.callee.name === 'useIntl' &&
              dPath.node.id.type === 'Identifier'
            ) {
              intlVarName = dPath.node.id.name
            }
          })
      }

      if (!intlVarName) {
        // Inject `const intl = useIntl()` at the start of the function body.
        intlVarName = 'intl'
        const body = fnNode.body
        if (body && body.type === 'BlockStatement') {
          const decl = j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier(intlVarName),
              j.callExpression(j.identifier('useIntl'), []),
            ),
          ])
          body.body.unshift(decl)
          // Track this binding so subsequent useLocale() in same scope
          // reuses it.
          if (!fnToTNames.has(fnNode)) fnToTNames.set(fnNode, new Map())
          fnToTNames.get(fnNode).set(intlVarName, '')
        } else {
          warn(`useLocale() in non-block function body in ${relFile}; skipping.`)
          return
        }
      }

      callPath.replace(j.memberExpression(j.identifier(intlVarName), j.identifier('locale')))
      changed = true
    })
  }

  // ---------------------------------------------------------------
  // 6. Final import rewrite. Replace the next-intl import block with
  //    a single react-intl import (if needed). Keep NextIntlClientProvider
  //    OFF — caller handles App.tsx separately.
  // ---------------------------------------------------------------
  if (nextIntlImports.size() > 0) {
    // If only NextIntlClientProvider was imported, AND nothing else, the
    // file is App.tsx-like; leave the import alone. Caller will fix.
    const onlyClientProvider =
      importsClientProvider &&
      !importsUseTranslations &&
      !importsUseLocale &&
      otherSpecs.length === 0
    if (!onlyClientProvider) {
      // Remove all next-intl imports, then add a single react-intl import.
      nextIntlImports.forEach((p) => p.prune())

      if (importsUseIntl) {
        // Check whether react-intl is already imported. If yes, merge.
        const existingReactIntl = root.find(j.ImportDeclaration, {
          source: { value: 'react-intl' },
        })
        if (existingReactIntl.size() > 0) {
          const node = existingReactIntl.get().node
          const has = (node.specifiers || []).some(
            (s) => s.imported?.name === 'useIntl',
          )
          if (!has) {
            node.specifiers.push(j.importSpecifier(j.identifier('useIntl')))
          }
        } else {
          // Insert at the top of the file's import section. Find first
          // import declaration and insert just before it; if none, prepend.
          const newImport = j.importDeclaration(
            [j.importSpecifier(j.identifier('useIntl'))],
            j.literal('react-intl'),
          )
          const allImports = root.find(j.ImportDeclaration)
          if (allImports.size() > 0) {
            allImports.at(0).insertBefore(newImport)
          } else {
            root.get().node.program.body.unshift(newImport)
          }
        }
      }
      changed = true
    }
  }

  if (changed) {
    const out = root.toSource({ quote: 'single' })
    fs.writeFileSync(file, out)
    transformedCount++
  }
}

console.log(`Transformed ${transformedCount} files`)
console.log(`Warnings: ${warnings.length}`)
