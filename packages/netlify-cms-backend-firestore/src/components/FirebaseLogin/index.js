import React, { Component } from 'react'
import PropTypes from 'prop-types'

// Use this to modify this component
// https://github.com/firebase/firebaseui-web-react/blob/master/src/FirebaseAuth.jsx

// Global ID for the element.
const ELEMENT_ID = 'firebaseui_container'
// Promise that resolves unless the FirebaseUI instance is currently being deleted.
let firebaseUiDeletion = Promise.resolve()

class FirebaseLogin extends Component {
  constructor(props) {
    super(props)

    this.uiConfig = props.uiConfig
    this.firebaseAuth = props.firebaseAuth
    this.uiCallback = props.uiCallback
    this.unregisterAuthObserver = () => {}
    this.onLogin = props.onLogin
    this.elid = props.elementId || ELEMENT_ID
    this.className = props.className
  }
  componentDidMount() {
    // Import the css only on the client.
    require('firebaseui/dist/firebaseui.css')

    // Firebase UI only works on the Client. So we're loading in `componentDidMount`.
    const firebaseui = require('firebaseui')

    // Wait in case the firebase UI instance is being deleted.
    // This can happen if you unmount/remount the element quickly.
    return firebaseUiDeletion.then(() => {
      // Get or Create a firebaseUI instance.
      this.firebaseUiWidget =
        firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(this.firebaseAuth)
      if (this.uiConfig.signInFlow === 'popup') {
        this.firebaseUiWidget.reset()
      }

      // We track the auth state to reset firebaseUi if the user signs out.
      this.userSignedIn = false
      this.unregisterAuthObserver = this.firebaseAuth.onAuthStateChanged(user => {
        if (!user && this.userSignedIn) {
          this.firebaseUiWidget.reset()
        }
        this.userSignedIn = !!user
        if (this.userSignedIn) this.onLogin(user)
      })

      // Trigger the callback if any was set.
      if (this.uiCallback) {
        this.uiCallback(this.firebaseUiWidget)
      }

      // Render the firebaseUi Widget.
      this.firebaseUiWidget.start(`#${this.elid}`, this.uiConfig)
    })
  }

  componentWillUnmount() {
    firebaseUiDeletion = firebaseUiDeletion.then(() => {
      this.unregisterAuthObserver()
      return this.firebaseUiWidget.delete()
    })
    return firebaseUiDeletion
  }

  render() {
    return <div className={this.className} id={this.elid} />
  }
}

FirebaseLogin.propTypes = {
  elementId: PropTypes.string,
  onLogin: PropTypes.func.isRequired,
  uiCallback: PropTypes.func,
  className: PropTypes.string,
  uiConfig: PropTypes.object,
  firebaseAuth: PropTypes.object,
}

export default FirebaseLogin
