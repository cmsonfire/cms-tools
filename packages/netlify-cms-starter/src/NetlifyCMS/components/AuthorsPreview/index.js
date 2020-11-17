import React from 'react'
import Markdown from 'react-markdown'

const AuthorsPreview = ({ entry }) => {
  const [data, setData] = React.useState({ authors: [] })

  React.useEffect(() => {
    const data = entry.getIn(['data']).toJS()
    setData(data)
  }, [entry])

  return data.authors && data.authors.length > 0 ? (
    data.authors.map((author, index) => {
      return (
        <div key={index}>
          <hr />
          <div><strong>{author.name}</strong></div>
          <section><Markdown>{author.description}</Markdown></section>
        </div>
      )
    })
  ) : (
    <div />
  )
}

export default AuthorsPreview
