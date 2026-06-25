import { useState, useEffect } from 'react'
import {
  Modal, Table, Select, Button, Tag,
  Typography, Popconfirm, message, Space,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { getMembers, addMember, removeMember } from '../api/projects'
import { getUsers } from '../api/auth'
import { useAuth } from '../context/AuthContext'

const { Text } = Typography

const ROLES       = ['director', 'coordinator', 'editor', 'user']
const ROLE_COLOR  = { director: 'purple', coordinator: 'blue', editor: 'cyan', user: 'default' }

export default function MembersModal({ projectId, open, onClose }) {
  const { user }   = useAuth()
  const [members,  setMembers]  = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [addForm,  setAddForm]  = useState({ userId: null, role: 'user' })
  const [adding,   setAdding]   = useState(false)

  const canManage = user?.is_administrator || user?.is_manager

  useEffect(() => {
    if (open) fetchAll()
  }, [open, projectId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [memRes, usersRes] = await Promise.all([
        getMembers(projectId),
        canManage ? getUsers() : Promise.resolve({ data: [] }),
      ])
      setMembers(memRes.data)
      setAllUsers(usersRes.data)
    } catch {
      message.error('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!addForm.userId) { message.warning('Select a user to add'); return }
    setAdding(true)
    try {
      await addMember(projectId, { user_id: addForm.userId, role: addForm.role })
      message.success('Member added to project')
      setAddForm({ userId: null, role: 'user' })
      fetchAll()
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (userId) => {
    try {
      await removeMember(projectId, userId)
      message.success('Member removed')
      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    } catch {
      message.error('Failed to remove member')
    }
  }

  // Only show users not already in the project and not global admin/manager
  const memberIds       = new Set(members.map((m) => m.user_id))
  const availableUsers  = allUsers.filter(
    (u) => !memberIds.has(u.id) && !u.is_administrator && !u.is_manager && u.is_active
  )

  const columns = [
    {
      title: 'Member',
      key: 'member',
      render: (_, m) => (
        <div>
          <Text strong style={{ display: 'block', fontSize: 13 }}>
            {m.full_name || m.email}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{m.email}</Text>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role) => (
        <Tag color={ROLE_COLOR[role] || 'default'} style={{ textTransform: 'capitalize' }}>
          {role}
        </Tag>
      ),
    },
    canManage && {
      title: '',
      key: 'remove',
      width: 48,
      render: (_, m) => (
        <Popconfirm
          title="Remove this member?"
          description="They will lose access to the project"
          onConfirm={() => handleRemove(m.user_id)}
          okButtonProps={{ danger: true }}
          okText="Remove"
        >
          <Button
            type="text" danger size="small"
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      ),
    },
  ].filter(Boolean)

  return (
    <Modal
      title="Project Members"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      {/* Add member (manager/admin only) */}
      {canManage && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 20,
          padding: 14, background: '#f5f6fa', borderRadius: 8,
        }}>
          <Select
            showSearch
            placeholder="Select user"
            style={{ flex: 1 }}
            value={addForm.userId}
            onChange={(v) => setAddForm((f) => ({ ...f, userId: v }))}
            optionFilterProp="label"
            options={availableUsers.map((u) => ({
              value: u.id,
              label: u.full_name ? `${u.full_name} (${u.email})` : u.email,
            }))}
            notFoundContent="No users available"
          />
          <Select
            value={addForm.role}
            onChange={(v) => setAddForm((f) => ({ ...f, role: v }))}
            style={{ width: 136 }}
            options={ROLES.map((r) => ({
              value: r,
              label: r.charAt(0).toUpperCase() + r.slice(1),
            }))}
          />
          <Button
            type="primary" icon={<PlusOutlined />}
            onClick={handleAdd} loading={adding}
          >
            Add
          </Button>
        </div>
      )}

      <Table
        rowKey="user_id"
        columns={columns}
        dataSource={members}
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: 'No members assigned yet' }}
      />
    </Modal>
  )
}
