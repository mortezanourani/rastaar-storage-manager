import { useState } from 'react'
import { Modal, Input, Button, Typography, message } from 'antd'
import { FolderAddOutlined } from '@ant-design/icons'

const { Text } = Typography

export default function CreateFolderModal({ open, onClose, onConfirm, loading }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleOk = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Folder name is required'); return }
    if (/[/\\:*?"<>|]/.test(trimmed)) { setError('Name contains invalid characters'); return }
    setError('')
    await onConfirm(trimmed)
    setName('')
  }

  const handleClose = () => { setName(''); setError(''); onClose() }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderAddOutlined style={{ color: '#1677ff' }} /> New Folder
        </span>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={380}
      destroyOnClose
    >
      <div style={{ padding: '8px 0 4px' }}>
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          placeholder="Folder name"
          autoFocus
          onPressEnter={handleOk}
          status={error ? 'error' : ''}
          size="large"
        />
        {error && (
          <Text type="danger" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
            {error}
          </Text>
        )}
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          Spaces will be converted to underscores. Special characters are not allowed.
        </Text>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="primary" loading={loading} onClick={handleOk}>
          Create Folder
        </Button>
      </div>
    </Modal>
  )
}