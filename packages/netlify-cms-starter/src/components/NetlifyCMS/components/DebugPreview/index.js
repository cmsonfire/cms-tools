import React from 'react'

const DebugPreview = ({ entry }) => {
  const [data, setData] = React.useState({})

  React.useEffect(() => {
    setData(entry.toJS())
  }, [entry])

  return <div><pre>{JSON.stringify(data, null, 2)}</pre></div>
}

export default DebugPreview
