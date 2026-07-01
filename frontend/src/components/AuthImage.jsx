import { useState, useEffect } from 'react'
import { Spin } from 'antd'
import { fetchThumbnail } from '../api/files'

export default function AuthImage({ projectId, fileId, alt, style, fallback = null, fetchFn }) {
  const [src,     setSrc]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed,  setFailed]  = useState(false)

  useEffect(() => {
    let objectUrl = null
    // Use custom fetch if provided, otherwise default to project thumbnail
    const doFetch = fetchFn
      ? () => fetchFn(fileId)
      : () => fetchThumbnail(projectId, fileId)

    doFetch()
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data)
        setSrc(objectUrl)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [projectId, fileId])

  if (loading) return (
    <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="small" />
    </div>
  )
  if (failed) return fallback
  return <img src={src} alt={alt} style={style} />
}
