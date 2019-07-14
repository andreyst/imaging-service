const app = require('express')()

const host = process.env['ACCESS_SERVICE_HOST'] || '0.0.0.0'
const port = process.env['ACCESS_SERVICE_PORT'] || 8002

app.listen(port, host, () => console.log(`Access service listening on ${host}:${port}!`))

app.get('/', (req, res) => {
  return res.send({app: 'AccessService'})
})

app.get('/authenticate', (req, res) => {
  console.log('Received an authenticate request')

  return res.send({ result: 'success', authenticated: true })
})

app.get('/authorize', (req, res) => {
  console.log('Received an authorize request')

  return res.send({ result: 'success', authorized: true })
})



