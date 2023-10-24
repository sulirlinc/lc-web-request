import md5 from 'crypto-js/md5';
import axios from 'axios';
import { cache } from './cache'

const { saveData, saveStartTime, getData, removeItem, TimeUnit, LocalTimeUnit } = cache()
export {
  getData as getCacheData , saveData as saveCacheData, removeItem as removeCacheItem, LocalTimeUnit, TimeUnit
}
const timeoutUrl = {}

const saveCacheByUrl = (value, data, urls) => {
  const url = value.url || value
  const config = urls[url] || {}
  if (config) {
    config.url = url
    config.key = md5(JSON.stringify(value)).toString()
    config.data = { data }
    saveData(config)
  }
}
const getCacheByUrl = (value, urls) => {
  const config = urls[value.url] || {}
  if (config) {
    const data = getData(md5(JSON.stringify(value)).toString())
    return data
  }
}

const requestByCache = ({ config, request, urls, args = { unDoCache: false } }) => {
  if (args.unDoCache) {
    return request(config)
  }
  const md = md5(JSON.stringify(config)).toString()
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
  statusCodeMapping,
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
    request.headers = config.headers
    return config
  }, error => {
    throw error
  })
  if (responseInterceptor.response && responseInterceptor.error) {
    request.interceptors.response.use(responseInterceptor.response, responseInterceptor.error)
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
          if (statusCodeMapping && error.response && error.response.data
              && statusCodeMapping[error.response.data.status]) {
            statusCodeMapping[`${error.response.data.status}`](error.response.data)
          }
          return Promise.reject(rejectObject)
        })
  }
  return {
    request,
    finds(config, args = {}) {
      if (cacheUrls) {
        return requestByCache(
            { config: { ...config, method: 'get' }, request, urls: cacheUrls, args })
      } else {
        return request(config)
      }
    },
    post(config) {
      return request({
        ...config,
        method: 'post'
      })
    },
    put(config) {
      return request({
        ...config,
        method: 'put'
      })
    },
    del(config) {
      return request({
        ...config,
        method: 'delete'
      })
    },
    get(config) {
      return request({
        ...config,
        method: 'get'
      })
    }
  }
}
