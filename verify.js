// custom-issuer-data-function-webhook-server

const express = require('express')

const app = express()
const port = Number(process.env.PORT || 5105)

app.use(express.json())

// リクエスト内容を出力
function logRequest(req) {
  console.log('\n==================================================')
  console.log('[Issuer Data Function Webhook]')
  console.log('==================================================')
  console.log('Method:', req.method)
  console.log('URL:', req.originalUrl)
  console.log('Params:', req.params)
  console.log('Query:', req.query)
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  console.log('==================================================\n')
}

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'custom-issuer-data-function-webhook-server'
  })
})

// webhook
// primitive / string を返す
app.get('/webhook/:credentialType/string', (req, res) => {
  logRequest(req)

  const credentialType = req.params.credentialType.toLowerCase()

  switch (credentialType) {
    case 'awards':
      return res.type('text/plain').send('Excellent Performance')

    case 'career':
      return res.type('text/plain').send('Engineering')

    case 'qualifications':
      return res.type('text/plain').send('Advanced')

    default:
      return res.status(400).type('text/plain').send('Unsupported credential type')
  }
})

// webhook-json
// JSON を返す
app.get('/webhook/:credentialType/json', (req, res) => {
  logRequest(req)

  const credentialType = req.params.credentialType.toLowerCase()

  switch (credentialType) {
    case 'awards':
      return res.json({
        category: 'Performance',
        year: 2026,
        rank: 'Gold'
      })

    case 'career':
      return res.json({
        employmentType: 'Full-time',
        yearsOfExperience: 7
      })

    case 'qualifications':
      return res.json({
        issuerName: 'Example Certification Authority',
        issuedYear: 2024,
        valid: true
      })

    default:
      return res.status(400).json({
        error: 'Unsupported credential type'
      })
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log('Custom Issuer Data Function Webhook Server started')
  console.log(`Listening: http://0.0.0.0:${port}`)
  console.log(`Health: http://localhost:${port}/health`)
})
