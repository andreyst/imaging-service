const axios = require('axios')
const logger = require('../../util/logging.js').logger

async function reserve(span, headers, orderId) {
  const inventory_service_endpoint = 'http://' + process.env['INVENTORY_SERVICE_HOST'] + ':' + process.env['INVENTORY_SERVICE_PORT']

  const url = inventory_service_endpoint + '/reserve'
  const response = await axios.get(url, { headers });

  const success = response.data.success
  const reserved = response.data.reserved
  const event = reserved ? 'reserved' : 'reserve_failed'

  logger.info({message: 'Inventory reserve request finished', success, reserved, orderId});
  span.log({event});
}

module.exports.reserve = reserve
