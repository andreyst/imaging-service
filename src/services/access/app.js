// Tracing should be required and initialized before all other modules
const tracing = require('../../util/tracing.js').init()
// Logging initializes rest of the tracers
const logger = require('../../util/logging.js').init()
const opentracing = require('opentracing')

const expressUtil = require('../../util/express.js')
const app = expressUtil.init()

app.get('/authenticate', async (req, res) => {
  logger.info({ message: 'Received authenticate request' })

  const {span, headersOut} = tracing.startSpan(process.env.SERVICE_NAME, req.headers)

  await new Promise(done => setTimeout(done, Math.floor(Math.random() * 250)));

  if (Math.random() < 0.1) {
    logger.error({message: 'Failed to perform authenticate request'})
    span.setTag(opentracing.Tags.ERROR, true);
    span.log({ 'event': 'authentication_error' })
    span.finish()
    return res.status(500).send('HTTP 500 Server Error')
  }

  span.log({ 'event': 'authenticated' })
  span.finish()
  logger.info({ message: 'Finished authenticate request' })

  return res.send({ success: true, authenticated: true, traceIds: span.getTraceIds() })
})

// TODO: Allow authentication in authorize request
app.get('/authorize', async (req, res) => {
  logger.info({ message: 'Received an authorize request' })

  const {span, headersOut} = tracing.startSpan(process.env.SERVICE_NAME, req.headers)

  await new Promise(done => setTimeout(done, Math.floor(Math.random() * 100)));

  span.log({ 'event': 'authorized' })
  span.finish()
  logger.info({ message: 'Finished authorize request' })

  return res.send({ success: true, authorized: true, traceIds: span.getTraceIds() })
})

expressUtil.listen(app, process.env.ACCESS_SERVICE_PORT, process.env.ACCESS_SERVICE_HOST)
