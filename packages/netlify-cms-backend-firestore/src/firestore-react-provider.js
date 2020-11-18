import React from 'react';
import { firebase, FirebaseProvider } from 'firebase-react-provider';
import 'firebase/firestore';
import 'firebase/storage';

export function FirestoreProvider({ children, config, name, ...props }) {
  return (
    <FirebaseProvider config={config} name={name} {...props}>
      {children}
    </FirebaseProvider>
  );
}
