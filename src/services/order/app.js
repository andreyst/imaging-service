// Tracing should be required and initialized before all other modules
const tracing = require('../../util/tracing.js').init()
// Logging initializes rest of the tracers
const logger = require('../../util/logging.js').init()

const expressUtil = require('../../util/express.js')
const app = expressUtil.init()

const accessClient = require('../access/client.js')
const paymentClient = require('../payment/client.js')
const inventoryClient = require('../inventory/client.js')
const shippingClient = require('../shipping/client.js')

const uuid = require('uuid')

// AWS X-Ray
// app.use(AWSXRay.express.openSegment('MyApp'));

app.get('/order', async (req, res) => {
  const startTime = new Date().getTime()

  const span = tracing.startSpan('order', req.headers)

  let orderId = uuid.v4()
  let userId = Math.floor(Math.random() * Math.floor(10));

  const headers = {}
  span.injectHeaders(headers)
  console.log(headers)

  try {
    await accessClient.authenticate(span, headers, orderId)
    await accessClient.authorize(span, headers, orderId)
    await paymentClient.pay(span, headers, orderId)
    await Promise.all([
      inventoryClient.reserve(span, headers, orderId),
      shippingClient.ship(span, headers, orderId)
    ]);
  } catch (err) {
    return expressUtil.handleClientError(span, err, res)
  }

  const elapsedTime = new Date().getTime() - startTime
  logger.info({message: 'Made order', orderId, elapsedTime, userId, traceIds: span.getTraceIds()})

  res.send({ success: true, ordered: true, orderId, traceIds: span.getTraceIds() })
  span.log({'event': 'order_made'});

  span.finish()
})

expressUtil.listen(app, process.env.ORDER_SERVICE_PORT, process.env.ORDER_SERVICE_HOST)

// app.use(AWSXRay.express.closeSegment());