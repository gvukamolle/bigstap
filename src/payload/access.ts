import type { Access } from 'payload'

type Role = 'admin' | 'editor'

type UserWithRole = {
  role?: Role | null
}

const hasRole = (user: unknown, roles: Role[]) => {
  if (!user || typeof user !== 'object' || !('role' in user)) {
    return false
  }

  const role = (user as UserWithRole).role

  return role === 'admin' || role === 'editor' ? roles.includes(role) : false
}

export const anyone: Access = () => true

export const admins: Access = ({ req: { user } }) => hasRole(user, ['admin'])

export const adminsAndEditors: Access = ({ req: { user } }) =>
  hasRole(user, ['admin', 'editor'])
