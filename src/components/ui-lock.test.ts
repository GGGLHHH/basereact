import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// vendored shadcn 组件(src/components/ui/**)不手改、可被 `shadcn add` 重生成覆盖。
// 我们对个别文件打了必需的本地补丁(如 sidebar.tsx 的 min-w-0,防 admin 页宽表撑出页面横滚)。
// 此测试对整个 ui/ 目录逐文件取 sha256 快照钉住:任一文件漂移(re-add 覆盖丢补丁、误改)即
// 转红,提示人工确认。有意升级/重贴补丁后,跑 `vitest -u` 重钉快照。
const UI_DIR = join(dirname(fileURLToPath(import.meta.url)), 'ui')

function collectFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectFiles(full))
    } else {
      out.push(full)
    }
  }
  return out
}

function hashUiDir(): Record<string, string> {
  const hashes: Record<string, string> = {}
  for (const file of collectFiles(UI_DIR).sort()) {
    const rel = relative(UI_DIR, file).split('\\').join('/')
    hashes[rel] = createHash('sha256').update(readFileSync(file)).digest('hex')
  }
  return hashes
}

describe('vendored ui/ lock', () => {
  it('every file under components/ui matches its pinned sha256', () => {
    expect(hashUiDir()).toMatchSnapshot()
  })
})
