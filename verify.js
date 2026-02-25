const fs = require('fs')

const loadEnv = (path = '.env') => {
  if (!fs.existsSync(path)) return

  const lines = fs.readFileSync(path, 'utf-8').split('\n')

  lines.forEach(line => {
    if (!line || line.startsWith('#')) return

    const index = line.indexOf('=')
    if (index === -1) return

    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()

    process.env[key] = value
  })
}

loadEnv()

console.log(process.env.PORT)
