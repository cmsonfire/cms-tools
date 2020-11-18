import React from 'react';
import styled from '@emotion/styled';

import FirebaseLogin from './components/FirebaseLogin';
import getConfig from './components/FirebaseLogin/config';
import { firebase } from 'firebase-react-provider';

const SectionWrapper = styled('section')`
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;
const IconWrapper = styled('span')`
  width: 300px;
  height: 200px;
  margin-top: -150px;
`;
const LogoImage = styled('img')`
  display: block;
  margin-left: auto;
  margin-right: auto;
  width: 50%;
`;

const CustomLogoIcon = ({ imageSrc }) => {
  return (
    <IconWrapper>
      <LogoImage src={imageSrc} alt="Logo" />
    </IconWrapper>
  );
};

function AuthenticationPage({ config, onLogin, inProgress }) {
  const appName =
    config.backend.firebase && config.backend.firebase.appName
      ? config.backend.firebase.appName
      : '[DEFAULT]';
  console.log(appName, config.backend.firebase.config);
  const [isSignedIn, setSignedIn] = React.useState(false);
  const [loggingIn, setLoggingIn] = React.useState(inProgress);
  const [uiConfig, setUiConfig] = React.useState(null);
  const [auth, setFirebaseAuth] = React.useState();

  const logoSrc = config.logo_src;
  const handleLogin = (user) => {
    setSignedIn(!!user);
    if (user) onLogin(user);
  };

  React.useEffect(() => {
    /**
     * Hack at this point to use firebase state from implementation
     * because there is no state passed at this time.
     */
    // const firebase = window['__firebasecms__'].firebase
    // console.log('firebase:',firebase)
    // if (!firebase) throw 'firebase missing'
    // if (firebase && !firebase.auth) throw 'firebase auth missing'

    /**
     * Get the signInOptions from the config to build uiConfig using getConfig
     */
    // const baseConfig = config.toJS()

    const firebaseSettings = config.backend.firebase;
    const signInOptions = firebaseSettings ? firebaseSettings.signInOptions || [] : [];
    setUiConfig(getConfig({ auth: firebase.auth, signInOptions }));

    const appAuth = firebase.auth(firebase.app(appName));
    if (!appAuth) return;
    appAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    setFirebaseAuth(appAuth);
  }, []);

  React.useEffect(() => {
    setLoggingIn(inProgress);
  }, [inProgress]);

  return (
    <SectionWrapper>
      <CustomLogoIcon imageSrc={logoSrc} />
      {!isSignedIn && !loggingIn && uiConfig && auth ? (
        <FirebaseLogin onLogin={handleLogin} uiConfig={uiConfig} firebaseAuth={auth} />
      ) : (
        <div>...Logging In</div>
      )}
    </SectionWrapper>
  );
}

export default AuthenticationPage;
