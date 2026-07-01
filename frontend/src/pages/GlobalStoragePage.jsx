import { useState, useEffect } from 'react'
import {
  Layout, Menu, Typography, Spin, Breadcrumb,
  Button, Space, Tooltip, Row, Col, Card,
  Popconfirm, Progress, message, Empty,
  Modal, Steps, Upload as AntUpload, Button as AntButton,
  Input, Progress as AntProgress, Alert as AntAlert,
} from 'antd'
import {
  FolderOutlined, FolderOpenOutlined, FolderAddOutlined,
  GlobalOutlined, DownloadOutlined, DeleteOutlined,
  EyeOutlined, UploadOutlined, ReloadOutlined, UserOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getGlobalStructure, listGlobalFiles, checkGlobalConflict,
  uploadGlobalFile, downloadGlobalFile, fetchGlobalThumbnail,
  fetchGlobalFileBlob, deleteGlobalFile, createGlobalDirectory,
} from '../api/global'
import AuthImage         from '../components/AuthImage'
import FileIcon          from '../components/FileIcon'
import FileViewerModal, { isViewable } from '../components/FileViewerModal'
import CreateFolderModal from '../components/CreateFolderModal'
import { InboxOutlined, WarningOutlined, UploadOutlined as UploadIcon } from '@ant-design/icons'

const { Sider, Content } = Layout
const { Text } = Typography

function fmtSize(bytes) {
  if (!bytes) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`
}

// ── Global File Card ──────────────────────────────────────────

function GlobalFileCard({ file, canDelete, onDeleted, onView }) {
  const [hovered, setHovered] = useState(false)
  const viewable = isViewable(file.mime_type)

  const handleDownload = async () => {
    try { await downloadGlobalFile(file.id, file.display_name) }
    catch { message.error('Download failed') }
  }

  const handleDelete = async () => {
    try {
      await deleteGlobalFile(file.id)
      message.success(`"${file.display_name}" moved to trash`)
      onDeleted(file.id)
    } catch (err) {
      message.error(err.response?.data?.detail || 'Delete failed')
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
          <div
            onClick={() => viewable && onView && onView(file.id)}
            style={{
              height: 120, background: '#f5f6fa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              cursor: viewable ? 'pointer' : 'default',
            }}
          >
            {file.has_thumbnail ? (
              <AuthImage
                fileId={file.id}
                alt={file.display_name}
                fetchFn={(id) => fetchGlobalThumbnail(id)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                fallback={<FileIcon mimeType={file.mime_type} size={40} />}
              />
            ) : (
              <FileIcon mimeType={file.mime_type} size={40} />
            )}
          </div>

          <div
            className="file-overlay"
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8,
              opacity: hovered ? 1 : 0,
              transition: 'opacity .18s ease',
              pointerEvents: hovered ? 'auto' : 'none',
            }}
          >
            {viewable && (
              <Tooltip title="View">
                <Button
                  type="primary" shape="circle"
                  icon={<EyeOutlined />} size="small"
                  onClick={(e) => { e.stopPropagation(); onView && onView(file.id) }}
                />
              </Tooltip>
            )}
            <Tooltip title="Download">
              <Button
                shape="circle" icon={<DownloadOutlined />} size="small"
                style={{ background: '#fff' }}onClick={(e) => { e.stopPropagation(); handleDownload() }}
              />
            </Tooltip>
            {canDelete && (
              <Popconfirm
                title="Move to trash?"
                onConfirm={handleDelete}
                okButtonProps={{ danger: true }}
                okText="Move to Trash"
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
      <div style={{ padding: '10px 10px 8px' }}>
        <Tooltip title={file.display_name}>
          <Text strong style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.display_name}
          </Text>
        </Tooltip>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{fmtSize(file.file_size)}</Text>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.uploaded_by_name || file.uploaded_by_email || '—'}
        </Text>
      </div>
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function GlobalStoragePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [subdirectories, setSubdirectories] = useState([])
  const [selectedKey,    setSelectedKey]    = useState('root')
  const [files,          setFiles]          = useState([])
  const [loadingPage,    setLoadingPage]    = useState(true)
  const [loadingFiles,   setLoadingFiles]   = useState(false)
  const [folderOpen,     setFolderOpen]     = useState(false)
  const [folderLoading,  setFolderLoading]  = useState(false)
  const [uploadOpen,     setUploadOpen]     = useState(false)
  const [viewerState,    setViewerState]    = useState({ open: false, index: 0 })

  const currentSubdir = selectedKey === 'root' ? null : selectedKey.replace('sub|', '')
  const viewableFiles = files.filter(f => isViewable(f.mime_type))

  useEffect(() => { fetchStructure() }, [])
  useEffect(() => { fetchFiles() }, [selectedKey])

  const fetchStructure = async () => {
    try {
      const res = await getGlobalStructure()
      setSubdirectories(res.data.subdirectories)
    } catch { message.error('Failed to load global storage') }
    finally  { setLoadingPage(false) }
  }

  const fetchFiles = async () => {
    setLoadingFiles(true)
    try {
      const res = await listGlobalFiles(currentSubdir)
      setFiles(res.data)
    } catch {} finally { setLoadingFiles(false) }
  }

  const handleCreateFolder = async (name) => {
    setFolderLoading(true)
    try {
      await createGlobalDirectory(name)
      message.success(`Folder "${name}" created`)
      setFolderOpen(false)
      const res = await getGlobalStructure()
      setSubdirectories(res.data.subdirectories)
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to create folder')
    } finally { setFolderLoading(false) }
  }

  const handleDeleted = (fileId) => setFiles(prev => prev.filter(f => f.id !== fileId))

  const handleView = (fileId) => {
    const idx = viewableFiles.findIndex(f => f.id === fileId)
    if (idx >= 0) setViewerState({ open: true, index: idx })
  }

  const canDelete = (file) =>
    user?.is_global_manager || file.uploaded_by_email === user?.email

  const menuItems = [
    {
      key: 'root',
      icon: <FolderOpenOutlined />,
      label: 'All Files',
    },
    ...(subdirectories.length > 0 ? [{ type: 'divider' }] : []),
    ...subdirectories.map(sub => ({
      key: `sub|${sub}`,
      icon: <FolderOutlined />,
      label: sub,
    })),
  ]

  const breadcrumbLabel = selectedKey === 'root' ? 'All Files' : currentSubdir

  if (loadingPage) return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" />
    </div>
  )

  return (
    <Layout style={{ height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <Sider width={240} style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>
        <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlobalOutlined style={{ color: '#52c41a' }} />
          <Text strong style={{ fontSize: 11, color: '#888', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Global Storage
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onSelect={({ key }) => setSelectedKey(key)}
          style={{ border: 'none', fontSize: 13 }}
        />
      </Sider>

      {/* Main */}
      <Content style={{ display: 'flex', flexDirection: 'column', background: '#f5f6fa', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0',
        }}>
          <Breadcrumb items={[
            { title: <a onClick={() => navigate('/')}>Projects</a> },
            { title: 'Global Storage' },
            { title: breadcrumbLabel },
          ]} />
          <Space>
            {selectedKey === 'root' && (
              <Button icon={<FolderAddOutlined />} onClick={() => setFolderOpen(true)}>
                New Folder
              </Button>
            )}
            <Tooltip title="Refresh">
              <Button icon={<ReloadOutlined />} onClick={() => { fetchStructure(); fetchFiles() }} />
            </Tooltip>
            <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
              Upload
            </Button>
          </Space>
        </div>

        {/* Files */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loadingFiles ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Spin size="large" />
            </div>
          ) : files.length === 0 ? (
            <Empty description="No files here yet" style={{ marginTop: 60 }} />
          ) : (
            <Row gutter={[12, 12]}>
              {files.map(file => (
                <Col xs={12} sm={8} md={6} lg={4} key={file.id}>
                  <GlobalFileCard
                    file={file}
                    canDelete={canDelete(file)}
                    onDeleted={handleDeleted}
                    onView={isViewable(file.mime_type) ? handleView : undefined}
                  />
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Content>

      {/* Upload Modal — reuse existing but wired to global API */}
      <GlobalUploadModal
        subdirectory={currentSubdir}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => { fetchFiles(); fetchStructure() }}
      />

      <CreateFolderModal
        open={folderOpen}
        onClose={() => setFolderOpen(false)}
        onConfirm={handleCreateFolder}
        loading={folderLoading}
      />

      <FileViewerModal
        files={viewableFiles}
        initialIndex={viewerState.index}
        open={viewerState.open}
        onClose={() => setViewerState(s => ({ ...s, open: false }))}
        fetchFn={(id, onProg) => fetchGlobalFileBlob(id, onProg)}
        downloadFn={(id, name)  => downloadGlobalFile(id, name)}
      />
    </Layout>
  )
}

// ── Inline upload modal for global storage ────────────────────

function GlobalUploadModal({ subdirectory, open, onClose, onSuccess }) {
  const [step,        setStep]        = useState(0)
  const [file,        setFile]        = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [overwrite,   setOverwrite]   = useState(false)
  const [conflict,    setConflict]    = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [checking,    setChecking]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [error,       setError]       = useState('')

  const reset = () => {
    setStep(0); setFile(null); setDisplayName(''); setOverwrite(false)
    setConflict(false); setProgress(0); setChecking(false); setUploading(false); setError('')
  }
  const handleClose = () => { reset(); onClose() }

  const handlePick = (picked) => {
    setFile(picked); setDisplayName(picked.name); setStep(1); return false
  }

  const handleNext = async () => {
    const name = displayName.trim()
    if (!name) { setError('File name is required'); return }
    setError(''); setChecking(true)
    try {
      const res = await checkGlobalConflict({ filename: name, subdirectory })
      if (res.data.conflict && !overwrite) { setConflict(true); setChecking(false); return }
    } catch { setError('Could not check conflicts'); setChecking(false); return }
    setChecking(false)
    setStep(2); setUploading(true); setProgress(0)
    const form = new FormData()
    form.append('file', file)
    form.append('display_name', name)
    if (subdirectory) form.append('subdirectory', subdirectory)
    form.append('overwrite', overwrite ? 'true' : 'false')
    try {
      await uploadGlobalFile(form, setProgress)
      setProgress(100)
      message.success(`"${name}" uploaded`)
      onSuccess()
      setTimeout(handleClose, 700)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
      setUploading(false); setStep(1)
    }
  }

  return (
    <Modal
      title="Upload to Global Storage" open={open}
      onCancel={handleClose} footer={null} width={480} destroyOnClose
    >
      <Steps
        current={step} size="small" style={{ marginBottom: 24 }}
        items={['Pick file', 'Name', 'Uploading'].map(t => ({ title: t }))}
      />

      {step === 0 && (
        <AntUpload.Dragger beforeUpload={handlePick} showUploadList={false}>
          <p style={{ fontSize: 32, margin: '8px 0 4px' }}>📂</p>
          <Text strong>Click or drag a file here</Text>
          <Text type="secondary" style={{ display: 'block', margin: '4px 0 12px' }}>Up to 1 GB</Text>
        </AntUpload.Dragger>
      )}

      {step === 1 && (
        <div>
          {conflict && !overwrite && (
            <AntAlert
              type="warning" showIcon icon={<WarningOutlined />}
              message={`"${displayName}" already exists`}
              description={
                <Space style={{ marginTop: 8 }}>
                  <Button danger size="small" onClick={() => { setOverwrite(true); setConflict(false) }}>Overwrite</Button>
                  <Button size="small" onClick={() => { setDisplayName(n => n.replace(/(\.[^.]+)?$/, '_copy$1')); setConflict(false) }}>Rename (_copy)</Button>
                </Space>
              }
              style={{ marginBottom: 16 }}
            />
          )}
          <Text strong style={{ display: 'block', marginBottom: 6 }}>File Name</Text>
          <Input
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setConflict(false); setOverwrite(false) }}
            autoFocus style={{ marginBottom: 16 }}
          />
          {error && <AntAlert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button type="primary" icon={<UploadIcon />} loading={checking} onClick={handleNext}>
              Upload
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <AntProgress
            type="circle" percent={progress}
            status={uploading && progress < 100 ? 'active' : progress === 100 ? 'success' : 'exception'}
            style={{ marginBottom: 16 }}
          />
          <Text strong style={{ display: 'block' }}>
            {progress < 100 ? 'Uploading...' : '✓ Upload complete'}
          </Text>
        </div>
      )}
    </Modal>
  )
}