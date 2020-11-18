import React from 'react';
import { getMatter, EditorialWorkflowError } from './utils';
import AuthenticationPage from './AuthenticationPage';
import axios from 'axios';
import { firebase } from 'firebase-react-provider';

/**
 * Firebase/Firestore (deprecated for FirebaseProvider)
 */
// import firebase from 'firebase/app'
// import 'firebase/auth' // make sure you add this for auth
// import 'firebase/firestore' // make sure you add this for firestore
// import 'firebase/storage' // make sure you add this for storage

/**
 * Hack at this point to keep firebase state for AuthenticationPage
 * TODO: Wrap the AuthenticationPage with a react hook
 *  that uses context and returns the firebase context rather than pulling from window
 */
// if (typeof window !== 'undefined') {
//   window['__firebasecms__'] = { firebase }
// }

const nameFromEmail = (email) => {
  return email
    .split('@')
    .shift()
    .replace(/[.-_]/g, ' ')
    .split(' ')
    .filter((f) => f)
    .map((s) => s.substr(0, 1).toUpperCase() + (s.substr(1) || ''))
    .join(' ');
};

/* 
  Create a Factory function here instead of a Class object. The Factory function uses
  a function expression and not an arrow function for invocation.
  This allows us to freeze our invocation of the object and doesn't let others change it.
  Stay away from Classes!!! They are buggy and a mess to use!
  See: https://www.freecodecamp.org/news/class-vs-factory-function-exploring-the-way-forward-73258b6a8d15/
    
*/
const NetlifyCmsBackendFirestore = function (config, options = {}) {
  // console.log(`Setting up NetlifyCmsBackendFirestore`, config, options)
  const constructor = (config, options) => {
    /* 
      We will keep track of the paths for each entry in a collection,
      due to the regression and poor design in netlify-cms under new maintainers.
      This unique information should be passed at method calls and NOT dependent on path of file.
    */
    const fileinfo = {};
    // Initialize Firebase instance config.backend.firebase
    const firebaseSettings = config.backend.firebase;
    const firebaseConfig = firebaseSettings ? firebaseSettings.config || {} : {};
    const appName =
      config.backend.firebase && config.backend.firebase.appName
        ? config.backend.firebase.appName
        : '[DEFAULT]';
    const app = firebase.apps.find((app) => app.container && app.container.name === appName);
    const db = () => {
      if (app) {
        return firebase.firestore(app); // Existing Firestore
      } else {
        throw `Context for '${appName}' is missing.\nWrap your app with <FirestoreProvider config={firebaseConfig} name="${appName}">`;
      }
    };
    if (!db())
      throw '[netlify-cms-backend-firestore] Firebase database initialize did not happen using the config';
    // Setup observer for signed in user
    // (deprecated for now; no state change once already logged in) needs research
    let loggedInUser = null;
    const unsubscribeAuthListener = firebase.auth(app).onAuthStateChanged(function (user) {
      local.log(`user status changed`, user);
      loggedInUser = user;
    });
    const logoutUser = () => {
      unsubscribeAuthListener();
      firebase && firebase.auth && firebase.auth(app).signOut();
    };
    const FilePathFactory = (filePath) => {
      if (!filePath && typeof filePath !== 'string')
        throw `Invalid FilePathFactory call [${filePath}]`;
      return {
        updateInfo: (info) => {
          fileinfo[filePath] = info;
        },
        deleteInfo: () => {
          fileinfo[filePath] = null;
        },
        getInfo: () => {
          return fileinfo[filePath];
        },
        getAll: () => fileinfo,
      };
    };
    for (let i = 0; i < config.collections.length; i++) {
      const collection = config.collections[i];
      if (collection.folder) continue;
      for (let f = 0; f < collection.files.length; f++) {
        const file = collection.files[f];
        FilePathFactory(file.file).updateInfo({ collection: collection.name, id: file.name });
      }
    }
    const getFilePath = (collectionName, slug) => {
      let filePath;
      for (let i = 0; i < config.collections.length; i++) {
        const collection = config.collections[i];
        if (collection.name === collectionName) {
          if (collection.folder) {
            filePath = `${collection.folder}/${slug}.${collection.extension || 'md'}`;
            break;
          } else {
            for (let f = 0; f < collection.files.length; f++) {
              const file = collection.files[f];
              if (file.name === slug) {
                filePath = file.file;
                break;
              }
            }
            if (filePath) {
              break;
            }
          }
        }
      }
      if (!filePath) throw `collection [${collectionName}, ${slug}] missing from config`;
      return filePath;
    };
    const getCollectionName = (folder) => {
      let collectionName;
      for (let i = 0; i < config.collections.length; i++) {
        const collection = config.collections[i];
        if (collection.folder === folder) {
          collectionName = collection.name;
          break;
        }
      }
      if (!collectionName) throw `collection for [${folder}] missing from config`;
      return collectionName;
    };

    return {
      db,

      log: (...messages) => {
        if (!config.debug) return;
        console.log(messages);
      },
      /*
      We use the config to get our file path collection and name
      since it is not being passed from the api request in netlify-cms
    */
      getFileCollectionByPath: (path) => {
        let collectionByPath;
        for (let i = 0; i < config.collections.length; i++) {
          const collection = config.collections[i];
          if (!collection.files) continue;
          for (let f = 0; f < collection.files.length; f++) {
            const file = collection.files[f];
            if (file.file === path) {
              collectionByPath = { collection: collection.name, name: file.name };
              break;
            }
          }
          if (collectionByPath) break;
        }
        return collectionByPath;
      },
      getFilePath,
      getCollectionName,
      getDocumentId: (collectionName, slug) => {
        const path = getFilePath(collectionName, slug);
        // console.log(`getDocumentId [${path}]`, collectionName, slug)
        return path.replace(/\//g, '___');
      },
      FilePathFactory,
      getUser: () => loggedInUser,
      logoutUser,
      // Setup the site path for access to this sites data
      siteDocument: firebaseSettings.siteid ? `sites/${firebaseSettings.siteid}/` : '',
      // Setup Firebase Storage reference for media folder
      mediaFolder: config.media_folder || 'media_folder',
      useOpenAuthoring: config.useOpenAuthoring,
      mediaRef: firebase.storage(app).ref(),
      initialWorkflowStatus: options.initialWorkflowStatus,
      usingEditorialWorkflow: config.publish_mode === 'editorial_workflow',
      indexData: firebaseSettings.index_data || {},
      // Setup build_hooks for preview and production deploy
      build_hooks: config.backend.build_hook
        ? {
            preview: `${config.backend.build_hook}?trigger_branch=preview&trigger_title=Preview+build+cms`,
            master: `${config.backend.build_hook}?trigger_branch=master&trigger_title=Production+build+cms`,
          }
        : {},
    };
  };
  // Change from "this" context to "local" in our Factory function 😁
  // for better readability and context handling.
  const local = constructor(config, options);

  function isGitBackend() {
    return false;
  }

  function status() {
    local.log(`status:`, local.getUser());
    // Firebase auth handles the login, so we don't have to change status (yet)
    return Promise.resolve({ auth: { status: true }, api: { status: true, statusPage: '' } });
  }

  function authComponent() {
    return AuthenticationPage;
  }

  function restoreUser(user) {
    local.log(`restoreUser`, user);
    return authenticate();
  }

  function authenticate(credentials) {
    const user = local.getUser();
    if (!user) return Promise.resolve();
    local.log(`authenticate`, user, credentials);
    const loggedInUser = {
      backendName: 'firestore',
      name: user.displayName,
      useOpenAuthoring: local.useOpenAuthoring,
    };
    return Promise.resolve(loggedInUser);
  }

  function logout() {
    local.logoutUser();
    return;
  }

  function getToken() {
    local.log(`getToken`);
    return Promise.resolve('');
  }

  function entriesByFolder(folder, extension, depth) {
    const collection = local.getCollectionName(folder);
    local.log(`entriesByFolder for ${collection}`, extension, depth);
    const firestoreDB = local.db();
    return firestoreDB
      .collection(`${local.siteDocument}${collection}`)
      .get()
      .then((returnQuery) => {
        const entries = [];
        returnQuery.forEach((doc) => {
          const data = doc.data();
          local.FilePathFactory(data.path).updateInfo({
            collection,
            id: doc.id,
          });
          const item = {
            file: { path: data.path },
            data: Buffer.from(data.content.toUint8Array()).toString('utf-8'),
          };
          entries.push(item);
        });
        return entries;
      })
      .catch((error) => {
        throw new Error(error.message);
      });
  }

  function entriesByFiles(fileList) {
    local.log(`entriesByFiles`, fileList);
    const firestoreDB = local.db();

    const files = fileList.map((collectionFile) => {
      const config = local.getFileCollectionByPath(collectionFile.path);
      const documentId = local.getDocumentId(config.collection, config.name);
      return {
        collectionName: config.collection, // collection name in db
        documentId, // document id in db
        fileData: {
          path: collectionFile.path, // file path
          label: collectionFile.label, // file label
        },
      };
    });

    return Promise.all(
      files.map((file) => {
        local.log('getting file', file);
        return firestoreDB
          .doc(`${local.siteDocument}${file.collectionName}/${file.documentId}`)
          .get()
          .then((doc) => {
            if (!doc.exists)
              throw new Error(`Entry is missing for [${file.collectionName}/${file.documentId}]`);
            const data = doc.data();
            local.FilePathFactory(data.path).updateInfo({
              collection: file.collectionName,
              id: doc.id,
            });
            return Promise.resolve({
              file: file.fileData,
              data: Buffer.from(data.content.toUint8Array()).toString('utf-8'),
            });
          })
          .catch((error) => {
            throw new Error(error);
          });
      }),
    );
  }

  function getEntry(path) {
    local.log(`getEntry path(${path})`, local.FilePathFactory(path).getAll());

    // we are not going to use path for document ID
    const firestoreDB = local.db();
    const info = local.FilePathFactory(path).getInfo();
    const collectionName = info.collection;
    const documentId = info.id;
    let documentPath = `${collectionName}/${documentId}`;

    return Promise.resolve(
      firestoreDB
        .doc(`${local.siteDocument}${documentPath}`)
        .get()
        .then((doc) => {
          // If doc doesn't exist return a new file object
          if (!doc.exists) return { file: { path, id: null }, data: '' };
          const data = doc.data();
          return {
            file: { path: data.path || path },
            data: Buffer.from(data.content.toUint8Array()).toString('utf-8'),
            // data.content is of type firestore.Blob data.content.q.M
          };
        })
        .catch((error) => {
          throw new Error(error);
        }),
    );
  }

  function updateEntry(entry, options) {
    const firestoreDB = local.db();
    const newEntry = options.newEntry || false;
    // const usingEditorialWorkflow = local.usingEditorialWorkflow && options.useWorkflow
    local.log(`updateEntry fileName=${entry.path}`, entry, options);

    const enc = new TextEncoder();
    const storedEntry = {
      slug: entry.slug,
      path: entry.path,
      content: new firebase.firestore.Blob.fromUint8Array(enc.encode(entry.raw)),
    };
    // Flagging the data for index_data in the config allows for storing data as normalized (beta)
    if (local.indexData[options.collectionName]) {
      switch (local.indexData[options.collectionName]) {
        case 'json':
          storedEntry.data = JSON.parse(entry.raw);
          break;
        case 'md':
          storedEntry.data = getMatter(entry.raw).data;
          break;
        default:
          // md
          storedEntry.data = getMatter(entry.raw).data;
      }
    }

    const documentId = local.getDocumentId(options.collectionName, entry.slug);
    return firestoreDB
      .doc(`${local.siteDocument}${options.collectionName}/${documentId}`)
      .get()
      .then((publishedDoc) => {
        if (publishedDoc.exists) {
          return publishedDoc.ref
            .update(storedEntry)
            .then((returnQuery) => {
              local.FilePathFactory(storedEntry.path).updateInfo({
                collection: options.collectionName,
                id: documentId,
              });
              if (local.build_hooks.master) axios.post(local.build_hooks.master);
              return Promise.resolve();
            })
            .catch((error) => {
              return Promise.reject(error);
            });
        } else {
          return publishedDoc.ref
            .set(storedEntry)
            .then((returnQuery) => {
              local.FilePathFactory(storedEntry.path).updateInfo({
                collection: options.collectionName,
                id: documentId,
              });
              if (local.build_hooks.master) axios.post(local.build_hooks.master);
              return Promise.resolve();
            })
            .catch((error) => {
              return Promise.reject(error);
            });
        }
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  // TODO: handle assets
  async function persistEntry({ dataFiles, assets }, options) {
    local.log(`persistEntry`, dataFiles, assets, options);

    await Promise.all(assets.map((item) => persistMedia(item)));

    if (options.useWorkflow) {
      const slug = dataFiles[0].slug;

      return addOrUpdateUnpublishedEntry({
        dataFiles,
        slug,
        collection: options.collectionName,
        optionsStatus: options.status,
      });
    }
    return Promise.all(dataFiles.map((entry) => updateEntry(entry, options)));
  }

  async function getMedia(mediaFolder = local.mediaFolder) {
    console.log(`getMedia`, mediaFolder);
    const listRef = local.mediaRef.child(mediaFolder);

    const res = await listRef.listAll();
    return await Promise.all(
      res.items.map(async (itemRef) => {
        //   Lists of folderRef
        //   res.prefixes.forEach(function (folderRef) {
        //     // All the prefixes under listRef.
        //     // You may call listAll() recursively on them.
        //   })
        // All the items under listRef.
        const url = await itemRef.getDownloadURL();

        return itemRef.getMetadata().then((item) => {
          // console.log('image item:', item)
          return {
            id: item.md5Hash,
            name: item.name,
            size: item.size,
            path: item.fullPath,
            displayURL: url,
          };
        });
      }),
    );
  }

  async function getMediaFile(imagePath) {
    console.log('getMediaFile', imagePath);
    const itemRef = await local.mediaRef.child(imagePath);
    const url = await itemRef.getDownloadURL();

    const item = await itemRef
      .getMetadata()
      .then((item) => {
        return {
          id: item.md5Hash,
          name: item.name,
          size: item.size,
          path: item.fullPath,
          displayURL: url,
        };
      })
      .catch((error) => {
        console.error(error.message);
        return { displayURL: url };
      });

    return item;
  }

  const deleteMediaFile = (imagePath) => {
    console.log('deleteMediaFile', imagePath);
    var mediaFileRef = local.mediaRef.child(imagePath);

    // Delete the file
    return mediaFileRef
      .delete()
      .then(function () {
        return Promise.resolve();
      })
      .catch(function (error) {
        return Promise.reject(error.message);
      });
  };

  function persistMedia({ fileObj }) {
    console.log('persistMedia', fileObj);
    const { name, size } = fileObj;
    const imagePath = `${local.mediaFolder}/${name}`;
    const imageRef = local.mediaRef.child(imagePath);
    const firestoreDB = local.db();

    return imageRef
      .put(fileObj)
      .then((snapshot) => {
        return snapshot.ref.getDownloadURL();
      })
      .then((downloadURL) => {
        console.log('imageUploaded', downloadURL);
        return Promise.resolve({
          id: imagePath,
          name,
          size,
          path: imagePath,
          displayURL: downloadURL,
        });
      })
      .catch((error) => {
        Promise.reject(error);
      });
  }

  function deleteFiles(paths, commitMessage) {
    console.log(`deleteFiles`, paths, commitMessage);
    return Promise.all(
      paths.map((path) => {
        return deleteFile(path, commitMessage);
      }),
    );
  }

  function deleteFile(path, commitMessage) {
    if (local.useOpenAuthoring) {
      return Promise.reject('Cannot delete published entries as an Open Authoring user!');
    }
    const firestoreDB = local.db();
    const info = local.FilePathFactory(path).getInfo();

    if (!info) return deleteMediaFile(path);

    local.log(`deleteFile ${info.collection}/${info.id}`, path, commitMessage);
    return firestoreDB
      .collection(`${local.siteDocument}${info.collection}`)
      .doc(info.id)
      .get()
      .then((doc) => {
        doc.ref.delete().then((returnQuery) => {
          local.FilePathFactory(path).deleteInfo();
          local.log('deleteFile returnQuery', returnQuery);
          return Promise.resolve();
        });
      })
      .catch((error) => {
        Promise.reject(error);
      });
  }

  function unpublishedEntries() {
    const firestoreDB = local.db();
    return firestoreDB
      .collection(`${local.siteDocument}__unpublished`)
      .get()
      .then((querySnapshot) => {
        const items = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          items.push(doc.id);
        });
        local.log(`unpublishedEntries=>`, items);
        return Promise.resolve(items);
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  function unpublishedEntry({ id, collection, slug }, options) {
    local.log(`unpublishedEntry=>`, id, collection, slug, options);
    if (!id && (!collection || !slug)) {
      throw new Error('Missing unpublished entry id or collection and slug');
    }

    let publishedId;
    let unpublishedId;
    if (id && (!collection || !slug)) {
      const parts = id.split('___');
      collection = parts[0];
      publishedId = parts.slice(1).join('___');
      unpublishedId = id;
    } else {
      publishedId = local.getDocumentId(collection, slug);
      unpublishedId = `${collection}___${publishedId}`;
    }

    const firestoreDB = local.db();
    return firestoreDB
      .doc(`${local.siteDocument}${collection}/${publishedId}`)
      .get()
      .then((publishedDoc) => {
        return firestoreDB
          .doc(`${local.siteDocument}__unpublished/${unpublishedId}`)
          .get()
          .then((unpublishedDoc) => {
            if (unpublishedDoc.exists) {
              const data = unpublishedDoc.data();
              const decodedDiffs = data.diffs.map((file) => {
                file.raw = Buffer.from(file.content.toUint8Array()).toString('utf-8');
                return file;
              });
              const storedEntry = {
                ...data,
                diffs: decodedDiffs,
              };

              local.log(`unpublishedEntry __unpublished/${unpublishedId}`, data, storedEntry);
              return Promise.resolve(storedEntry);
            } else {
              // Check if there is a published doc for the collection and slug

              if (!publishedDoc.exists && !unpublishedDoc.exists && !id) {
                // Nope! Ok to resolve to no entry here
                const path = local.getFilePath(collection, slug);
                local.FilePathFactory(path).updateInfo({ collection, id: publishedId });
                return Promise.resolve(/* (forces getEntry to return empty file) */);
              }

              return Promise.reject(
                new EditorialWorkflowError(
                  `content [${unpublishedId}] is not under editorial workflow`,
                  true,
                ),
              );
            }
          });
      });
  }

  function addOrUpdateUnpublishedEntry({ dataFiles, slug, collection, optionsStatus }) {
    local.log(`addOrUpdateUnpublishedEntry`, dataFiles, slug, collection, optionsStatus);
    const firestoreDB = local.db();
    const publishedId = local.getDocumentId(collection, slug);
    const unpublishedId = `${collection}___${publishedId}`;

    return firestoreDB
      .doc(`${local.siteDocument}${collection}/${publishedId}`)
      .get()
      .then((publishedDoc) => {
        return firestoreDB
          .doc(`${local.siteDocument}__unpublished/${unpublishedId}`)
          .get()
          .then((unpublishedDoc) => {
            let original;
            if (unpublishedDoc.exists) {
              original = unpublishedDoc.data();
            } else {
              original = { diffs: [] };
            }
            const status = original.status || optionsStatus || local.initialWorkflowStatus;

            const diffs = [];
            const enc = new TextEncoder();
            dataFiles.forEach((dataFile) => {
              const { path, newPath, raw } = dataFile;
              const currentDataFile = original.diffs.find((d) => d.path === path);
              const originalPath = currentDataFile ? currentDataFile.originalPath : path;
              const info = local.FilePathFactory(originalPath).getInfo() || { id: publishedId };
              diffs.push({
                originalPath,
                // id: newPath || path,
                id: info.id,
                path: newPath || path,
                newFile: !publishedDoc.exists,
                status: 'added',
                content: new firebase.firestore.Blob.fromUint8Array(enc.encode(raw)),
              });
            });

            const storedEntry = {
              slug,
              collection,
              status,
              diffs,
              updatedAt: new Date().toISOString(),
            };
            local.log(`addOrUpdateUnpublishedEntry`, storedEntry);
            const docRef = unpublishedDoc.ref;
            if (docRef.exists) {
              return docRef
                .update(storedEntry)
                .then((returnQuery) => {
                  if (local.build_hooks.preview) axios.post(local.build_hooks.preview);
                  return Promise.resolve();
                })
                .catch((error) => {
                  return Promise.reject(error);
                });
            } else {
              return docRef
                .set(storedEntry)
                .then((returnQuery) => {
                  if (local.build_hooks.preview) axios.post(local.build_hooks.preview);
                  return Promise.resolve();
                })
                .catch((error) => {
                  return Promise.reject(error);
                });
            }
          })
          .catch((error) => {
            Promise.reject(error);
          });
      })
      .catch((error) => {
        Promise.reject(new Error(error));
      });
  }

  async function unpublishedEntryDataFile(collection, slug, path, id) {
    local.log('unpublishedEntryDataFile', collection, slug, path, id);

    return unpublishedEntry({ collection, slug })
      .then((entry) => {
        const file = entry.diffs.find((d) => d.path === path);
        if (!file) {
          return Promise.reject(
            new EditorialWorkflowError(`content Missing from entry for path [${path}]`, true),
          );
        }
        return Promise.resolve(file.raw);
      })
      .catch((error) => {
        return Promise.reject(error);
      });
  }

  async function unpublishedEntryMediaFile(collection, slug, path, id) {
    local.log('unpublishedEntryMediaFile', collection, slug, path, id);
    return Promise.reject('Must implement unpublishedEntryMediaFile in code');
  }

  function updateUnpublishedEntryStatus(collectionName, slug, newStatus) {
    const firestoreDB = local.db();
    local.log(`updateUnpublishedEntryStatus`, collectionName, slug, newStatus);
    const unpublishedId = `${collectionName}___${local.getDocumentId(collectionName, slug)}`;
    return firestoreDB
      .doc(`${local.siteDocument}__unpublished/${unpublishedId}`)
      .get()
      .then((unpublishedDoc) => {
        if (unpublishedDoc.exists) {
          unpublishedDoc.ref.update({
            status: newStatus || 'draft',
            updatedAt: new Date().toISOString(),
          });
          if (local.build_hooks.preview) axios.post(local.build_hooks.preview);
          return Promise.resolve();
        } else {
          Promise.reject(`Unpublished document missing for ${collectionName}/${slug}`);
        }
      });
  }

  function deleteUnpublishedEntry(collectionName, slug) {
    local.log(`deleteUnpublishedEntry`, collectionName, slug);
    const firestoreDB = local.db();
    const unpublishedId = `${collectionName}___${local.getDocumentId(collectionName, slug)}`;
    local.log(`deleteFile __unpublished/${unpublishedId}`, collectionName);

    return firestoreDB
      .collection(`${local.siteDocument}${'__unpublished'}`)
      .doc(`${unpublishedId}`)
      .get()
      .then((unpublishedDoc) => {
        const data = unpublishedDoc.data();
        unpublishedDoc.ref.delete().then((returnQuery) => {
          local.log('deleteUnpublishedEntry done:', returnQuery, data.path);
          return Promise.resolve();
        });
      })
      .catch((error) => {
        throw new Error(error);
      });
  }

  function publishUnpublishedEntry(collectionName, slug) {
    local.log(`publishUnpublishedEntry`, collectionName, slug);
    const firestoreDB = local.db();
    const publishedId = local.getDocumentId(collectionName, slug);
    const unpublishedId = `${collectionName}___${publishedId}`;

    return firestoreDB
      .doc(`${local.siteDocument}__unpublished/${unpublishedId}`)
      .get()
      .then((unpublishedDoc) => {
        if (unpublishedDoc.exists) {
          const unpublishedData = unpublishedDoc.data();
          if (!(unpublishedData.status === 'pending_publish')) {
            throw `Document "${unpublishedData.metaData.title}" status is [${unpublishedData.metaData.status}], change to [Ready]`;
          }
          return Promise.all(
            unpublishedData.diffs.map((d) => {
              local.log(`publishUnpublishedEntry paths:`, d.originalPath, d.newFile);
              if (d.originalPath && !d.newFile) {
                if (d.originalPath !== d.newPath) {
                  // In our cms, paths are stored by slug not path, so we can
                }
              }
              // otherwise we just write out the new file

              return firestoreDB
                .doc(`${local.siteDocument}${collectionName}/${publishedId}`)
                .get()
                .then((publishedDoc) => {
                  const options = {
                    collectionName,
                    commitMessage: `Update ${collectionName} '${slug}'`,
                    newEntry: !publishedDoc.exists,
                    useWorkflow: false, // because we want to persist to production
                    unpublished: true, // ??? TODO: research (new)
                  };
                  const dataFiles = [
                    {
                      slug: unpublishedData.slug,
                      path: d.path,
                      raw: Buffer.from(d.content.toUint8Array()).toString('utf-8'),
                    },
                  ];
                  local.log('!!!!', { dataFiles, assets: [] }, options);
                  return persistEntry({ dataFiles, assets: [] }, options).then((entry) => {
                    local.log(`${collectionName}/${slug} published`);
                    return deleteUnpublishedEntry(collectionName, unpublishedData.slug);
                  });
                })
                .catch((error) => Promise.reject(error));
            }),
          );
        } else {
          return Promise.reject(
            new Error(`${local.siteDocument}__unpublished/${unpublishedId} missing`),
          );
        }
      })
      .catch((error) => Promise.reject(error));
  }

  return Object.freeze({
    isGitBackend,
    status,
    authComponent,
    restoreUser,
    authenticate,
    logout,
    getToken,
    entriesByFolder,
    entriesByFiles,
    getEntry,
    persistEntry,
    getMedia,
    getMediaFile,
    // getMediaDisplayURL, // Only needed if returning an object
    persistMedia,
    deleteFiles,
    unpublishedEntries,
    unpublishedEntry,
    unpublishedEntryDataFile,
    unpublishedEntryMediaFile,
    updateUnpublishedEntryStatus,
    deleteUnpublishedEntry,
    publishUnpublishedEntry,
  });
};

/* 
  There should only be one config invocation on the class.
  Netlify CMS should not be reloading this class, so we will keep the state
  and return it when it's called again.
  This could change if we used a Firebase Provider that uses a state hook.
  We could also add a state hook for the user logged in that would track the
  logged in user state instead.
*/
let globalFactory;
class NetlifyCmsBackendFirestoreClass {
  constructor(config, options = {}) {
    if (!globalFactory) {
      globalFactory = new NetlifyCmsBackendFirestore(config, options);
    } else {
      console.warn(
        `NetlifyCmsBackendFirestoreClass trying to duplicate. [ignoring]`,
        config,
        options,
      );
    }
    this.isGitBackend = globalFactory.isGitBackend;
    this.status = globalFactory.status;
    this.authComponent = globalFactory.authComponent;
    this.restoreUser = globalFactory.restoreUser;
    this.authenticate = globalFactory.authenticate;
    this.logout = globalFactory.logout;
    this.getToken = globalFactory.getToken;
    this.entriesByFolder = globalFactory.entriesByFolder;
    this.entriesByFiles = globalFactory.entriesByFiles;
    this.getEntry = globalFactory.getEntry;
    this.persistEntry = globalFactory.persistEntry;
    this.getMedia = globalFactory.getMedia;
    this.getMediaFile = globalFactory.getMediaFile;
    this.persistMedia = globalFactory.persistMedia;
    this.deleteFiles = globalFactory.deleteFiles;
    this.unpublishedEntries = globalFactory.unpublishedEntries;
    this.unpublishedEntry = globalFactory.unpublishedEntry;
    this.unpublishedEntryDataFile = globalFactory.unpublishedEntryDataFile;
    this.unpublishedEntryMediaFile = globalFactory.unpublishedEntryMediaFile;
    this.updateUnpublishedEntryStatus = globalFactory.updateUnpublishedEntryStatus;
    this.deleteUnpublishedEntry = globalFactory.deleteUnpublishedEntry;
    this.publishUnpublishedEntry = globalFactory.publishUnpublishedEntry;
  }
}

export default NetlifyCmsBackendFirestoreClass;
