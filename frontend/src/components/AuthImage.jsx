import { useState, useEffect } from 'react'
import { Spin } from 'antd'
import { fetchThumbnail } from '../api/files'

export default function AuthImage({ projectId, fileId, alt, style, fallback = null }) {
  const [src,     setSrc]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed,  setFailed]  = useState(false)

  useEffect(() => {
    let objectUrl = null

    fetchThumbnail(projectId, fileId)
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data)
        setSrc(objectUrl)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))

    // Clean up blob URL when component unmounts
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