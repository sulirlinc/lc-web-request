const axios = require('axios')
const md5 = require('js-md5')
const { saveData, saveStartTime, getData, removeItem,
  TimeUnit, LocalTimeUnit
} = require('./cache')()
export {
  getData as getCacheData , saveData as saveCacheData, removeItem as removeCacheItem, LocalTimeUnit, TimeUnit
}
const timeoutUrl = {}

const saveCacheByUrl = (value, data, urls) => {
  const url = value.url || value
  const config = urls[url] || {}
  if (config) {
    config.url = url
    config.key = md5(JSON.stringify(value))
    config.data = { data }
    saveData(config)
  }
}
const getCacheByUrl = (value, urls) => {
  const config = urls[value.url] || {}
  if (config) {
    const data = getData(md5(JSON.stringify(value)))
    return data
  }
}

const requestByCache = ({ config, request, urls }) => {
  const md = md5(JSON.stringify(config))
  if (timeoutUrl[md]) {
    if (!timeoutUrl[md].data) {
      return new Promise((resolve, reject) => {
        reject({ code: '1003', message: '正在加载数据，请等待！！' })
      })
    } else {
      delete timeoutUrl[md]
    }
  }
  timeoutUrl[md] = {}
  return (getCacheByUrl(config, urls) || request(config).then(response => {
    saveStartTime(response.headers['start-time'])
    saveCacheByUrl(config, response.data, urls)
    return response
  })).then(response => {
    timeoutUrl[md].data = response.data
    return response
  }, error => {
    delete timeoutUrl[md]
    return error
  }).catch(() => delete timeoutUrl[md])
}

export default ({
  baseURL,
  timeout = 5000,
  tokenKey = 'Authorization',
  cacheUrls,
  responseInterceptor = {

  },
  requestInterceptor = () => {},
  getToken = () => {
  },
  ...config
}) => {
  const request = axios.create({ baseURL, timeout, ...config })
  request.interceptors.request.use(({ ...config }) => {
    requestInterceptor(config)
    config.headers[tokenKey] = getToken()
    return config
  }, error => {
    throw error
  })
  if (responseInterceptor.response && responseInterceptor.error) {
    request.interceptors.response.use(responseInterceptor.response,
        responseInterceptor.error)
  } else {
    request.interceptors.response.use(
        response => response,
        error => {
          const rejectObject = { error, type: 'error', message: '未定义的错误。' }
          if (!error.response) {
            rejectObject.message = '网络异常，请稍后刷新重试！'
            rejectObject.code = '1001'
          } else if (error.response.status === 401 || error.response.status
              === 403) {
            rejectObject.message = '无权访问！'
            rejectObject.code = '1002'
            rejectObject.type = 'low.power'
          } else {
            if (error.response.status === 502) {
              rejectObject.message = '网络繁忙，请稍候重试！'
            } else if (error.response && error.response.data
                && error.response.data.message) {
              rejectObject.message = error.response.data.message
            } else if (error.message) {
              rejectObject.message = error.message
            }
          }
          return Promise.reject(rejectObject)
        })
  }
  return {
    request,
    finds(config) {
      if (cacheUrls) {
        return requestByCache(
            { config: { ...config, method: 'get' }, request, urls: cacheUrls })
      } else {
        return request(config)
      }
    },
    post(config) {
      request({
        ...config,
        method: 'post'
      })
    },
    put(config) {
      request({
        ...config,
        method: 'put'
      })
    },
    del(config) {
      request({
        ...config,
        method: 'delete'
      })
    },
    get(config) {
      request({
        ...config,
        method: 'get'
      })
    }
  }
}