import { useState, useEffect } from 'react'
import { Layout, Menu, Typography, Spin, Breadcrumb, Result } from 'antd'
import {
  FolderOutlined, FolderOpenOutlined,
  EditOutlined, AppstoreOutlined, ShareAltOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject } from '../api/projects'
import { getStructure } from '../api/files'

const { Sider, Content } = Layout
const { Text } = Typography

export default function FileBrowserPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [project,     setProject]     = useState(null)
  const [structure,   setStructure]   = useState(null)
  const [selectedDir, setSelectedDir] = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      const [projRes, structRes] = await Promise.all([
        getProject(projectId),
        getStructure(projectId),
      ])
      setProject(projRes.data)
      setStructure(structRes.data)
    } catch {
      navigate('/')  // no access → go home
    } finally {
      setLoading(false)
    }
  }

  const buildMenuItems = () => {
    if (!structure) return []
    const items = []

    // Date directories (newest first)
    if (structure.date_directories.length > 0) {
      structure.date_directories.forEach((date) => {
        items.push({ key: `date:${date}`, icon: <FolderOutlined />, label: date })
      })
      items.push({ type: 'divider' })
    }

    // Edit (submenu with own date dirs)
    if (structure.has_edit) {
      items.push({
        key:      'edit-submenu',
        icon:     <EditOutlined />,
        label:    'Edit',
        children: structure.edit_date_directories.length > 0
          ? structure.edit_date_directories.map((date) => ({
              key: `edit:${date}`, icon: <FolderOutlined />, label: date,
            }))
          : [{ key: 'edit-empty', label: 'No dates yet', disabled: true }],
      })
    }

    // Assets
    if (structure.has_assets) {
      items.push({ key: 'assets', icon: <AppstoreOutlined />, label: 'Assets' })
    }

    // Shared
    if (structure.has_shared) {
      items.push({ key: 'shared', icon: <ShareAltOutlined />, label: 'Shared' })
    }

    return items
  }

  // Parse selected key into {type, date}
  const parseSelection = (key) => {
    if (!key) return null
    if (key.startsWith('date:'))  return { type: 'date',   date: key.split(':')[1] }
    if (key.startsWith('edit:'))  return { type: 'edit',   date: key.split(':')[1] }
    if (key === 'assets')         return { type: 'assets', date: null }
    if (key === 'shared')         return { type: 'shared', date: null }
    return null
  }

  const selection     = parseSelection(selectedDir)
  const breadcrumbDir = selection
    ? selection.date
      ? `${selection.type === 'edit' ? 'Edit / ' : ''}${selection.date}`
      : selection.type.charAt(0).toUpperCase() + selection.type.slice(1)
    : null

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
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '16px 16px 8px' }}>
          <Text
            strong
            style={{ fontSize: 11, color: '#888', letterSpacing: '0.8px', textTransform: 'uppercase' }}
          >
            {project?.name}
          </Text>
        </div>
        <Menu
          mode="inline"
          items={buildMenuItems()}
          onSelect={({ key }) => setSelectedDir(key)}
          style={{ border: 'none', fontSize: 13 }}
        />
      </Sider>

      {/* Content area */}
      <Content style={{ padding: 24, overflowY: 'auto', background: '#f5f6fa' }}>
        {/* Breadcrumb */}
        <Breadcrumb
          style={{ marginBottom: 20 }}
          items={[
            { title: <a onClick={() => navigate('/')}>Projects</a> },
            { title: project?.name },
            ...(breadcrumbDir ? [{ title: breadcrumbDir }] : []),
          ]}
        />

        {/* Placeholder — replaced in Day 5 */}
        {!selectedDir ? (
          <div style={{
            display: 'flex', height: '60%',
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Result
              icon={<FolderOpenOutlined style={{ color: '#d0d0d0' }} />}
              title={<Text type="secondary">Select a folder from the sidebar</Text>}
            />
          </div>
        ) : (
          <Result
            icon={<FolderOutlined style={{ color: '#1677ff' }} />}
            title={breadcrumbDir}
            subTitle="File grid coming in Day 5"
          />
        )}
      </Content>
    </Layout>
  )
}