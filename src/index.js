import { App } from './App'

const app = new App({ el: document.getElementById('app') })

if (module && module.hot) {
  // module.hot.accept((a, b) => {
  //   // Having this function here makes dat.gui work correctly
  //   // when using hot module replacement
  // })
  module.hot.dispose(() => {
    if (myApp) myApp.dispose()
  })
}
