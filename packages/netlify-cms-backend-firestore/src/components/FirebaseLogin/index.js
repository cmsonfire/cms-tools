import React from 'react';
// import PropTypes from 'prop-types'
import * as firebaseui from 'firebaseui';

// Global ID for the element.
const ELEMENT_ID = 'firebaseui_container';

const FirebaseLogin = ({
  uiConfig,
  firebaseAuth,
  uiCallback,
  onLogin,
  elementId = ELEMENT_ID,
  className,
}) => {
  const [userSignedIn, setUserSignedIn] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [firebaseUiWidget, setFirebaseUiWidget] = React.useState(
    firebaseui.auth.AuthUI.getInstance(),
  );
  const loginRef = React.useRef();

  function onAuthStateChanged() {
    return firebaseAuth.onAuthStateChanged((user) => {
      setUser(user);
    });
  }

  React.useEffect(() => {
    require('firebaseui/dist/firebaseui.css');
    const unregisterAuthObserver = onAuthStateChanged();
    return () => {
      unregisterAuthObserver();
    };
  }, []);

  React.useEffect(() => {
    setUserSignedIn(!!user);
    if (!!user) onLogin(user);
  }, [user]);

  React.useEffect(() => {
    if (userSignedIn) {
      firebaseUiWidget.reset();
    }
  }, [userSignedIn]);

  React.useEffect(() => {
    if (!loginRef.current) return;

    const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(firebaseAuth);
    setFirebaseUiWidget(ui);

    // Specify how to clean up after this effect:
    return async function cleanup() {
      if (firebaseUiWidget) {
        return await firebaseUiWidget.delete();
      } else {
        return;
      }
    };
  }, [firebaseAuth]);

  React.useEffect(() => {
    if (!loginRef.current || !firebaseUiWidget) return;

    // Trigger the callback if any was set.
    if (uiCallback) {
      uiCallback(firebaseUiWidget);
    }

    // Render the firebaseUi Widget.
    // firebaseUiWidget.start(`#${elementId}`, uiConfig)
    // if (firebaseUiWidget.isPendingRedirect()) {
    firebaseUiWidget.start(loginRef.current, uiConfig);
    // }
  }, [loginRef.current, firebaseUiWidget]);

  return <div ref={loginRef} className={className} id={`${elementId}`} />;
};

export default FirebaseLogin;
