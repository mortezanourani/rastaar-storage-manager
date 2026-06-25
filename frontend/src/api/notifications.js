import client from './client'

export const getNotifications = ()    => client.get('notifications')
export const getUnreadCount   = ()    => client.get('notifications/count')
export const markRead         = (id)  => client.patch(`notifications/${id}/read`)
export const markAllRead      = ()    => client.patch('notifications/mark-all-read')