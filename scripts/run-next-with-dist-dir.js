const { spawnSync } = require('node:child_process')

const [command, ...args] = process.argv.slice(2)

if (!command) {
  console.error('Usage: node scripts/run-next-with-dist-dir.js <build|start> [...args]')
  process.exit(1)
}

const nextBinary = require.resolve('next/dist/bin/next')

const result = spawnSync(process.execPath, [nextBinary, command, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || '.next-build',
  },
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
