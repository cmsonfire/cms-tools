import React from 'react';

import FirebaseLogin from './components/FirebaseLogin';
import getConfig from './components/FirebaseLogin/config';
import { firebase } from 'firebase-react-provider';

const SectionWrapper = ({ children, ...props }) => {
  return (
    <section
      {...props}
      style={{
        display: 'flex',
        flexFlow: 'column nowrap',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </section>
  );
};

const IconWrapper = ({ children, ...props }) => {
  return (
    <span
      {...props}
      style={{
        width: '300px',
        height: 'auto',
        padding: '30px',
      }}
    >
      {children}
    </span>
  );
};
const LogoImage = ({ children, ...props }) => {
  return (
    <img
      {...props}
      style={{
        display: 'block',
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '50%',
      }}
    />
  );
};

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
