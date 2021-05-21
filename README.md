# lc-web-request
主要功能是请求服务器获取列表数据时，将数据存在window.localStorage，或者是内存中。
可能设置根据路径缓存下来。事例如下：
```javascript
import LcWebRequest, { TimeUnit } from 'lc-web-request'

const tranLanguage = {
  en: 'en-US',
  zh: 'zh-CN'
}

/**
 * 缓存的URLs
 * @type {"/users/me": {expires: number, timeUnit: *}}
 */
const cacheUrls = {
  '/users/me': {
    timeUnit: TimeUnit.DAYS,
    expires: 1
  }
}

export const lwr = LcWebRequest({
  baseURL: process.env.BASE_API,
  cacheUrls,
  requestInterceptor: (config) => {
    // 拦截。
    config.headers['Accept-Language'] = tranLanguage[store.getters.language]
  },
  getToken: () => {
    // 这里返回Token，每次请求时，headers带Token。也可以在requestInterceptor去加Token。
  }
})

export default (config) => {
  return lwr.request(config).catch(e => {
    Message({
      message: e.message,
      type: 'error',
      duration: 5 * 1000
    })
  })
}

```
