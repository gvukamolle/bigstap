import type { Access } from 'payload'

type Role = 'admin' | 'editor'

type UserWithRole = {
  role?: Role | null
}

const hasRole = (user: unknown, roles: Role[]) => {
  if (!user || typeof user !== 'object' || !('role' in user)) {
    return false
  }

  return roles.includes((user as UserWithRole).role ?? 'editor')
}

export const anyone: Access = () => true

export const admins: Access = ({ req: { user } }) => hasRole(user, ['admin'])

export const adminsAndEditors: Access = ({ req: { user } }) =>
  hasRole(user, ['admin', 'editor'])
