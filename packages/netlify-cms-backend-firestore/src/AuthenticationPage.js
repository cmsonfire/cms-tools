import React from 'react'
import styled from '@emotion/styled'

import FirebaseLogin from './components/FirebaseLogin'
import getConfig from './components/FirebaseLogin/config'

const SectionWrapper = styled('section')`
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  height: 100vh;
`
const IconWrapper = styled('span')`
  width: 300px;
  height: 200px;
  margin-top: -150px;
`
const LogoImage = styled('img')`
  display: block;
  margin-left: auto;
  margin-right: auto;
  width: 50%;
`

const CustomLogoIcon = ({ imageSrc }) => {
  return (
    <IconWrapper>
      <LogoImage src={imageSrc} alt="Logo" />
    </IconWrapper>
  )
}

function AuthenticationPage({ config, onLogin, inProgress }) {
  const [isSignedIn, setSignedIn] = React.useState(false)
  const [loggingIn, setLoggingIn] = React.useState(inProgress)
  const [uiConfig, setUiConfig] = React.useState(null)
  const [firebaseAuth, setFirebaseAuth] = React.useState(null)
  
  const logoSrc = config.get('logo_src')
  const handleLogin = user => {
    setSignedIn(!!user)
    if (user) onLogin(user)
  }

  React.useEffect(() => {
    /**
     * Hack at this point to use firebase state from implementation
     * because there is no state passed at this time.
     */
    const firebase = window['__firebasecms__'].firebase
    if (!firebase) throw 'firebase missing'
    if (firebase && !firebase.auth) throw 'firebase auth missing'
    
    /**
     * Get the signInOptions from the config to build uiConfig using getConfig
     */
    const baseConfig = config.toJS()
    const firebaseSettings = baseConfig.backend.firebase
    const signInOptions = firebaseSettings ? firebaseSettings.signInOptions || [] : []

    setUiConfig(getConfig({ auth: firebase.auth, signInOptions }))
    setFirebaseAuth(firebase.auth())
  })

  React.useEffect(() => {
    console.log('inProgress:', inProgress)
    setLoggingIn(inProgress)
  }, [inProgress])

  return (
    <SectionWrapper>
      <CustomLogoIcon imageSrc={logoSrc} />
      { loggingIn &&
        <div>...Logging In</div>
      }
      { !isSignedIn && !loggingIn && uiConfig && firebaseAuth &&
        <FirebaseLogin onLogin={handleLogin} uiConfig={uiConfig} firebaseAuth={firebaseAuth} />
      }
    </SectionWrapper>
  )
}

export default AuthenticationPage
