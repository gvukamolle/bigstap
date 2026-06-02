export type SeedAdminCredentials = {
  email: string
  password: string
  username: string
}

export function getSeedAdminCredentials(env: NodeJS.ProcessEnv = process.env): SeedAdminCredentials {
  const username = env.PAYLOAD_SEED_ADMIN_USERNAME?.trim()
  const password = env.PAYLOAD_SEED_ADMIN_PASSWORD

  if (!username || !password) {
    throw new Error('Set PAYLOAD_SEED_ADMIN_USERNAME and PAYLOAD_SEED_ADMIN_PASSWORD.')
  }

  const email = env.PAYLOAD_SEED_ADMIN_EMAIL?.trim() || `${username}@bigstep.local`

  return {
    email,
    password,
    username
  }
}
