const axios = require('axios')
const logger = require('../../util/logging.js').logger

function get_access_service_endpoint() {
  return 'http://' + process.env['ACCESS_SERVICE_HOST'] + ':' + process.env['ACCESS_SERVICE_PORT']
}

async function authenticate(span, headers, orderId) {
  const url = get_access_service_endpoint() + '/authenticate'
  const response = await axios.get(url, { headers, timeout: 5000 });

  const success = response.data.success
  const event = response.data.authenticated ? 'authenticated' : 'authentication_failed'
  logger.info({ message: 'Authentication request finished', success, authenticated: response.data.authenticated, orderId });
  span.log({event});
}

async function authorize(span, headers, orderId) {
  const url = get_access_service_endpoint() + '/authorize'
  const response = await axios.get(url, { headers, timeout: 5000 });

  const success = response.data.success
  const event = response.data.authorized ? 'authorized' : 'unauthorized'
  logger.info({ message: 'Authorization request finished', success, authorized: response.data.authorized, orderId });
  span.log({event});
}

module.exports.authenticate = authenticate
module.exports.authorize = authorize

