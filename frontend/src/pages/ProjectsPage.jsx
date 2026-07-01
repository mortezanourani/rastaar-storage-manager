import { useState, useEffect } from 'react'
import {
  Row, Col, Card, Typography, Button, Tag, Empty,
  Spin, Modal, Form, Input, message, Badge,
} from 'antd'
import { FolderOutlined, PlusOutlined, RightOutlined, GlobalOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getProjects, createProject } from '../api/projects'
import { useAuth } from '../context/AuthContext'

const { Title, Text } = Typography

export default function ProjectsPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [form]     = Form.useForm()
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    try {
      const res = await getProjects()
      setProjects(res.data)
    } catch {
      message.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (values) => {
    setCreating(true)
    try {
      await createProject(values)
      message.success(`Project "${values.name}" created`)
      setModal(false)
      form.resetFields()
      fetchProjects()
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 64px)', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Projects</Title>
          <Text type="secondary">
            {projects.length} project{projects.length !== 1 ? 's' : ''} available
          </Text>
        </div>
        {user?.is_administrator && (
          <Button
            type="primary" icon={<PlusOutlined />}
            onClick={() => setModal(true)} size="large"
          >
            New Project
          </Button>
        )}
      </div>

      <Card
        hoverable
        onClick={() => navigate('/global')}
        style={{
          borderRadius: 10,
          border: '2px solid #d9f7be',
          background: 'linear-gradient(135deg, #f6ffed 0%, #fff 100%)',
          marginBottom: 24,
        }}
        styles={{ body: { padding: 20 } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: '#d9f7be',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <GlobalOutlined style={{ fontSize: 24, color: '#52c41a' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 15, display: 'block' }}>Global Storage</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Shared files accessible to all users — brand assets, templates, references
            </Text>
          </div>
          <RightOutlined style={{ color: '#95de64' }} />
        </div>
      </Card>
      {/* Grid */}
      {projects.length === 0 ? (
        <Empty description="No projects yet. Create your first project to get started." />
      ) : (
        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col xs={24} sm={12} lg={8} key={project.id}>
              <Card
                hoverable
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{ borderRadius: 10, border: '1px solid #eee' }}
                styles={{ body: { padding: 20 } }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 10,
                    background: '#e6f4ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FolderOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, display: 'block' }}>{project.name}</Text>
                    {project.description && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 13, display: 'block', marginTop: 3 }}
                        ellipsis={{ tooltip: project.description }}
                      >
                        {project.description}
                      </Text>
                    )}
                    <div style={{ marginTop: 10 }}>
                      <Tag color={project.is_active ? 'green' : 'default'} style={{ borderRadius: 4 }}>
                        {project.is_active ? 'Active' : 'Inactive'}
                      </Tag>
                    </div>
                  </div>
                  <RightOutlined style={{ color: '#ccc', marginTop: 4 }} />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create Project Modal */}
      <Modal
        title="Create New Project"
        open={modal}
        onCancel={() => { setModal(false); form.resetFields() }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Project Name"
            rules={[{ required: true, message: 'Project name is required' }]}
          >
            <Input placeholder="e.g. Wedding June 2025" autoFocus />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Optional — describe the project" rows={3} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setModal(false); form.resetFields() }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creating}>Create Project</Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
