const app = require('express')()

const host = process.env['CONTROLLER_SERVICE_HOST'] || '0.0.0.0'
const port = process.env['CONTROLLER_SERVICE_PORT'] || 8001

app.listen(port, host, () => console.log(`Controller service listening on ${host}:${port}!`))

app.get('/', (req, res) => {
  return res.send({app: 'ControllerService'})
})

app.get('/discover_uploader', (req, res) => {
  console.log('Received a discover upload request!')

  return res.send('{}')
})

