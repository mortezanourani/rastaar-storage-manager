import { useState, useEffect } from 'react'
import {
  Row, Col, Card, Typography, Tooltip,
  Button, Spin, Empty, Popconfirm, message,
} from 'antd'
import { DownloadOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons'
import { listFiles, downloadFile, deleteFile } from '../api/files'
import { useAuth } from '../context/AuthContext'
import AuthImage from './AuthImage'
import FileIcon  from './FileIcon'

const { Text } = Typography

function fmt_size(bytes) {
  if (!bytes) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`
}

function fmt_date(str) {
  return new Date(str).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function FileCard({ file, projectId, canDelete, onDeleted }) {
  const [hovered, setHovered] = useState(false)

  const handleDownload = async () => {
    try {
      await downloadFile(projectId, file.id, file.display_name)
    } catch {
      message.error('Download failed')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteFile(projectId, file.id)
      message.success(`"${file.display_name}" moved to trash`)
      onDeleted(file.id)
    } catch {
      message.error('Delete failed')
    }
  }

  return (
    <Card
      className="file-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}
      styles={{ body: { padding: 0 } }}
      cover={
        <div style={{ position: 'relative' }}>
          {/* Preview area */}
          <div style={{
            height: 120, background: '#f5f6fa',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {file.has_thumbnail ? (
              <AuthImage
                projectId={projectId}
                fileId={file.id}
                alt={file.display_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                fallback={<FileIcon mimeType={file.mime_type} size={40} />}
              />
            ) : (
              <FileIcon mimeType={file.mime_type} size={40} />
            )}
          </div>

          {/* Hover overlay with actions */}
          <div
            className="file-overlay"
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.18s ease',
              pointerEvents: hovered ? 'auto' : 'none',
            }}
          >
            <Tooltip title="Download">
              <Button
                type="primary" shape="circle"
                icon={<DownloadOutlined />} size="small"
                onClick={(e) => { e.stopPropagation(); handleDownload() }}
              />
            </Tooltip>

            {canDelete && (
              <Popconfirm
                title="Move to trash?"
                description="Managers can restore it later"
                onConfirm={handleDelete}
                okText="Move to Trash"
                okButtonProps={{ danger: true }}
                onPopupClick={(e) => e.stopPropagation()}
              >
                <Tooltip title="Delete">
                  <Button
                    danger shape="circle"
                    icon={<DeleteOutlined />} size="small"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        </div>
      }
    >
      {/* File metadata */}
      <div style={{ padding: '10px 10px 8px' }}>
        <Tooltip title={file.display_name}>
          <Text
            strong
            style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {file.display_name}
          </Text>
        </Tooltip>

        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
          {fmt_size(file.file_size)}
        </Text>

        <Tooltip title={file.uploaded_by_name || file.uploaded_by_email || 'Unknown'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
            <UserOutlined style={{ fontSize: 10, color: '#bbb' }} />
            <Text
              type="secondary"
              style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {file.uploaded_by_name || file.uploaded_by_email || '—'}
            </Text>
          </div>
        </Tooltip>

        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
          {fmt_date(file.uploaded_at)}
        </Text>
      </div>
    </Card>
  )
}

export default function FileGrid({ projectId, directoryType, dateDirectory }) {
  const { user }  = useAuth()
  const [files,   setFiles]   = useState([])
  const [loading, setLoading] = useState(true)

  const canDelete = user?.is_administrator || user?.is_manager || directoryType === 'shared'

  useEffect(() => {
    if (directoryType) fetchFiles()
  }, [projectId, directoryType, dateDirectory])

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await listFiles(projectId, directoryType, dateDirectory)
      setFiles(res.data)
    } catch {
      message.error('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleted = (fileId) =>
    setFiles((prev) => prev.filter((f) => f.id !== fileId))

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <Spin size="large" />
    </div>
  )

  if (files.length === 0) return (
    <Empty
      description="No files here yet"
      style={{ marginTop: 60 }}
    />
  )

  return (
    <Row gutter={[12, 12]}>
      {files.map((file) => (
        <Col xs={12} sm={8} md={6} lg={4} key={file.id}>
          <FileCard
            file={file}
            projectId={projectId}
            canDelete={canDelete}
            onDeleted={handleDeleted}
          />
        </Col>
      ))}
    </Row>
  )
}
