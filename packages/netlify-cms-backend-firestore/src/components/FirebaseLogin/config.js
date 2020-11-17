// [WIP] https://github.com/firebase/firebaseui-web#configuration
const getUIConfig = ({ auth, signInOptions }) => {
  const uiConfig = {
    signInOptions: [
      // https://github.com/firebase/firebaseui-web#available-providers
      // firebase.auth.EmailAuthProvider.PROVIDER_ID,
      // firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      // firebase.auth.GithubAuthProvider.PROVIDER_ID,
      // firebase.auth.FacebookAuthProvider.PROVIDER_ID,
      // firebase.auth.TwitterAuthProvider.PROVIDER_ID,
      // firebase.auth.PhoneAuthProvider.PROVIDER_ID,
      // firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID,
    ],
    // Terms of service url.
    tosUrl: '/terms/',
    // Sets the `signedIn` state property to `true` once signed in.
    callbacks: {
      signInSuccessWithAuthResult: (authResult, redirectUrl) => {
        console.log('signedIn: true', authResult, redirectUrl)
        return false // Return type determines whether we continue the redirect automatically
        // or whether we leave that to developer to handle (false).
      },
    },
    signInFlow: 'popup',
  }
  if (!auth) throw 'Firebase Auth Missing'
  if (signInOptions)
    uiConfig.signInOptions = signInOptions.map((item) => {
      if (typeof item === 'string') {
        return auth[item].PROVIDER_ID
      }
      if (item.provider) {
        return { provider: auth[item.provider].PROVIDER_ID, ...item.options }
      }
      return null
    })
  return uiConfig
}

export default getUIConfig
