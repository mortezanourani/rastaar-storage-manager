import { useState, useEffect, useRef } from 'react'
import {
  Modal, Button, Space, Typography,
  Progress, Image, message,
} from 'antd'
import {
  LeftOutlined, RightOutlined,
  DownloadOutlined, CloseOutlined, SoundOutlined,
} from '@ant-design/icons'
import { fetchFileBlob, downloadFile } from '../api/files'
import FileIcon from './FileIcon'

const { Text } = Typography

// ─── Helpers ─────────────────────────────────────────────────

export function isViewable(mimeType = '') {
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  )
}

function fmtSize(bytes) {
  if (!bytes) return ''
  const mb = bytes / 1024 / 1024
  return mb < 1
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${mb.toFixed(1)} MB`
}

// ─── Sub-viewers ─────────────────────────────────────────────

function ImageViewer({ src }) {
  return (
    <div style={{
      textAlign: 'center',
      maxHeight: 'calc(85vh - 140px)',
      overflow: 'auto',
    }}>
      <Image
        src={src}
        style={{
          maxWidth: '100%',
          maxHeight: 'calc(85vh - 140px)',
          objectFit: 'contain',
          borderRadius: 4,
        }}
        preview={{
          mask: <span style={{ fontSize: 12 }}>Click to zoom</span>,
        }}
      />
    </div>
  )
}

function VideoViewer({ src, mimeType }) {
  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      {/* key={src} forces remount when file changes — avoids stale source */}
      <video
        key={src}
        controls
        autoPlay={false}
        style={{
          maxWidth: '100%',
          maxHeight: 'calc(85vh - 140px)',
          borderRadius: 8,
          background: '#000',
          display: 'block',
          margin: '0 auto',
        }}
      >
        <source src={src} type={mimeType} />
        Your browser does not support this video format.
      </video>
    </div>
  )
}

function AudioViewer({ src, mimeType, filename }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #001529 0%, #003a6e 100%)',
      borderRadius: 12,
      padding: '48px 40px',
      textAlign: 'center',
      minWidth: 320,
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <SoundOutlined style={{ fontSize: 72, color: '#1677ff', marginBottom: 24 }} />
      <Text style={{
        display: 'block', color: '#fff',
        fontSize: 16, fontWeight: 600, marginBottom: 28,
      }}>
        {filename}
      </Text>
      <audio key={src} controls style={{ width: '100%' }}>
        <source src={src} type={mimeType} />
        Your browser does not support audio playback.
      </audio>
    </div>
  )
}

// ─── Main viewer ─────────────────────────────────────────────

export default function FileViewerModal({
  files = [],       // only viewable files in this directory
  initialIndex = 0,
  projectId,
  open,
  onClose,
}) {
  const [index,    setIndex]    = useState(initialIndex)
  const [blobUrl,  setBlobUrl]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [error,    setError]    = useState('')

  // Ref tracks the active blob URL so cleanup is always accurate
  const blobRef = useRef(null)

  const file = files[index]

  // Sync index when modal opens with a new file
  useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [open, initialIndex])

  // Load file whenever modal opens or user navigates
  useEffect(() => {
    if (open && file) loadFile()
  }, [open, index])

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => revoke()
  }, [])

  // Keyboard: ← → to navigate, Escape handled by Modal itself
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  navigate(-1)
      if (e.key === 'ArrowRight') navigate(+1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, files.length])

  const revoke = () => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
    }
  }

  const loadFile = async () => {
    revoke()
    setBlobUrl(null)
    setLoading(true)
    setError('')
    setProgress(0)

    try {
      const res = await fetchFileBlob(projectId, file.id, setProgress)
      const url = URL.createObjectURL(res.data)
      blobRef.current = url
      setBlobUrl(url)
    } catch {
      setError('Could not load this file. You can still download it.')
    } finally {
      setLoading(false)
    }
  }

  const navigate = (dir) => {
    setIndex((i) => {
      const next = i + dir
      if (next < 0)            return files.length - 1
      if (next >= files.length) return 0
      return next
    })
  }

  const handleDownload = async () => {
    try {
      await downloadFile(projectId, file.id, file.display_name)
    } catch {
      message.error('Download failed')
    }
  }

  const handleClose = () => {
    revoke()
    setBlobUrl(null)
    onClose()
  }

  if (!file) return null

  const isImage = file.mime_type?.startsWith('image/')
  const isVideo = file.mime_type?.startsWith('video/')
  const isAudio = file.mime_type?.startsWith('audio/')
  const darkBg  = isVideo || isAudio

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width="92vw"
      style={{ top: 16, maxWidth: 1280 }}
      styles={{
        body:    { padding: 0 },
        content: { borderRadius: 12, overflow: 'hidden' },
      }}
      destroyOnClose
      closable={false}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fff',
        gap: 12,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text strong style={{ fontSize: 14 }} ellipsis={{ tooltip: file.display_name }}>
            {file.display_name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            {file.uploaded_by_name || file.uploaded_by_email}
            {' · '}
            {new Date(file.uploaded_at).toLocaleDateString()}
            {' · '}
            {fmtSize(file.file_size)}
          </Text>
        </div>

        <Space size="small">
          {files.length > 1 && (
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {index + 1} / {files.length}
            </Text>
          )}
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={handleDownload}
          >
            Download
          </Button>
          <Button
            icon={<CloseOutlined />}
            size="small"
            onClick={handleClose}
          />
        </Space>
      </div>

      {/* ── Media area ── */}
      <div style={{
        position: 'relative',
        minHeight: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 72px',
        background: darkBg ? '#0d1117' : '#f5f6fa',
      }}>

        {/* ← Prev */}
        {files.length > 1 && (
          <Button
            shape="circle"
            icon={<LeftOutlined />}
            onClick={() => navigate(-1)}
            style={{
              position: 'absolute', left: 12,
              top: '50%', transform: 'translateY(-50%)',
              zIndex: 10, border: 'none',
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            }}
          />
        )}

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Progress
              type="circle" percent={progress} status="active"
              strokeColor="#1677ff"
            />
            <Text
              type="secondary"
              style={{ display: 'block', marginTop: 16, color: darkBg ? '#aaa' : undefined }}
            >
              Loading {fmtSize(file.file_size)}…
            </Text>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Text type="danger" style={{ display: 'block', marginBottom: 16 }}>
              {error}
            </Text>
            <Space>
              <Button onClick={loadFile}>Retry</Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
              >
                Download instead
              </Button>
            </Space>
          </div>
        ) : blobUrl && (
          <div style={{ width: '100%' }}>
            {isImage && <ImageViewer src={blobUrl} />}
            {isVideo && <VideoViewer src={blobUrl} mimeType={file.mime_type} />}
            {isAudio && <AudioViewer src={blobUrl} mimeType={file.mime_type} filename={file.display_name} />}
          </div>
        )}

        {/* → Next */}
        {files.length > 1 && (
          <Button
            shape="circle"
            icon={<RightOutlined />}
            onClick={() => navigate(+1)}
            style={{
              position: 'absolute', right: 12,
              top: '50%', transform: 'translateY(-50%)',
              zIndex: 10, border: 'none',
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            }}
          />
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {files.length > 1 && (
        <div style={{
          display: 'flex', gap: 4,
          padding: '8px 12px',
          overflowX: 'auto',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
        }}>
          {files.map((f, i) => (
            <div
              key={f.id}
              onClick={() => setIndex(i)}
              title={f.display_name}
              style={{
                width: 44, height: 44,
                flexShrink: 0, borderRadius: 6,
                border: `2px solid ${i === index ? '#1677ff' : 'transparent'}`,
                background: '#f5f6fa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                opacity: i === index ? 1 : 0.5,
                transition: 'all .15s',
              }}
            >
              <FileIcon mimeType={f.mime_type} size={20} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
