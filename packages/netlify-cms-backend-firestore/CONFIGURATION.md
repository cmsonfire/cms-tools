### `config.yml` Configuration

Copy the following into your `config.yml` and replace the parts found in your firebase web settings.

```toml
backend:
  name: firestore
  firebase :
    index_data:
      # <Colection Name>: <type>
      posts: md
    config:
      apiKey: "<API_KEY>"
      authDomain: "<PROJECT_ID>.firebaseapp.com"
      databaseURL: "https://<DATABASE_NAME>.firebaseio.com"
      projectId: "<PROJECT_ID>"
      storageBucket: "<BUCKET>.appspot.com"
    signInOptions:
      - provider: "EmailAuthProvider"
        options:
          requireDisplayName: true
      - provider: "GoogleAuthProvider"
        options:
          customParameters:
            prompt: 'select_account'
      # - "EmailAuthProvider"
      # - "GoogleAuthProvider"
      # - "GithubAuthProvider"
      # - "FacebookAuthProvider"
      # - "TwitterAuthProvider"
      # - "PhoneAuthProvider"
logo_src: "/images/your_logo.png"
public_folder: "//firebasestorage.googleapis.com/v0/b/<BUCKET>.appspot.com/o/images"
```

`backend.firebase.index_data` is used to tell the backend to create the collection into the firestore db as documents for collections rather than just raw `netlify-cms` output. This can be very handy for query type configurations that will use the content for output. This will also allow for rules configuration to be specific for certain roles down the road.

`backend.firebase.signInOptions` allows the configuration of the firebase auth providers you have setup in your firebase setup for the firestore.
