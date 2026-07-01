import { useState, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, Switch,
  Typography, Tag, Space, Popconfirm, message, Tabs,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getUsers, createUser, updateUser, deactivate } from '../api/auth'  // ← add updateUser
import { getProjects, updateProject } from '../api/projects'
import { useAuth } from '../context/AuthContext'

const { Title, Text } = Typography

// ─── Users tab ────────────────────────────────────────────────

function UsersTab() {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [creating, setCreating] = useState(false)
  const [form]     = Form.useForm()

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await getUsers()
      setUsers(res.data)
    } catch { message.error('Failed to load users') }
    finally  { setLoading(false) }
  }

  const handleCreate = async (values) => {
    setCreating(true)
    try {
      await createUser(values)
      message.success(`User "${values.email}" created`)
      setModal(false)
      form.resetFields()
      fetchUsers()
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to create user')
    } finally { setCreating(false) }
  }

  const handleDeactivate = async (userId) => {
    try {
      await deactivate(userId)
      message.success('User deactivated')
      fetchUsers()
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed')
    }
  }

  // ← NEW
  const handleActivate = async (userId) => {
    try {
      await updateUser(userId, { is_active: true })
      message.success('User activated')
      fetchUsers()
    } catch {
      message.error('Failed to activate user')
    }
  }

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_, u) => (
        <div>
          <Text strong style={{ display: 'block' }}>{u.full_name || '—'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{u.email}</Text>
        </div>
      ),
    },
    {
      title: 'Username',
      dataIndex: 'username',
      render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Global Role',
      key: 'role',
      render: (_, u) => (
        <Space>
          {u.is_administrator && <Tag color="red">Administrator</Tag>}
          {u.is_manager && !u.is_administrator && <Tag color="orange">Manager</Tag>}
          {!u.is_administrator && !u.is_manager && <Tag>Standard User</Tag>}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: '',
      key: 'action',
      render: (_, u) => u.is_active ? (
        // Deactivate active users
        <Popconfirm
          title="Deactivate this user?"
          description="They will lose all access immediately"
          onConfirm={() => handleDeactivate(u.id)}
          okButtonProps={{ danger: true }}
          okText="Deactivate"
        >
          <Button type="text" danger size="small">Deactivate</Button>
        </Popconfirm>
      ) : (
        // ← NEW: Activate inactive users
        <Popconfirm
          title="Activate this user?"
          description="They will regain full access"
          onConfirm={() => handleActivate(u.id)}
          okText="Activate"
          okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
        >
          <Button type="text" size="small" style={{ color: '#52c41a' }}>
            Activate
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>
          Create User
        </Button>
      </div>
      <Table
        rowKey="id" columns={columns}
        dataSource={users} loading={loading}
        pagination={{ pageSize: 15 }}
        rowClassName={(u) => !u.is_active ? 'ant-table-row-disabled' : ''}
      />

      <Modal
        title="Create New User" open={modal}
        onCancel={() => { setModal(false); form.resetFields() }}
        footer={null} destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="John Smith" autoFocus />
          </Form.Item>
          <Form.Item name="email" label="Email"
            rules={[{ required: true }, { type: 'email' }]}>
            <Input placeholder="john@company.com" />
          </Form.Item>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input placeholder="johnsmith" />
          </Form.Item>
          <Form.Item name="password" label="Password"
            rules={[{ required: true }, { min: 8, message: 'Minimum 8 characters' }]}>
            <Input.Password placeholder="••••••••" />
          </Form.Item>
          <Space size="large" style={{ marginBottom: 16 }}>
            <Form.Item name="is_administrator" valuePropName="checked" label="Administrator" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="is_manager" valuePropName="checked" label="Manager" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </Space>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setModal(false); form.resetFields() }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creating}>Create</Button>
          </div>
        </Form>
      </Modal>
    </>
  )
}

// ─── Projects tab ─────────────────────────────────────────────

function ProjectsTab() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      // ← include_inactive=true so all projects appear
      const res = await getProjects(true)
      setProjects(res.data)
    } catch { message.error('Failed to load projects') }
    finally  { setLoading(false) }
  }

  const handleToggle = async (project) => {
    try {
      await updateProject(project.id, { is_active: !project.is_active })
      message.success(`Project "${project.name}" ${project.is_active ? 'deactivated' : 'activated'}`)
      fetchProjects()
    } catch { message.error('Failed to update project') }
  }

  const columns = [
    {
      title: 'Project',
      key: 'project',
      render: (_, p) => (
        <div>
          <Text
            strong
            style={{
              display: 'block', cursor: p.is_active ? 'pointer' : 'default',
              color: p.is_active ? '#1677ff' : '#bbb',
            }}
            onClick={() => p.is_active && navigate(`/projects/${p.id}`)}
          >
            {p.name}
          </Text>
          {p.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>{p.description}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Storage Path',
      dataIndex: 'storage_path',
      render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: '',
      key: 'action',
      render: (_, p) => p.is_active ? (
        // Deactivate active project
        <Popconfirm
          title="Deactivate this project?"
          description="Members will lose access until reactivated"
          onConfirm={() => handleToggle(p)}
          okButtonProps={{ danger: true }}
          okText="Deactivate"
        >
          <Button type="text" danger size="small">Deactivate</Button>
        </Popconfirm>
      ) : (
        // ← NEW: Activate inactive project
        <Popconfirm
          title="Activate this project?"
          description="Members will regain access"
          onConfirm={() => handleToggle(p)}
          okText="Activate"
          okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
        >
          <Button type="text" size="small" style={{ color: '#52c41a' }}>
            Activate
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <Table
      rowKey="id" columns={columns}
      dataSource={projects} loading={loading}
      pagination={{ pageSize: 15 }}
      rowClassName={(p) => !p.is_active ? 'ant-table-row-disabled' : ''}
    />
  )
}

// ─── Admin page ───────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !user.is_administrator) navigate('/')
  }, [user])

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 28 }}>Admin Panel</Title>
      <Tabs
        items={[
          { key: 'users',    label: 'Users',    children: <UsersTab /> },
          { key: 'projects', label: 'Projects', children: <ProjectsTab /> },
        ]}
      />
    </div>
  )
}
