const md5 = require('js-md5')

const localData = {
  data: {},
  setItem: function (key, value) {
    this.data[key] = value
  },
  clear: function () {
    this.data = {}
  },
  getItem: function (key) {
    return this.data[key]
  },
  removeItem: function (key) {
    this.data[key] = null
  }
}

const getStorage = () => {
  if (!window.localStorage) {
    return localData
  } else {
    return window.localStorage
  }
}

const TimeUnit = {
  SECONDS: 'SECONDS',
  MINUTES: 'MINUTES',
  HOURS: 'HOURS',
  DAYS: 'DAYS'
}

const LocalTimeUnit = {
  SECONDS: 1000,
  MINUTES: 1000 * 60,
  HOURS: 1000 * 60 * 60,
  DAYS: 1000 * 60 * 60 * 24
}

const removeItem = (key) => {
  if (typeof key !== 'string') {
    key = JSON.stringify(key)
  }
  getStorage().removeItem(md5(key))
}

const saveStartTime = (startTime) => {
  if (getStartTime() > parseInt(`${ startTime || '0' }`)) {
    return
  }
  getStorage().setItem('startTime', startTime)
}

const getStartTime = () => {
  return parseInt(getStorage().getItem('startTime') || '0')
}

const saveData = (config) => {
  if (config && config.key && config.url && config.data) {
    const url = config.url
    const key = config.key
    const cache = {
      url,
      key,
      persistent: config.persistent,
      startTime: getStartTime(),
      expires: !config.persistent ? new Date().getTime() + ((config.expires
          || 3) * LocalTimeUnit[config.timeUnit || 'SECONDS']) : 0,
      data: config.data
    }
    getStorage().setItem(key, JSON.stringify(cache))
  }
}

const expires = () => {
  const storage = getStorage()
  for (const key in storage) {
    const item = storage.getItem(key)
    if (!item) {
      continue
    }
    const cache = JSON.parse(item)
    if (!cache.persistent && cache.expires < new Date().getTime()) {
      getStorage().removeItem(key)
    }
  }
}

const getData = (key, callback) => {
  const cache = JSON.parse(getStorage().getItem(key))
  if (cache) {
    if (cache.startTime < getStartTime()) {
      getStorage().removeItem(key)
      return
    }
    if (cache.persistent || cache.expires >= new Date().getTime()) {
      return new Promise(function (resolve, reject) {
        if (callback) {
          callback(cache.data)
        }
        resolve(cache.data)
      })
    }
    getStorage().removeItem(key)
  }
}
module.exports = () => {
  setInterval(expires, LocalTimeUnit.MINUTES)
  return { saveData, getData, saveStartTime, removeItem }
}

