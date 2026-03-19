import {
  type User,
  type InsertUser,
  type Group,
  type InsertGroup,
  type CensusEntry,
  type InsertCensusEntry,
  users,
  groups,
  censusEntries,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMagicToken(token: string): Promise<User | undefined>;
  createUser(user: Partial<InsertUser> & { fullName: string; email: string; magicToken?: string; magicTokenExpiry?: Date }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  getGroupsByUserId(userId: string): Promise<Group[]>;
  getAllGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, data: Partial<Group>): Promise<Group | undefined>;

  getCensusByGroupId(groupId: string): Promise<CensusEntry[]>;
  createCensusEntries(entries: InsertCensusEntry[]): Promise<CensusEntry[]>;
  deleteGroup(id: string): Promise<void>;
  deleteCensusByGroupId(groupId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByMagicToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.magicToken, token));
    return user;
  }

  async createUser(user: Partial<InsertUser> & { fullName: string; email: string; magicToken?: string; magicTokenExpiry?: Date }): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getGroupsByUserId(userId: string): Promise<Group[]> {
    console.log(`🔍 getGroupsByUserId called with userId: ${userId}`);
    const result = await db.select().from(groups).where(eq(groups.userId, userId)).orderBy(desc(groups.submittedAt));
    console.log(`🔍 Query returned ${result.length} groups`);
    if (result.length > 0) {
      console.log(`🔍 First group details:`, { id: result[0].id, userId: result[0].userId, companyName: result[0].companyName });
    }
    return result;
  }

  async getAllGroups(): Promise<Group[]> {
    return db.select().from(groups).orderBy(desc(groups.submittedAt));
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [created] = await db.insert(groups).values(group).returning();
    return created;
  }

  async updateGroup(id: string, data: Partial<Group>): Promise<Group | undefined> {
    const [updated] = await db
      .update(groups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(groups.id, id))
      .returning();
    return updated;
  }

  async getCensusByGroupId(groupId: string): Promise<CensusEntry[]> {
    return db.select().from(censusEntries).where(eq(censusEntries.groupId, groupId));
  }

  async createCensusEntries(entries: InsertCensusEntry[]): Promise<CensusEntry[]> {
    if (entries.length === 0) return [];
    return db.insert(censusEntries).values(entries).returning();
  }

  async deleteGroup(id: string): Promise<void> {
    await db.delete(groups).where(eq(groups.id, id));
  }

  async deleteCensusByGroupId(groupId: string): Promise<void> {
    await db.delete(censusEntries).where(eq(censusEntries.groupId, groupId));
  }
}

export const storage = new DatabaseStorage();
