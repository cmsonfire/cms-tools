export default {
  backend: {
    name: 'firestore',
    firebase: {
      index_data: {
        posts: 'md'
      },
      config: {
        apiKey: 'AIzaSyC4pL01RQVRDHEWyqXTpnEvbd0hf5B__4A',
        authDomain: 'react-static-demo.firebaseapp.com',
        databaseURL: 'https://react-static-demo.firebaseio.com',
        projectId: 'react-static-demo',
        storageBucket: 'react-static-demo.appspot.com'
      },
      signInOptions: [
        {
          provider: 'EmailAuthProvider',
          options: {
            requireDisplayName: true
          }
        },
        {
          provider: 'GoogleAuthProvider',
          options: {
            customParameters: {
              prompt: 'select_account'
            }
          }
        }
      ]
    }
  },
  publish_mode: 'editorial_workflow',
  media_folder: 'images',
  public_folder: '//firebasestorage.googleapis.com/v0/b/react-static-demo.appspot.com/o/images',
  logo_src: '/assets/media/logo.svg',
  load_config_file: false, // tells netlify-cms-app to ignore the config.yml
  collections: [
    {
      name: 'posts',
      label: 'Post',
      folder: 'posts',
      slug: '{{year}}-{{month}}-{{day}}-{{slug}}',
      create: true,
      fields: [
        {
          label: 'Title',
          name: 'title',
          widget: 'string',
          tagname: 'h1'
        },
        {
          label: 'Publish Date',
          name: 'date',
          widget: 'datetime'
        },
        {
          label: 'Cover Image',
          name: 'image',
          widget: 'image',
          required: false
        },
        {
          label: 'Body',
          name: 'body',
          widget: 'markdown'
        }
      ]
    },
    {
      name: 'settings',
      label: 'Settings',
      'delete': false,
      editor: {
        preview: true
      },
      files: [
        {
          name: 'site_settings',
          label: 'Site Settings',
          file: '_data/settings.json',
          description: 'General Site Settings',
          fields: [
            {
              label: 'Global title',
              name: 'site_title',
              widget: 'string'
            },
            {
              label: 'Post Settings',
              name: 'posts',
              widget: 'object',
              fields: [
                {
                  label: 'Number of posts on frontpage',
                  name: 'front_limit',
                  widget: 'number'
                },
                {
                  label: 'Default Author',
                  name: 'author',
                  widget: 'string'
                },
                {
                  label: 'Default Thumbnail',
                  name: 'thumb',
                  widget: 'image',
                  'class': 'thumb'
                }
              ]
            }
          ]
        },
        {
          name: 'authors',
          label: 'Authors',
          file: '_data/authors.yml',
          description: 'Author descriptions',
          fields: [
            {
              name: 'authors',
              label: 'Authors',
              widget: 'list',
              fields: [
                {
                  label: 'Name',
                  name: 'name',
                  widget: 'string'
                },
                {
                  label: 'Description',
                  name: 'description',
                  widget: 'markdown'
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}