import React from 'react'
import CMS from 'netlify-cms-app'
import NetlifyCmsBackendFirestore from 'netlify-cms-backend-firestore'

import config from './config'
import AuthorsPreview from './components/AuthorsPreview'
import DebugPreview from './components/DebugPreview'
import EditorYoutube from './components/EditorYoutube'

function NetlifyCMS() {
  React.useEffect(() => {
    CMS.registerBackend('firestore', NetlifyCmsBackendFirestore)
    CMS.registerPreviewTemplate('authors', AuthorsPreview)
    CMS.registerPreviewTemplate('site_settings', DebugPreview)
    CMS.registerEditorComponent(EditorYoutube)

    CMS.init({ config })
  })

  return <div id="nc-root" />
}

export default NetlifyCMS
