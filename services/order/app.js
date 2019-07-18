const serviceShortName = 'Order'
const serviceName = serviceShortName + 'Service'

const ddTracer = require('dd-trace').init({
  enabled: true,
  service: serviceName,
  hostname: process.env['DD_AGENT_TRACE_HOST'],
  port: process.env['DD_AGENT_TRACE_PORT'],
  analytics: true,
  logInjection: true,
})

const app = require('express')()
const request = require('request')
const uuid = require('uuid')
const winston = require('winston')
const WinstonCloudWatch = require('winston-cloudwatch');
const {LoggingWinston} = require('@google-cloud/logging-winston');
const {ErrorReporting} = require('@google-cloud/error-reporting');
const DatadogTransport = require('@shelf/winston-datadog-logs-transport');
const opentracing = require('opentracing')
const axios = require('axios');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  defaultMeta: { service: serviceShortName },
  // transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.

    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' })
  // ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
  // logger.add(new winston.transports.Syslog({
  //   format: winston.format.simple(),
  //   host: 'localhost',
  //   port: 514,
  //   protocol: 'tcp4',
  // }));
  logger.add(new DatadogTransport({
    apiKey: process.env.DD_API_KEY, // Datadog API key
    // apiKey: '7f0b7899aa3c09ae730d439df78c4213', // Datadog API key
    // optional metadata which will be merged with every log message
    metadata: {
      ddsource: serviceName,
      environment: 'prod'
    }
  }))
  logger.add(new WinstonCloudWatch({
    logGroupName: 'test_group1',
    logStreamName: 'stream1',
    awsRegion: 'eu-west-1',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
    jsonMessage: true,
  }));
  logger.add(new LoggingWinston({
    keyFilename: __dirname + '/../../google_cloud_key.json'
  }))
}

const gcloud_errors = new ErrorReporting({
  keyFilename: __dirname + '/../../google_cloud_key.json',
  reportMode: 'always',
  projectId: 'logs-247119',
});

var initTracer = require('jaeger-client').initTracer;

// See schema https://github.com/jaegertracing/jaeger-client-node/blob/master/src/configuration.js#L37
var config = {
  serviceName: serviceName,
  reporter: {
    logSpans: true,
    agentHost: process.env['JAEGER_HOST'],
    agentPort: process.env['JAEGER_PORT']
  },
  sampler: {
    type: "probabilistic",
    param: 1.0
  }
};

let jaeger_tags = {}
jaeger_tags[`${serviceName}.version`] = "0.0.1"

var options = {
  tags: jaeger_tags,
  // metrics: metrics,
  logger: logger,
};

// var tracer = initTracer(config, options);
const tracer = ddTracer

const host = process.env['ORDER_SERVICE_HOST'] || '0.0.0.0'
const port = process.env['ORDER_SERVICE_PORT'] || 8001

app.listen(port, host, () => logger.info({ message: `${serviceShortName} service listening on ${host}:${port}!` }))

app.get('/', (req, res) => {
  return res.send({serviceName})
})

function get_access_service_endpoint() {
  return 'http://' + process.env['ACCESS_SERVICE_HOST'] + ':' + process.env['ACCESS_SERVICE_PORT']
}

async function authorize(span, headers, orderId) {
  const url = get_access_service_endpoint() + '/authorize'
  const response = await axios.get(url, { headers });

  logger.info({ message: 'Authorization request ' + response.data.success + ' authorized ' + response.data.authorized, orderId: orderId});
  span.log({'event': 'authorized'});
}

async function authenticate(span, headers, orderId) {
  const url = get_access_service_endpoint() + '/authenticate'
  const response = await axios.get(url, { headers });

  span.log({'event': 'authenticated'});
  logger.info({message: 'Authentication request ' + response.data.success + ' authenticated ' + response.data.authenticated, orderId: orderId});
}

async function reserve(span, headers, orderId) {
  const inventory_service_endpoint = 'http://' + process.env['INVENTORY_SERVICE_HOST'] + ':' + process.env['INVENTORY_SERVICE_PORT']

  const url = inventory_service_endpoint + '/reserve'
  const response = await axios.get(url, { headers });

  logger.info({message: 'Inventory reserved request ' + response.data.success, orderId: orderId});
  span.log({'event': 'reserved'});
}

async function ship(span, headers, orderId) {
  const shipping_service_endpoint = 'http://' + process.env['SHIPPING_SERVICE_HOST'] + ':' + process.env['SHIPPING_SERVICE_PORT']
  const url = shipping_service_endpoint + '/ship'
  const response = await axios.get(url, { headers });

  logger.info({message: 'Shipping request ' + response.data.success, orderId: orderId});
  span.log({'event': 'shipped'});
}

async function pay(span, headers, orderId) {
  const payment_service_endpoint = 'http://' + process.env['PAYMENT_SERVICE_HOST'] + ':' + process.env['PAYMENT_SERVICE_PORT']
  const url = payment_service_endpoint + '/pay'
  const response = await axios.get(url, { headers });

  logger.info({message: 'Payment request ' + response.data.success, orderId: orderId});
  span.log({'event': 'paid'});
}

app.get('/order', async (req, res) => {
  const startTime = new Date().getTime()

  const parentSpanContext = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan('order', {
    childOf: parentSpanContext
  })

  let orderId = uuid.v4()

  const headers = {}
  tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, headers)

  try {
    await authenticate(span, headers, orderId)
    await authorize(span, headers, orderId)
    await pay(span, headers, orderId)
    await Promise.all([
      reserve(span, headers, orderId),
      ship(span, headers, orderId)
    ]);
  } catch (err) {
    span.setTag(opentracing.Tags.ERROR, true);
    logger.error({message: err.stack})
    span.log({'event': 'error', 'error.object': err, 'message': err.message, 'stack': err.stack});
    span.finish();
    gcloud_errors.report({'event': 'error', 'error.object': err, 'message': err.message, 'stack': err.stack});

    return res.send({ success: false, traceId: span.context().traceIdStr });
  }

  const elapsedTime = new Date().getTime() - startTime
  logger.info({message: 'Made order ' + orderId + ' in trace ' + span.context().traceIdStr + ' span ' + span.context().spanIdStr, orderId: orderId, elapsedTime})

  res.send({ success: true, orderId, traceId: span.context().toTraceId() })
  span.log({'event': 'order_made'});

  span.finish()
})

