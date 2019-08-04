const winston = require('winston')
const WinstonCloudWatch = require('winston-cloudwatch');
const WinstonSplunkHttpLogger = require('winston-splunk-httplogger');
const WinstonGoogleCloud = require('@google-cloud/logging-winston').LoggingWinston;
const DatadogTransport = require('@shelf/winston-datadog-logs-transport');
const tracing = require('./tracing')

module.exports.init = function() {
  const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    defaultMeta: { service: process.env.SERVICE_NAME },
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
    // optional metadata which will be merged with every log message
    metadata: {
      ddsource: process.env.SERVICE_NAME + 'Service',
      environment: 'prod'
    }
  }))

  logger.add(new WinstonCloudWatch({
    logGroupName: process.env.AWS_LOG_GROUP_NAME,
    logStreamName: process.env.AWS_LOG_STREAM_NAME,
    awsRegion: process.env.AWS_REGION,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
    jsonMessage: true,
  }));

  logger.add(new WinstonGoogleCloud({
    keyFilename: __dirname + '/../../google_cloud_key.json'
  }))

  logger.add(new WinstonSplunkHttpLogger({ splunk: {
      token: process.env.SPLUNK_TOKEN,
      host: process.env.SPLUNK_HOST || 'localhost',
      port: process.env.SPLUNK_PORT,
      protocol: 'http',
    }
  }))

  module.exports.logger = logger

  tracing.initWithLogger(logger)

  console.log(logger)
  return logger
}
