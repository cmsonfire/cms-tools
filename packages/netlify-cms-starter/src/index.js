import React from 'react'
import ReactDOM from 'react-dom'

import './index.css'
import { FirestoreProvider } from 'netlify-cms-backend-firestore'
import NetlifyCMS from './NetlifyCMS'
import * as serviceWorker from './serviceWorker'
import config from './NetlifyCMS/config'

const AppWrapper = () => {
  const appName =
    config.backend.firebase && config.backend.firebase.appName
      ? config.backend.firebase.appName
      : '[DEFAULT]'

  return (
    <FirestoreProvider config={config.backend.firebase.config} name={appName}>
      <NetlifyCMS config={config} />
    </FirestoreProvider>
  )
}

ReactDOM.render(<AppWrapper />, document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister()
