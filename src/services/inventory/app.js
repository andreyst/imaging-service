// Tracing should be required and initialized before all other modules
const tracing = require('../../util/tracing.js').init()
// Logging initializes rest of the tracers
const logger = require('../../util/logging.js').init()

const expressUtil = require('../../util/express.js')
const app = expressUtil.init()

const accessClient = require('../access/client.js')

app.get('/', (req, res) => {
  return res.send({serviceName})
})

app.get('/reserve', async (req, res) => {
  const startTime = new Date().getTime()
  const {span, headersOut} = tracing.startSpan(process.env.SERVICE_NAME, req.headers)

  try {
    await accessClient.authenticate(span, headersOut)
    await accessClient.authorize(span, headersOut)
  } catch (err) {
    return expressUtil.handleClientError(span, err, res)
  }

  await new Promise(done => setTimeout(done, Math.floor(Math.random() * 100)));

  const elapsedTime = new Date().getTime() - startTime
  logger.info({ message: 'Reserve request finished', elapsedTime, traceIds: span.getTraceIds() })

  res.send({ success: true, reserved: true, traceIds: span.getTraceIds() })

  span.log({ 'event': 'reserved' });
  span.finish()
})

expressUtil.listen(app, process.env.INVENTORY_SERVICE_PORT, process.env.INVENTORY_SERVICE_HOST)

