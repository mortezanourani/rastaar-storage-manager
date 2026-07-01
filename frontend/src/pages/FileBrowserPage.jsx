import { useState, useEffect } from 'react'
import {
  Layout, Menu, Typography, Spin, Breadcrumb,
  Button, Space, Tooltip, message,
} from 'antd'
import {
  FolderOutlined, FolderOpenOutlined, FolderAddOutlined,
  EditOutlined, AppstoreOutlined, ShareAltOutlined,
  UploadOutlined, TeamOutlined, ReloadOutlined, CalendarOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject } from '../api/projects'
import { getStructure, createDirectory } from '../api/files'
import { useAuth } from '../context/AuthContext'
import FileGrid          from '../components/FileGrid'
import UploadModal       from '../components/UploadModal'
import MembersModal      from '../components/MembersModal'
import CreateFolderModal from '../components/CreateFolderModal'

const { Sider, Content } = Layout
const { Text } = Typography

export default function FileBrowserPage() {
  const { projectId } = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuth()

  const [project,       setProject]       = useState(null)
  const [structure,     setStructure]     = useState(null)
  const [selectedKey,   setSelectedKey]   = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [uploadOpen,    setUploadOpen]    = useState(false)
  const [membersOpen,   setMembersOpen]   = useState(false)
  const [folderOpen,    setFolderOpen]    = useState(false)
  const [folderLoading, setFolderLoading] = useState(false)
  const [gridKey,       setGridKey]       = useState(0)

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

  // ── Key parsing ──────────────────────────────────────────────────────
  // Format: date:2024-01-15 | edit:2024-01-15 | assets | assets|photos | shared | shared|drafts
  const parseKey = (key) => {
    if (!key) return null
    if (key.startsWith('date:'))   return { type: 'date',   date: key.split(':')[1], subdirectory: null }
    if (key.startsWith('edit:'))   return { type: 'edit',   date: key.split(':')[1], subdirectory: null }
    if (key.startsWith('assets|')) return { type: 'assets', date: null, subdirectory: key.split('|')[1] }
    if (key.startsWith('shared|')) return { type: 'shared', date: null, subdirectory: key.split('|')[1] }
    if (key === 'assets')          return { type: 'assets', date: null, subdirectory: '' }
    if (key === 'shared')          return { type: 'shared', date: null, subdirectory: '' }
    return null
  }

  const selection = parseKey(selectedKey)

  const canCreateFolder = selection &&
    ['assets', 'shared'].includes(selection.type) &&
    !selection.subdirectory  // only from root level

  // ── Sidebar ──────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]

  const buildSubdirChildren = (type, subdirs) => {
    const children = [
      { key: type, icon: <FolderOpenOutlined />, label: 'All files' },
    ]
    subdirs.forEach(sub =>
      children.push({ key: `${type}|${sub}`, icon: <FolderOutlined />, label: sub })
    )
    return children
  }

  const buildMenu = () => {
    if (!structure) return []
    const items = []

    // Date directories — Today always pinned first
    items.push({
      key:   `date:${today}`,
      icon:  <CalendarOutlined style={{ color: '#1677ff' }} />,
      label: <span style={{ color: '#1677ff', fontWeight: 500 }}>Today · {today}</span>,
    })
    structure.date_directories
      .filter(d => d !== today)
      .forEach(d => items.push({ key: `date:${d}`, icon: <FolderOutlined />, label: d }))

    if (structure.has_edit || structure.has_assets || structure.has_shared)
      items.push({ type: 'divider' })

    // Edit directory
    if (structure.has_edit) {
      const editChildren = [
        {
          key:   `edit:${today}`,
          icon:  <CalendarOutlined style={{ color: '#1677ff' }} />,
          label: <span style={{ color: '#1677ff', fontWeight: 500 }}>Today · {today}</span>,
        },
        ...structure.edit_date_directories
          .filter(d => d !== today)
          .map(d => ({ key: `edit:${d}`, icon: <FolderOutlined />, label: d })),
      ]
      items.push({ key: 'edit-sub', icon: <EditOutlined />, label: 'Edit', children: editChildren })
    }

    // Assets — always submenu so subdirs are visible
    if (structure.has_assets) {
      items.push({
        key:      'assets-sub',
        icon:     <AppstoreOutlined />,
        label:    'Assets',
        children: buildSubdirChildren('assets', structure.assets_subdirectories),
      })
    }

    // Shared — same pattern
    if (structure.has_shared) {
      items.push({
        key:      'shared-sub',
        icon:     <ShareAltOutlined />,
        label:    'Shared',
        children: buildSubdirChildren('shared', structure.shared_subdirectories),
      })
    }

    return items
  }

  // Breadcrumb label
  const breadcrumbLabel = () => {
    if (!selection) return null
    const { type, date, subdirectory } = selection
    const base = type === 'edit' ? 'Edit' : type.charAt(0).toUpperCase() + type.slice(1)
    if (date) return type === 'edit' ? `Edit › ${date}` : date
    if (subdirectory) return `${base} › ${subdirectory}`
    return base
  }

  const handleUploadSuccess = async () => {
    await refreshStructure()
    setGridKey(k => k + 1)
  }

  const handleCreateFolder = async (name) => {
    if (!selection) return
    setFolderLoading(true)
    try {
      await createDirectory(projectId, { directory_type: selection.type, name })
      message.success(`Folder "${name}" created`)
      setFolderOpen(false)
      await refreshStructure()
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to create folder')
    } finally {
      setFolderLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" />
    </div>
  )

  return (
    <Layout style={{ height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <Sider width={240} style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>
        <div style={{ padding: '16px 16px 8px' }}>
          <Text strong style={{ fontSize: 11, color: '#888', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            {project?.name}
          </Text>
        </div>
        <Menu
          mode="inline"
          items={buildMenu()}
          onSelect={({ key }) => {
            // Ignore submenu parent keys
            if (['edit-sub', 'assets-sub', 'shared-sub'].includes(key)) return
            setSelectedKey(key)
          }}
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
            { title: project?.name },
            ...(breadcrumbLabel() ? [{ title: breadcrumbLabel() }] : []),
          ]} />

          <Space>
            {(user?.is_administrator || user?.is_manager) && (
              <Button icon={<TeamOutlined />} onClick={() => setMembersOpen(true)}>Members</Button>
            )}
            {canCreateFolder && (
              <Button icon={<FolderAddOutlined />} onClick={() => setFolderOpen(true)}>
                New Folder
              </Button>
            )}
            <Tooltip title="Refresh">
              <Button icon={<ReloadOutlined />} onClick={async () => { await refreshStructure(); setGridKey(k => k + 1) }} />
            </Tooltip>
            {selection && (
              <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
                Upload
              </Button>
            )}
          </Space>
        </div>

        {/* File area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selection ? (
            <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <FolderOpenOutlined style={{ fontSize: 60, color: '#d0d0d0' }} />
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
              subdirectory={selection.subdirectory || ''}
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
          subdirectory={selection.subdirectory || ''}
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

      <CreateFolderModal
        open={folderOpen}
        onClose={() => setFolderOpen(false)}
        onConfirm={handleCreateFolder}
        loading={folderLoading}
      />
    </Layout>
  )
}