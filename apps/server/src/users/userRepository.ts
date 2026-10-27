import type { PrismaClient } from "@prisma/client"
import { Prisma } from "@prisma/client"

export interface UserRecord {
  id: string
  username: string
  provider: string
  providerUid: string
}

export interface NewUser {
  username: string
  provider: string
  providerUid: string
}

export class UsernameTakenError extends Error {
  constructor() {
    super("USERNAME_TAKEN")
  }
}

export interface UserRepository {
  usernameTaken(username: string): Promise<boolean>
  findByIdentity(provider: string, providerUid: string): Promise<UserRecord | null>
  createUser(user: NewUser): Promise<UserRecord>
  deleteUser(userId: string): Promise<void>
}

/* Usernames are unique ignoring case (spec S5: "unique"). */
export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    async usernameTaken(username) {
      const found = await prisma.user.findFirst({
        where: { username: { equals: username, mode: "insensitive" } },
        select: { id: true },
      })
      return found !== null
    },
    async findByIdentity(provider, providerUid) {
      const row = await prisma.authMethod.findUnique({
        where: { provider_providerUid: { provider, providerUid } },
        include: { user: true },
      })
      return row ? { id: row.user.id, username: row.user.username, provider, providerUid } : null
    },
    async deleteUser(userId) {
      await prisma.user.delete({ where: { id: userId } })
    },
    async createUser(user) {
      try {
        const created = await prisma.user.create({
          data: { username: user.username, authMethods: { create: { provider: user.provider, providerUid: user.providerUid } } },
        })
        return { id: created.id, username: created.username, provider: user.provider, providerUid: user.providerUid }
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new UsernameTakenError()
        }
        throw error
      }
    },
  }
}

export function createMemoryUserRepository(): UserRepository {
  const users: UserRecord[] = []
  let nextId = 1
  return {
    usernameTaken(username) {
      return Promise.resolve(users.some((user) => user.username.toLowerCase() === username.toLowerCase()))
    },
    findByIdentity(provider, providerUid) {
      return Promise.resolve(users.find((user) => user.provider === provider && user.providerUid === providerUid) ?? null)
    },
    deleteUser(userId) {
      const index = users.findIndex((user) => user.id === userId)
      if (index !== -1) users.splice(index, 1)
      return Promise.resolve()
    },
    createUser(user) {
      if (users.some((existing) => existing.username.toLowerCase() === user.username.toLowerCase())) {
        return Promise.reject(new UsernameTakenError())
      }
      const record: UserRecord = { id: String(nextId++), ...user }
      users.push(record)
      return Promise.resolve(record)
    },
  }
}
