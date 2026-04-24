import {
  type User,
  type InsertUser,
  type Group,
  type InsertGroup,
  type CensusEntry,
  type InsertCensusEntry,
  type Proposal,
  type ChatMessage,
  type ChatRule,
  type ChatRuleInput,
  users,
  groups,
  censusEntries,
  proposals,
  chatMessages,
  chatRules,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql } from "drizzle-orm";

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

  getProposalsByGroupId(groupId: string): Promise<Proposal[]>;
  getProposal(id: string): Promise<Proposal | undefined>;
  createProposal(data: { groupId: string; pdfPath: string; pdfBase64?: string; fileName: string; ratesData?: any }): Promise<Proposal>;
  deleteProposalsByGroupId(groupId: string): Promise<void>;

  // Chat
  createChatMessage(msg: { conversationId: string; userId: string; groupId?: string | null; role: "user" | "assistant"; content: string }): Promise<ChatMessage>;
  listConversations(limit?: number): Promise<Array<{
    conversationId: string;
    userId: string;
    groupId: string | null;
    messageCount: number;
    firstAt: Date;
    lastAt: Date;
    firstUserMessage: string | null;
  }>>;
  getConversationMessages(conversationId: string): Promise<ChatMessage[]>;

  listChatRules(enabledOnly?: boolean): Promise<ChatRule[]>;
  getChatRule(id: string): Promise<ChatRule | undefined>;
  createChatRule(input: ChatRuleInput & { createdBy?: string | null }): Promise<ChatRule>;
  updateChatRule(id: string, input: Partial<ChatRuleInput>): Promise<ChatRule | undefined>;
  deleteChatRule(id: string): Promise<void>;
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

  async getProposalsByGroupId(groupId: string): Promise<Proposal[]> {
    return db.select().from(proposals).where(eq(proposals.groupId, groupId)).orderBy(desc(proposals.createdAt));
  }

  async getProposal(id: string): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal;
  }

  async createProposal(data: { groupId: string; pdfPath: string; pdfBase64?: string; fileName: string; ratesData?: any }): Promise<Proposal> {
    const [created] = await db.insert(proposals).values(data).returning();
    return created;
  }

  async deleteProposalsByGroupId(groupId: string): Promise<void> {
    await db.delete(proposals).where(eq(proposals.groupId, groupId));
  }

  // ── Chat ────────────────────────────────────────────────────────────

  async createChatMessage(msg: {
    conversationId: string;
    userId: string;
    groupId?: string | null;
    role: "user" | "assistant";
    content: string;
  }): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values({
      conversationId: msg.conversationId,
      userId: msg.userId,
      groupId: msg.groupId ?? null,
      role: msg.role,
      content: msg.content,
    }).returning();
    return created;
  }

  async listConversations(limit = 200): Promise<Array<{
    conversationId: string;
    userId: string;
    groupId: string | null;
    messageCount: number;
    firstAt: Date;
    lastAt: Date;
    firstUserMessage: string | null;
  }>> {
    // One row per conversationId. Picks the earliest userId + groupId
    // per conversation (all turns share them anyway) and summarises the
    // message count and date range. The firstUserMessage subquery grabs
    // the first user prompt so the admin list has something previewable.
    const rows = await db.execute<{
      conversation_id: string;
      user_id: string;
      group_id: string | null;
      message_count: number;
      first_at: Date;
      last_at: Date;
      first_user_message: string | null;
    }>(sql`
      SELECT
        c.conversation_id,
        MIN(c.user_id)                                       AS user_id,
        MIN(c.group_id)                                      AS group_id,
        COUNT(*)::int                                        AS message_count,
        MIN(c.created_at)                                    AS first_at,
        MAX(c.created_at)                                    AS last_at,
        (
          SELECT content FROM ${chatMessages} m2
          WHERE m2.conversation_id = c.conversation_id AND m2.role = 'user'
          ORDER BY m2.created_at ASC
          LIMIT 1
        ) AS first_user_message
      FROM ${chatMessages} c
      GROUP BY c.conversation_id
      ORDER BY last_at DESC
      LIMIT ${limit}
    `);
    return rows.rows.map((r) => ({
      conversationId: r.conversation_id,
      userId: r.user_id,
      groupId: r.group_id,
      messageCount: Number(r.message_count),
      firstAt: r.first_at,
      lastAt: r.last_at,
      firstUserMessage: r.first_user_message,
    }));
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(asc(chatMessages.createdAt));
  }

  async listChatRules(enabledOnly = false): Promise<ChatRule[]> {
    const q = db.select().from(chatRules).orderBy(asc(chatRules.createdAt));
    if (enabledOnly) {
      return db.select().from(chatRules).where(eq(chatRules.enabled, true)).orderBy(asc(chatRules.createdAt));
    }
    return q;
  }

  async getChatRule(id: string): Promise<ChatRule | undefined> {
    const [r] = await db.select().from(chatRules).where(eq(chatRules.id, id));
    return r;
  }

  async createChatRule(input: ChatRuleInput & { createdBy?: string | null }): Promise<ChatRule> {
    const [created] = await db.insert(chatRules).values({
      label: input.label,
      content: input.content,
      enabled: input.enabled ?? true,
      createdBy: input.createdBy ?? null,
    }).returning();
    return created;
  }

  async updateChatRule(id: string, input: Partial<ChatRuleInput>): Promise<ChatRule | undefined> {
    const [updated] = await db
      .update(chatRules)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(chatRules.id, id))
      .returning();
    return updated;
  }

  async deleteChatRule(id: string): Promise<void> {
    await db.delete(chatRules).where(eq(chatRules.id, id));
  }
}

export const storage = new DatabaseStorage();
