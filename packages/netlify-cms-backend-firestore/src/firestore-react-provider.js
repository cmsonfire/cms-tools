import React from 'react';
import { firebase, FirebaseProvider } from 'firebase-react-provider';
import { FirestoreProvider } from 'firebase-react-provider/firestore';
import { StorageProvider } from 'firebase-react-provider/storage';

export function Provider({ children, config, name, ...props }) {
  return (
    <FirebaseProvider config={config} name={name} {...props}>
      <FirestoreProvider name={name}>
        <StorageProvider name={name}>{children}</StorageProvider>
      </FirestoreProvider>
    </FirebaseProvider>
  );
}
