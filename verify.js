
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

const expirationDate = dayjs()
  .tz('Asia/Tokyo')
  .add(3, 'minute')
  .format('YYYY-MM-DDTHH:mm:ssZ')
