import type { Access, Where } from 'payload'

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

export const isStaff = (user: unknown) => hasRole(user, ['admin', 'editor'])

export const admins: Access = ({ req: { user } }) => hasRole(user, ['admin'])

export const adminsAndEditors: Access = ({ req: { user } }) =>
  isStaff(user)

export const staffOrPublished: Access = ({ req: { user } }) =>
  isStaff(user) ? true : { published: { equals: true } }

export const staffOrPublishedProduct: Access = ({ req: { user } }) => {
  if (isStaff(user)) {
    return true
  }

  const publicProductFilter: Where = {
    and: [
      { published: { equals: true } },
      { saleStatus: { not_equals: 'hidden' } }
    ]
  }

  return publicProductFilter
}
