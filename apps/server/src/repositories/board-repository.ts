import { eq, and, asc, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  boards,
  boardColumns,
  boardSwimlanes,
  boardQuickFilters,
  boardCardLayouts,
  boardUserSettings,
  type Board,
  type NewBoard,
  type BoardColumn,
  type NewBoardColumn,
  type BoardSwimlane,
  type NewBoardSwimlane,
  type BoardQuickFilter,
  type NewBoardQuickFilter,
  type BoardCardLayout,
  type NewBoardCardLayout,
  type BoardUserSettings,
  type NewBoardUserSettings,
} from '@/db/schema/boards';
import { projects } from '@/db/schema/projects';
import { user } from '@/db/schema/auth';

// =============================================================================
// BOARD REPOSITORY
// =============================================================================

export class BoardRepository {
  // ---------------------------------------------------------------------------
  // BOARDS
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<Board | null> {
    const result = await db
      .select()
      .from(boards)
      .where(eq(boards.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findByProjectId(projectId: string): Promise<Board[]> {
    return await db
      .select()
      .from(boards)
      .where(eq(boards.projectId, projectId))
      .orderBy(asc(boards.name));
  }

  async findDefaultByProjectId(projectId: string): Promise<Board | null> {
    const result = await db
      .select()
      .from(boards)
      .where(and(eq(boards.projectId, projectId), eq(boards.isDefault, true)))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll(): Promise<Board[]> {
    return await db.select().from(boards).orderBy(asc(boards.name));
  }

  async findByOwner(ownerId: string): Promise<Board[]> {
    return await db
      .select()
      .from(boards)
      .where(eq(boards.ownerId, ownerId))
      .orderBy(desc(boards.updatedAt));
  }

  async create(data: NewBoard): Promise<Board> {
    const [result] = await db.insert(boards).values(data).returning();
    return result;
  }

  async update(
    id: string,
    data: Partial<Omit<NewBoard, 'id'>>,
  ): Promise<Board> {
    const [result] = await db
      .update(boards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(boards.id, id))
      .returning();
    return result;
  }

  async delete(id: string): Promise<void> {
    await db.delete(boards).where(eq(boards.id, id));
  }

  async setDefault(id: string, projectId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Clear existing default for project
      await tx
        .update(boards)
        .set({ isDefault: false })
        .where(
          and(eq(boards.projectId, projectId), eq(boards.isDefault, true)),
        );
      // Set new default
      await tx.update(boards).set({ isDefault: true }).where(eq(boards.id, id));
    });
  }

  // ---------------------------------------------------------------------------
  // BOARD WITH FULL STRUCTURE
  // ---------------------------------------------------------------------------

  async findWithStructure(id: string): Promise<{
    board: Board;
    columns: BoardColumn[];
    swimlane: BoardSwimlane | null;
    quickFilters: BoardQuickFilter[];
    cardLayout: BoardCardLayout | null;
  } | null> {
    const board = await this.findById(id);
    if (!board) return null;

    const [columns, swimlanes, quickFilters, cardLayouts] = await Promise.all([
      this.findColumnsByBoardId(id),
      this.findSwimlaneByBoardId(id),
      this.findQuickFiltersByBoardId(id),
      this.findCardLayoutByBoardId(id),
    ]);

    return {
      board,
      columns,
      swimlane: swimlanes,
      quickFilters,
      cardLayout: cardLayouts,
    };
  }

  // ---------------------------------------------------------------------------
  // COLUMNS
  // ---------------------------------------------------------------------------

  async findColumnById(id: string): Promise<BoardColumn | null> {
    const result = await db
      .select()
      .from(boardColumns)
      .where(eq(boardColumns.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findColumnsByBoardId(boardId: string): Promise<BoardColumn[]> {
    return await db
      .select()
      .from(boardColumns)
      .where(eq(boardColumns.boardId, boardId))
      .orderBy(asc(boardColumns.position));
  }

  async createColumn(data: NewBoardColumn): Promise<BoardColumn> {
    const [result] = await db.insert(boardColumns).values(data).returning();
    return result;
  }

  async updateColumn(
    id: string,
    data: Partial<Omit<NewBoardColumn, 'id'>>,
  ): Promise<BoardColumn> {
    const [result] = await db
      .update(boardColumns)
      .set(data)
      .where(eq(boardColumns.id, id))
      .returning();
    return result;
  }

  async deleteColumn(id: string): Promise<void> {
    await db.delete(boardColumns).where(eq(boardColumns.id, id));
  }

  async reorderColumns(
    boardId: string,
    columnOrder: Array<{ id: string; position: number }>,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const { id, position } of columnOrder) {
        await tx
          .update(boardColumns)
          .set({ position })
          .where(
            and(eq(boardColumns.id, id), eq(boardColumns.boardId, boardId)),
          );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // SWIMLANES
  // ---------------------------------------------------------------------------

  async findSwimlaneByBoardId(boardId: string): Promise<BoardSwimlane | null> {
    const result = await db
      .select()
      .from(boardSwimlanes)
      .where(eq(boardSwimlanes.boardId, boardId))
      .limit(1);
    return result[0] ?? null;
  }

  async createSwimlane(data: NewBoardSwimlane): Promise<BoardSwimlane> {
    const [result] = await db.insert(boardSwimlanes).values(data).returning();
    return result;
  }

  async updateSwimlane(
    id: string,
    data: Partial<Omit<NewBoardSwimlane, 'id'>>,
  ): Promise<BoardSwimlane> {
    const [result] = await db
      .update(boardSwimlanes)
      .set(data)
      .where(eq(boardSwimlanes.id, id))
      .returning();
    return result;
  }

  async deleteSwimlane(boardId: string): Promise<void> {
    await db.delete(boardSwimlanes).where(eq(boardSwimlanes.boardId, boardId));
  }

  async upsertSwimlane(
    boardId: string,
    data: Omit<NewBoardSwimlane, 'boardId'>,
  ): Promise<BoardSwimlane> {
    const existing = await this.findSwimlaneByBoardId(boardId);
    if (existing) {
      return await this.updateSwimlane(existing.id, data);
    }
    return await this.createSwimlane({ ...data, boardId });
  }

  // ---------------------------------------------------------------------------
  // QUICK FILTERS
  // ---------------------------------------------------------------------------

  async findQuickFilterById(id: string): Promise<BoardQuickFilter | null> {
    const result = await db
      .select()
      .from(boardQuickFilters)
      .where(eq(boardQuickFilters.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findQuickFiltersByBoardId(
    boardId: string,
  ): Promise<BoardQuickFilter[]> {
    return await db
      .select()
      .from(boardQuickFilters)
      .where(eq(boardQuickFilters.boardId, boardId))
      .orderBy(asc(boardQuickFilters.position));
  }

  async createQuickFilter(
    data: NewBoardQuickFilter,
  ): Promise<BoardQuickFilter> {
    const [result] = await db
      .insert(boardQuickFilters)
      .values(data)
      .returning();
    return result;
  }

  async updateQuickFilter(
    id: string,
    data: Partial<Omit<NewBoardQuickFilter, 'id'>>,
  ): Promise<BoardQuickFilter> {
    const [result] = await db
      .update(boardQuickFilters)
      .set(data)
      .where(eq(boardQuickFilters.id, id))
      .returning();
    return result;
  }

  async deleteQuickFilter(id: string): Promise<void> {
    await db.delete(boardQuickFilters).where(eq(boardQuickFilters.id, id));
  }

  async reorderQuickFilters(
    boardId: string,
    filterOrder: Array<{ id: string; position: number }>,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const { id, position } of filterOrder) {
        await tx
          .update(boardQuickFilters)
          .set({ position })
          .where(
            and(
              eq(boardQuickFilters.id, id),
              eq(boardQuickFilters.boardId, boardId),
            ),
          );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // CARD LAYOUT
  // ---------------------------------------------------------------------------

  async findCardLayoutByBoardId(
    boardId: string,
  ): Promise<BoardCardLayout | null> {
    const result = await db
      .select()
      .from(boardCardLayouts)
      .where(eq(boardCardLayouts.boardId, boardId))
      .limit(1);
    return result[0] ?? null;
  }

  async createCardLayout(data: NewBoardCardLayout): Promise<BoardCardLayout> {
    const [result] = await db.insert(boardCardLayouts).values(data).returning();
    return result;
  }

  async updateCardLayout(
    id: string,
    data: Partial<Omit<NewBoardCardLayout, 'id'>>,
  ): Promise<BoardCardLayout> {
    const [result] = await db
      .update(boardCardLayouts)
      .set(data)
      .where(eq(boardCardLayouts.id, id))
      .returning();
    return result;
  }

  async upsertCardLayout(
    boardId: string,
    data: Omit<NewBoardCardLayout, 'boardId'>,
  ): Promise<BoardCardLayout> {
    const existing = await this.findCardLayoutByBoardId(boardId);
    if (existing) {
      return await this.updateCardLayout(existing.id, data);
    }
    return await this.createCardLayout({ ...data, boardId });
  }

  // ---------------------------------------------------------------------------
  // USER SETTINGS
  // ---------------------------------------------------------------------------

  async findUserSettings(
    boardId: string,
    userId: string,
  ): Promise<BoardUserSettings | null> {
    const result = await db
      .select()
      .from(boardUserSettings)
      .where(
        and(
          eq(boardUserSettings.boardId, boardId),
          eq(boardUserSettings.userId, userId),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async createUserSettings(
    data: NewBoardUserSettings,
  ): Promise<BoardUserSettings> {
    const [result] = await db
      .insert(boardUserSettings)
      .values(data)
      .returning();
    return result;
  }

  async updateUserSettings(
    id: string,
    data: Partial<Omit<NewBoardUserSettings, 'id'>>,
  ): Promise<BoardUserSettings> {
    const [result] = await db
      .update(boardUserSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(boardUserSettings.id, id))
      .returning();
    return result;
  }

  async upsertUserSettings(
    boardId: string,
    userId: string,
    data: Omit<NewBoardUserSettings, 'boardId' | 'userId'>,
  ): Promise<BoardUserSettings> {
    const existing = await this.findUserSettings(boardId, userId);
    if (existing) {
      return await this.updateUserSettings(existing.id, data);
    }
    return await this.createUserSettings({ ...data, boardId, userId });
  }

  async recordBoardView(boardId: string, userId: string): Promise<void> {
    const existing = await this.findUserSettings(boardId, userId);
    if (existing) {
      await this.updateUserSettings(existing.id, { lastViewedAt: new Date() });
    } else {
      await this.createUserSettings({
        boardId,
        userId,
        lastViewedAt: new Date(),
      });
    }
  }

  async getRecentBoardsForUser(
    userId: string,
    limit: number = 5,
  ): Promise<Board[]> {
    const settings = await db
      .select({
        boardId: boardUserSettings.boardId,
        lastViewedAt: boardUserSettings.lastViewedAt,
      })
      .from(boardUserSettings)
      .where(eq(boardUserSettings.userId, userId))
      .orderBy(desc(boardUserSettings.lastViewedAt))
      .limit(limit);

    if (settings.length === 0) return [];

    const boardIds = settings.map((s) => s.boardId);
    const recentBoards = await db
      .select()
      .from(boards)
      .where(inArray(boards.id, boardIds));

    // Preserve order from settings
    return boardIds
      .map((id) => recentBoards.find((b) => b.id === id))
      .filter((b): b is Board => b !== undefined);
  }
}

export const boardRepository = new BoardRepository();
