const app = require('express')()

const serviceShortName = 'Inventory'
const serviceName = serviceShortName + 'Service'

const host = process.env['INVENTORY_SERVICE_HOST'] || '0.0.0.0'
const port = process.env['INVENTORY_SERVICE_PORT'] || 8003

app.listen(port, host, () => console.log(`${serviceShortName} service listening on ${host}:${port}!`))

app.get('/', (req, res) => {
  return res.send({serviceName})
})

