import { getMatter, EditorialWorkflowError } from './utils'
import AuthenticationPage from './AuthenticationPage'
import { Base64 } from 'js-base64'

/**
 * Firebase/Firestore
 */
import firebase from 'firebase/app'
import 'firebase/auth' // make sure you add this for auth
import 'firebase/firestore' // make sure you add this for firestore
import 'firebase/storage' // make sure you add this for storage

/**
 * Hack at this point to keep firebase state for AuthenticationPage
 */
if (typeof window !== 'undefined') {
  window['__firebasecms__'] = { firebase }
}

const nameFromEmail = email => {
  return email
    .split('@')
    .shift()
    .replace(/[.-_]/g, ' ')
    .split(' ')
    .filter(f => f)
    .map(s => s.substr(0, 1).toUpperCase() + (s.substr(1) || ''))
    .join(' ')
}

export default class NetlifyCmsBackendFirestore {
  constructor(config, options = {}) {
    this.options = options
    this.config = config.toJS()

    // Initialize Firebase instance config.backend.firebase
    const firebaseSettings = this.config.backend.firebase
    const firebaseConfig = firebaseSettings ? firebaseSettings.config || {} : {}

    if (!firebase.apps.length) {
      this.db = firebase.initializeApp(firebaseConfig).firestore() // Initialize Firestore
    } else {
      this.db = firebase.app().firestore() // Existing Firestore
    }

    // Setup the site path for access to this sites data
    this.siteDocument = `sites/${firebaseSettings.siteid || 'default'}`
    // Setup Firebase Storage reference for media folder
    this.mediaFolder = this.config.media_folder || 'media_folder'
    this.mediaRef = firebase.storage().ref()
    this.initialWorkflowStatus = options.initialWorkflowStatus
    this.usingEditorialWorkflow = this.config.publish_mode === 'editorial_workflow'
    this.indexData = firebaseSettings.index_data || {}
  }

  authComponent() {
    return AuthenticationPage
  }

  restoreUser(user) {
    return this.authenticate(user)
  }

  authenticate(state) {
    return Promise.resolve({ email: state.email, name: nameFromEmail(state.email) })
  }

  logout() {
    firebase && firebase.auth && firebase.auth().signOut()
    return
  }

  getToken() {
    return Promise.resolve('')
  }

  entriesByFolder(collection, extension) {
    const firestoreDB = this.db
    const folder = collection.get('name') // name of folder collection
    console.log(`entriesByFolder for ${folder}`, collection)
    return firestoreDB
      .collection(`${this.siteDocument}/${folder}`)
      .get()
      .then(returnQuery => {
        const entries = []
        returnQuery.forEach(doc => {
          const data = doc.data()
          const item = {
            file: { path: data.path },
            data: Base64.decode(data.raw),
          }
          entries.push(item)
        })
        console.log(`entries=>`, entries)
        return entries
      })
      .catch(error => {
        throw new Error(error.message)
      })
  }

  entriesByFiles(collection) {
    console.log(`entriesByFiles`, collection)
    const firestoreDB = this.db
    const collectionName = collection.get('name')

    const files = collection.get('files').map(collectionFile => ({
      collectionName,
      documentID: collectionFile.get('name'),
      fileData: {
        path: collectionFile.get('file'),
        label: collectionFile.get('label'),
      },
    }))

    return Promise.all(
      files.map(file =>
        firestoreDB
          .doc(`${this.siteDocument}/${file.collectionName}/${file.documentID}`)
          .get()
          .then(doc => {
            if (!doc.exists)
              throw new Error(`Entry is missing for [${file.collectionName}/${file.documentID}]`)
            const data = doc.data()

            return Promise.resolve({
              file: file.fileData,
              data: Base64.decode(data.raw || ''),
            })
          })
          .catch(error => {
            throw new Error(error)
          }),
      ),
    )
  }

  getEntry(collection, slug, path) {
    // we are not going to use path for document ID
    console.log(`getEntry`, collection, slug, path)
    const firestoreDB = this.db
    const collectionName = collection.get('name')
    let documentPath = `${collectionName}/${slug}`

    return Promise.resolve(
      firestoreDB
        .doc(`${this.siteDocument}/${documentPath}`)
        .get()
        .then(doc => {
          if (!doc.exists) throw new Error(`Entry is missing for [${documentPath}]`)
          const data = doc.data()
          // console.log('getEntry data', Base64.decode(data.raw))
          console.log('getEntry data', data)
          return {
            file: { path: data.path || path },
            data: data.raw ? Base64.decode(data.raw) : '',
          }
        })
        .catch(error => {
          throw new Error(error)
        }),
    )
  }

  persistEntry(entry, mediaFiles = [], options) {
    const firestoreDB = this.db
    const newEntry = options.newEntry || false
    const usingEditorialWorkflow = this.usingEditorialWorkflow && options.useWorkflow
    console.log(`persistEntry fileName=${entry.path}`, entry, options)

    const storedEntry = {
      slug: entry.slug,
      path: entry.path,
      raw: Base64.encode(entry.raw),
    }
    if (this.indexData[options.collectionName]) {
      switch (this.indexData[options.collectionName]) {
        case 'json':
          storedEntry.data = JSON.parse(entry.raw)
          break
        case 'md':
          storedEntry.data = getMatter(entry.raw).data
          break
        default:
          // md
          storedEntry.data = getMatter(entry.raw).data
      }
    }

    return firestoreDB
      .doc(`${this.siteDocument}/${options.collectionName}/${entry.slug}`)
      .get()
      .then(publishedDoc => {
        return firestoreDB
          .doc(`${this.siteDocument}/__unpublished/${options.collectionName}_${entry.slug}`)
          .get()
          .then(unpublishedDoc => {
            const bothExist = publishedDoc.exists && unpublishedDoc.exists
            const data =
              usingEditorialWorkflow && bothExist ? unpublishedDoc.data() : publishedDoc.data()

            if (usingEditorialWorkflow) {
              const status = (unpublishedDoc.exists && data.metaData.status) || 'draft'
              storedEntry.metaData = {
                collection: options.collectionName,
                status,
                title: (options.parsedData && options.parsedData.title) || 'No Title',
                description:
                  (options.parsedData && options.parsedData.description) || 'No Description!',
              }
              storedEntry.isModification = bothExist
            }
            const dbDocRef = usingEditorialWorkflow ? unpublishedDoc.ref : publishedDoc.ref
            const editEntry = { ...storedEntry, raw: Base64.decode(storedEntry.raw) }
            console.log(`persistingEntry`, storedEntry, editEntry)
            if (dbDocRef.exists) {
              return dbDocRef
                .update(storedEntry)
                .then(returnQuery => {
                  return Promise.resolve(editEntry)
                })
                .catch(error => {
                  return Promise.reject(error)
                })
            } else {
              return dbDocRef
                .set(storedEntry)
                .then(returnQuery => {
                  return Promise.resolve(editEntry)
                })
                .catch(error => {
                  return Promise.reject(error)
                })
            }
          })
          .catch(error => {
            return Promise.reject(error)
          })
      })
      .catch(error => {
        return Promise.reject(error)
      })
    return Promise.resolve(false)
  }

  getMedia() {
    const firestoreDB = this.db
    return firestoreDB
      .collection(`${this.siteDocument}/${this.mediaFolder}`)
      .get()
      .then(returnQuery => {
        const entries = []
        returnQuery.forEach(doc => {
          const entry = doc.data()
          entry.id = doc.id
          entry.urlIsPublicPath = true
          entries.push(entry)
        })
        console.log(`media files=>`, entries)
        return entries
      })
      .catch(error => {
        throw new Error(error.message)
      })
  }

  persistMedia({ fileObj }) {
    console.log('persistMedia', fileObj)
    const { name, size } = fileObj
    const imagePath = `${this.mediaFolder}/${name}`
    const imageRef = this.mediaRef.child(imagePath)
    const firestoreDB = this.db

    return imageRef
      .put(fileObj)
      .then(snapshot => {
        console.log('imageUploaded', snapshot)
        const downloadURL = snapshot.downloadURL
        const entry = { name, size, path: downloadURL, url: downloadURL, sourcePath: imagePath }
        // Store metadata in images collection
        return firestoreDB
          .collection(`${this.siteDocument}/${this.mediaFolder}`)
          .add(entry)
          .then(docRef => {
            entry.id = docRef.id
            entry.urlIsPublicPath = true
            return Promise.resolve(entry)
          })
          .catch(error => {
            throw new Error(error)
          })
      })
      .catch(error => {
        throw new Error(error)
      })
  }

  deleteFile(path, commitMessage, { collection, slug }) {
    const firestoreDB = this.db
    const collectionName = collection.get('name')

    console.log(`deleteFile ${collectionName}/${slug}`, collection, collection.get('slug'))
    return firestoreDB
      .collection(`${this.siteDocument}/${collectionName}`)
      .doc(`${slug}`)
      .delete()
      .then(returnQuery => {
        console.log('deleteFile returnQuery', returnQuery)
        return Promise.resolve()
      })
      .catch(error => {
        throw new Error(error)
      })
  }

  unpublishedEntries() {
    const firestoreDB = this.db
    return firestoreDB
      .collection(`${this.siteDocument}/__unpublished`)
      .get()
      .then(querySnapshot => {
        const items = []
        querySnapshot.forEach(doc => {
          const data = doc.data()
          const item = {
            slug: data.slug,
            file: { path: data.path },
            data: Base64.decode(data.raw),
            metaData: data.metaData,
            isModification: data.isModification,
          }
          items.push(item)
        })
        console.log(`unpublishedEntries=>`, items)
        return Promise.resolve(items)
      })
      .catch(error => {
        throw new Error(error.message)
      })
  }

  unpublishedEntry(collection, slug) {
    const firestoreDB = this.db
    const collectionName = collection.get('name')
    const documentID = `${collectionName}_${slug}`

    return firestoreDB
      .doc(`${this.siteDocument}/${collectionName}/${slug}`)
      .get()
      .then(publishedDoc => {
        return firestoreDB
          .doc(`${this.siteDocument}/__unpublished/${documentID}`)
          .get()
          .then(unpublishedDoc => {
            if (unpublishedDoc.exists) {
              const data = unpublishedDoc.data()
              const isModification = unpublishedDoc.exists && publishedDoc.exists

              const storedEntry = {
                slug,
                isModification,
                file: { path: data.path },
                data: Base64.decode(data.raw),
                metaData: data.metaData || {
                  collection: collectionName,
                  status: this.initialWorkflowStatus,
                  title: 'No Title',
                  description: 'No Description!',
                },
              }

              console.log(`unpublishedEntry __unpublished/${documentID}`, data, storedEntry)
              return Promise.resolve(storedEntry)
            } else {
              /**
               * Currently editorial_workflow requires that an error be returned when a published
               *  document in the collection is found. The error is identified and and redirected
               *  to get the document from a published entry.
               * Proposal: send the published entry back, but include a flag
               */
              return Promise.reject(
                new EditorialWorkflowError('content is not under editorial workflow', true),
              )
            }
          })
      })
  }

  updateUnpublishedEntryStatus(collectionName, slug, newStatus) {
    const firestoreDB = this.db
    console.log(`updateUnpublishedEntryStatus`, collectionName, slug)
    const documentID = `${collectionName}_${slug}`
    const storedEntry = { metaData: { status: newStatus } }
    return firestoreDB
      .doc(`${this.siteDocument}/__unpublished/${documentID}`)
      .get()
      .then(unpublishedDoc => {
        if (unpublishedDoc.exists) {
          const metaData = unpublishedDoc.data().metaData
          metaData.status = newStatus
          unpublishedDoc.ref.update({ metaData })
          return Promise.resolve()
        }
      })
  }

  deleteUnpublishedEntry(collectionName, slug) {
    const firestoreDB = this.db
    const documentID = `${collectionName}_${slug}`

    console.log(`deleteFile __unpublished/${documentID}`, collectionName)
    return firestoreDB
      .collection(`${this.siteDocument}/${'__unpublished'}`)
      .doc(`${documentID}`)
      .delete()
      .then(returnQuery => {
        console.log('deleteUnpublishedEntry returnQuery', returnQuery)
        return Promise.resolve()
      })
      .catch(error => {
        throw new Error(error)
      })
  }

  publishUnpublishedEntry(collectionName, slug) {
    const firestoreDB = this.db
    const documentID = `${collectionName}_${slug}`

    return firestoreDB
      .doc(`${this.siteDocument}/__unpublished/${documentID}`)
      .get()
      .then(unpublishedDoc => {
        if (unpublishedDoc.exists) {
          const unpublishedData = unpublishedDoc.data()
          if (
            !(unpublishedData.metaData && unpublishedData.metaData.status === 'pending_publish')
          ) {
            throw `Document "${unpublishedData.metaData.title}" status is [${
              unpublishedData.metaData.status
            }], change to [Ready]`
          }
          return firestoreDB
            .doc(`${this.siteDocument}/${collectionName}/${slug}`)
            .get()
            .then(publishedDoc => {
              const options = {
                collectionName,
                newEntry: !publishedDoc.exists,
                useWorkflow: false, // because we want to persist to production
              }
              const pubEntry = {
                slug: unpublishedData.slug,
                path: unpublishedData.path,
                raw: Base64.decode(unpublishedData.raw),
              }
              return this.persistEntry(pubEntry, [], options).then(entry => {
                return unpublishedDoc.ref.delete().then(returnQuery => {
                  console.log(`${collectionName}/${slug} published`)
                  return Promise.resolve()
                })
              })
            })
            .catch(error => Promise.reject(error))
        } else {
          return Promise.reject(
            new Error(`${this.siteDocument}/__unpublished/${documentID} missing`),
          )
        }
      })
      .catch(error => Promise.reject(error))
  }
}
