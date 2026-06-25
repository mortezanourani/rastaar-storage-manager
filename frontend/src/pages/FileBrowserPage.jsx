import { useState, useEffect } from 'react'
import {
  Layout, Menu, Typography, Spin, Breadcrumb,
  Button, Space, Tooltip, Result,
} from 'antd'
import {
  FolderOutlined, FolderOpenOutlined,
  EditOutlined, AppstoreOutlined, ShareAltOutlined,
  UploadOutlined, TeamOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject } from '../api/projects'
import { getStructure } from '../api/files'
import { useAuth } from '../context/AuthContext'
import FileGrid      from '../components/FileGrid'
import UploadModal   from '../components/UploadModal'
import MembersModal  from '../components/MembersModal'

const { Sider, Content } = Layout
const { Text } = Typography

export default function FileBrowserPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project,      setProject]     = useState(null)
  const [structure,    setStructure]   = useState(null)
  const [selectedKey,  setSelectedKey] = useState(null)
  const [loading,      setLoading]     = useState(true)
  const [uploadOpen,   setUploadOpen]  = useState(false)
  const [membersOpen,  setMembersOpen] = useState(false)
  const [gridKey,      setGridKey]     = useState(0) // bump to force grid refresh

  useEffect(() => { fetchData() }, [projectId])

  const fetchData = async () => {
    try {
      const [projRes, structRes] = await Promise.all([
        getProject(projectId),
        getStructure(projectId),
      ])
      setProject(projRes.data)
      setStructure(structRes.data)
    } catch {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const refreshStructure = async () => {
    try {
      const res = await getStructure(projectId)
      setStructure(res.data)
    } catch {}
  }

  // Parse sidebar key → { type, date }
  const parseKey = (key) => {
    if (!key) return null
    if (key.startsWith('date:')) return { type: 'date',   date: key.split(':')[1] }
    if (key.startsWith('edit:')) return { type: 'edit',   date: key.split(':')[1] }
    if (key === 'assets')        return { type: 'assets', date: null }
    if (key === 'shared')        return { type: 'shared', date: null }
    return null
  }

  const selection = parseKey(selectedKey)

  const breadcrumbLabel = selection
    ? selection.date
      ? `${selection.type === 'edit' ? 'Edit / ' : ''}${selection.date}`
      : selection.type.charAt(0).toUpperCase() + selection.type.slice(1)
    : null

  const buildMenu = () => {
    if (!structure) return []
    const items = []

    structure.date_directories.forEach((d) =>
      items.push({ key: `date:${d}`, icon: <FolderOutlined />, label: d })
    )

    if (structure.date_directories.length > 0 &&
      (structure.has_edit || structure.has_assets || structure.has_shared)) {
      items.push({ type: 'divider' })
    }

    if (structure.has_edit) {
      items.push({
        key: 'edit-sub',
        icon: <EditOutlined />,
        label: 'Edit',
        children: structure.edit_date_directories.length > 0
          ? structure.edit_date_directories.map((d) => ({
              key: `edit:${d}`, icon: <FolderOutlined />, label: d,
            }))
          : [{ key: 'edit-empty', label: 'No dates yet', disabled: true }],
      })
    }

    if (structure.has_assets) {
      items.push({ key: 'assets', icon: <AppstoreOutlined />, label: 'Assets' })
    }
    if (structure.has_shared) {
      items.push({ key: 'shared', icon: <ShareAltOutlined />, label: 'Shared' })
    }

    return items
  }

  const handleUploadSuccess = async () => {
    await refreshStructure()
    setGridKey((k) => k + 1)
  }

  const handleRefresh = async () => {
    await refreshStructure()
    setGridKey((k) => k + 1)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 64px)', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Layout style={{ height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <Sider
        width={240}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}
      >
        <div style={{ padding: '16px 16px 8px' }}>
          <Text strong style={{
            fontSize: 11, color: '#888',
            letterSpacing: '0.8px', textTransform: 'uppercase',
          }}>
            {project?.name}
          </Text>
        </div>
        <Menu
          mode="inline"
          items={buildMenu()}
          onSelect={({ key }) => setSelectedKey(key)}
          style={{ border: 'none', fontSize: 13 }}
        />
      </Sider>

      {/* Main area */}
      <Content style={{ display: 'flex', flexDirection: 'column', background: '#f5f6fa', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: '#fff', borderBottom: '1px solid #f0f0f0',
        }}>
          <Breadcrumb items={[
            { title: <a onClick={() => navigate('/')}>Projects</a> },
            { title: project?.name },
            ...(breadcrumbLabel ? [{ title: breadcrumbLabel }] : []),
          ]} />

          <Space>
            {(user?.is_administrator || user?.is_manager) && (
              <Button icon={<TeamOutlined />} onClick={() => setMembersOpen(true)}>
                Members
              </Button>
            )}
            <Tooltip title="Refresh">
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
            </Tooltip>
            {selection && (
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setUploadOpen(true)}
              >
                Upload
              </Button>
            )}
          </Space>
        </div>

        {/* File area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selection ? (
            <div style={{
              display: 'flex', height: '100%', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#ccc', gap: 14,
            }}>
              <FolderOpenOutlined style={{ fontSize: 60 }} />
              <Text type="secondary" style={{ fontSize: 15 }}>
                Select a folder from the sidebar to view files
              </Text>
            </div>
          ) : (
            <FileGrid
              key={`${selectedKey}-${gridKey}`}
              projectId={projectId}
              directoryType={selection.type}
              dateDirectory={selection.date}
              userRole={structure?.user_role}
            />
          )}
        </div>
      </Content>

      {/* Modals */}
      {selection && (
        <UploadModal
          projectId={projectId}
          directoryType={selection.type}
          dateDirectory={selection.date}
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      <MembersModal
        projectId={projectId}
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
      />
    </Layout>
  )
}
