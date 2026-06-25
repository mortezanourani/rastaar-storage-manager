import { useState, useEffect } from 'react'
import { Badge, Dropdown, List, Typography, Button, Empty, Spin } from 'antd'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { getNotifications, getUnreadCount, markRead, markAllRead } from '../api/notifications'

const { Text } = Typography

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [loading,       setLoading]       = useState(false)
  const [open,          setOpen]          = useState(false)

  // Poll for unread count every 30 seconds
  useEffect(() => {
    fetchCount()
    const timer = setInterval(fetchCount, 30_000)
    return () => clearInterval(timer)
  }, [])

  const fetchCount = async () => {
    try {
      const res = await getUnreadCount()
      setUnreadCount(res.data.count)
    } catch {}
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await getNotifications()
      setNotifications(res.data)
    } catch {} finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (visible) => {
    setOpen(visible)
    if (visible) fetchNotifications()
  }

  const handleMarkRead = async (id) => {
    await markRead(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const panel = (
    <div style={{
      width: 360, background: '#fff',
      borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
      }}>
        <Text strong>Notifications</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
      ) : notifications.length === 0 ? (
        <Empty description="You have no notifications" style={{ padding: 32 }} />
      ) : (
        <List
          style={{ maxHeight: 400, overflowY: 'auto' }}
          dataSource={notifications}
          renderItem={(n) => (
            <List.Item
              style={{
                padding: '12px 16px',
                background: n.is_read ? '#fff' : '#e6f4ff',
                cursor: n.is_read ? 'default' : 'pointer',
                transition: 'background .2s',
              }}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
            >
              <div>
                <Text>
                  <Text strong>{n.mentioned_by_name || n.mentioned_by_email}</Text>
                  {' mentioned you in '}
                  <Text strong>{n.file_display_name}</Text>
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {n.project_name} · {new Date(n.created_at).toLocaleDateString()}
                </Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  )

  return (
    <Dropdown
      open={open}
      onOpenChange={handleOpenChange}
      dropdownRender={() => panel}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <BellOutlined style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }} />
      </Badge>
    </Dropdown>
  )
}