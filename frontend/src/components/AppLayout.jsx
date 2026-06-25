import { Layout, Typography, Avatar, Dropdown } from 'antd'
import { Outlet, useNavigate } from 'react-router-dom'
import { FolderOutlined, UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

const { Header, Content } = Layout
const { Text } = Typography

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const userMenu = {
    items: [
      {
        key: 'email',
        label: <Text type="secondary">{user?.email}</Text>,
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        onClick: async () => {
          await logout()
          navigate('/login')
        },
      },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#001529',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <FolderOutlined style={{ fontSize: 22, color: '#1677ff' }} />
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px' }}>
            Storage Manager
          </Text>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <NotificationBell />
          <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar
                size={32}
                icon={<UserOutlined />}
                style={{ background: '#1677ff' }}
              />
              <Text style={{ color: '#fff', maxWidth: 140 }} ellipsis>
                {user?.full_name || user?.email}
              </Text>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Content>
        <Outlet />
      </Content>
    </Layout>
  )
}