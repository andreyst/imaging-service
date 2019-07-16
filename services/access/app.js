const app = require('express')()
const winston = require('winston')
const opentracing = require('opentracing')

const serviceShortName = 'Access'
const serviceName = serviceShortName + 'Service'

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  defaultMeta: { service: serviceShortName },
  // transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
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
}

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
var tracer = initTracer(config, options);

const host = process.env['ACCESS_SERVICE_HOST'] || '0.0.0.0'
const port = process.env['ACCESS_SERVICE_PORT'] || 8002

app.listen(port, host, () => console.log(`${serviceShortName} service listening on ${host}:${port}!`))

app.get('/', (req, res) => {
  return res.send({serviceName})
})

app.get('/authenticate', async (req, res) => {
  console.log('Received an authenticate request')

  const parentSpanContext = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan('authenticate', {
    childOf: parentSpanContext
  })

  await new Promise(done => setTimeout(done, Math.floor(Math.random() * 600)));

  span.log({'event': 'authenticated'})
  span.finish()

  return res.send({ result: 'success', authenticated: true })
})

app.get('/authorize', (req, res) => {
  console.log('Received an authorize request')

  const parentSpanContext = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan('authorize', {
    childOf: parentSpanContext
  })

  span.log({'event': 'authorized'})
  span.finish()

  return res.send({ result: 'success', authorized: true })
})



