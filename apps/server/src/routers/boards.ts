import { z } from 'zod';
import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import { boardService } from '@/services/board-service';
import { requirePermission } from '@/lib/middleware/permission';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Board schemas
const createBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['scrum', 'kanban']),
  projectId: z.string().uuid(),
  filterJql: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  createDefaultColumns: z.boolean().optional().default(true),
});

const updateBoardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  filterJql: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const boardIdSchema = z.object({
  id: z.string().uuid(),
});

const projectIdSchema = z.object({
  projectId: z.string().uuid(),
});

// Column schemas
const createColumnSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(255),
  statusIds: z.array(z.string().uuid()).optional().default([]),
  position: z.number().int().min(0).optional(),
  minIssues: z.number().int().min(0).optional(),
  maxIssues: z.number().int().min(0).optional(),
  constraintType: z.enum(['none', 'warn', 'block']).optional(),
  color: z.string().optional(),
});

const updateColumnSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  statusIds: z.array(z.string().uuid()).optional(),
  minIssues: z.number().int().min(0).optional().nullable(),
  maxIssues: z.number().int().min(0).optional().nullable(),
  constraintType: z.enum(['none', 'warn', 'block']).optional(),
  color: z.string().optional().nullable(),
});

const reorderColumnsSchema = z.object({
  boardId: z.string().uuid(),
  columnOrder: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

// Swimlane schemas
const setSwimlaneSchema = z.object({
  boardId: z.string().uuid(),
  type: z.enum([
    'none',
    'assignee',
    'epic',
    'parent',
    'priority',
    'custom_field',
  ]),
  customFieldId: z.string().uuid().optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// Quick filter schemas
const createQuickFilterSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(255),
  jql: z.string().min(1),
  position: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

const updateQuickFilterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  jql: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

const reorderQuickFiltersSchema = z.object({
  boardId: z.string().uuid(),
  filterOrder: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

// Card layout schemas
const setCardLayoutSchema = z.object({
  boardId: z.string().uuid(),
  cardColorFieldId: z.string().uuid().optional().nullable(),
  cardColorMapping: z.record(z.string(), z.string()).optional(),
  visibleFields: z.array(z.string().uuid()).optional(),
  showAvatar: z.boolean().optional(),
  showPriority: z.boolean().optional(),
  showIssueType: z.boolean().optional(),
  showLabels: z.boolean().optional(),
  showDueDate: z.boolean().optional(),
  showEstimate: z.boolean().optional(),
  cardSize: z.enum(['compact', 'medium', 'detailed']).optional(),
});

// User settings schemas
const setUserSettingsSchema = z.object({
  boardId: z.string().uuid(),
  collapsedSwimlanes: z.array(z.string()).optional(),
  activeQuickFilters: z.array(z.string().uuid()).optional(),
  collapsedColumns: z.array(z.string().uuid()).optional(),
});

// Board data schema
const getBoardDataSchema = z.object({
  boardId: z.string().uuid(),
  sprintId: z.string().uuid().optional(),
  quickFilterIds: z.array(z.string().uuid()).optional(),
});

// Clone schema
const cloneBoardSchema = z.object({
  sourceId: z.string().uuid(),
  newName: z.string().min(1).max(255),
});

// =============================================================================
// BOARDS ROUTER
// =============================================================================

export const boardsRouter = router({
  // ---------------------------------------------------------------------------
  // BOARDS
  // ---------------------------------------------------------------------------

  /**
   * Get all boards
   */
  getBoards: protectedProcedure
    .use(requirePermission('board:view'))
    .query(async () => {
      const data = await boardService.getAllBoards();
      return successResponse(data, 'Boardlar başarıyla getirildi');
    }),

  /**
   * Get boards by project
   */
  getBoardsByProject: protectedProcedure
    .input(projectIdSchema)
    .use(requirePermission('board:view'))
    .query(async ({ input }) => {
      const data = await boardService.getBoardsByProject(input.projectId);
      return successResponse(data, 'Proje boardları başarıyla getirildi');
    }),

  /**
   * Get a board by ID
   */
  getBoardById: protectedProcedure
    .input(boardIdSchema)
    .use(requirePermission('board:view'))
    .query(async ({ input }) => {
      const data = await boardService.getBoard(input.id);
      return successResponse(data, 'Board başarıyla getirildi');
    }),

  /**
   * Get board with full structure
   */
  getBoardWithStructure: protectedProcedure
    .input(boardIdSchema)
    .use(requirePermission('board:view'))
    .query(async ({ input }) => {
      const data = await boardService.getBoardWithStructure(input.id);
      return successResponse(data, 'Board yapısı başarıyla getirildi');
    }),

  /**
   * Get default board for a project
   */
  getDefaultBoard: protectedProcedure
    .input(projectIdSchema)
    .use(requirePermission('board:view'))
    .query(async ({ input }) => {
      const data = await boardService.getDefaultBoardByProject(input.projectId);
      return successResponse(data, 'Varsayılan board başarıyla getirildi');
    }),

  /**
   * Get recent boards for current user
   */
  getRecentBoards: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).optional() }))
    .use(requirePermission('board:view'))
    .query(async ({ ctx, input }) => {
      const data = await boardService.getRecentBoards(
        ctx.session!.user.id,
        input.limit,
      );
      return successResponse(data, 'Son boardlar başarıyla getirildi');
    }),

  /**
   * Create a new board
   */
  createBoard: protectedProcedure
    .input(createBoardSchema)
    .use(requirePermission('board:create'))
    .mutation(async ({ ctx, input }) => {
      const data = await boardService.createBoard({
        ...input,
        ownerId: ctx.session!.user.id,
      });
      return successResponse(data, 'Board başarıyla oluşturuldu');
    }),

  /**
   * Update a board
   */
  updateBoard: protectedProcedure
    .input(updateBoardSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await boardService.updateBoard(id, updateData);
      return successResponse(data, 'Board başarıyla güncellendi');
    }),

  /**
   * Delete a board
   */
  deleteBoard: protectedProcedure
    .input(boardIdSchema)
    .use(requirePermission('board:delete'))
    .mutation(async ({ input }) => {
      await boardService.deleteBoard(input.id);
      return successResponse(null, 'Board başarıyla silindi');
    }),

  /**
   * Set default board for a project
   */
  setDefaultBoard: protectedProcedure
    .input(boardIdSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      await boardService.setDefaultBoard(input.id);
      return successResponse(null, 'Varsayılan board başarıyla ayarlandı');
    }),

  /**
   * Clone a board
   */
  cloneBoard: protectedProcedure
    .input(cloneBoardSchema)
    .use(requirePermission('board:create'))
    .mutation(async ({ input }) => {
      const data = await boardService.cloneBoard(input.sourceId, input.newName);
      return successResponse(data, 'Board başarıyla klonlandı');
    }),

  // ---------------------------------------------------------------------------
  // COLUMNS
  // ---------------------------------------------------------------------------

  /**
   * Get columns for a board
   */
  getColumns: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .use(requirePermission('board:view'))
    .query(async ({ input }) => {
      const data = await boardService.getColumnsByBoard(input.boardId);
      return successResponse(data, 'Sütunlar başarıyla getirildi');
    }),

  /**
   * Create a new column
   */
  createColumn: protectedProcedure
    .input(createColumnSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      const data = await boardService.createColumn(input);
      return successResponse(data, 'Sütun başarıyla oluşturuldu');
    }),

  /**
   * Update a column
   */
  updateColumn: protectedProcedure
    .input(updateColumnSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await boardService.updateColumn(id, updateData);
      return successResponse(data, 'Sütun başarıyla güncellendi');
    }),

  /**
   * Delete a column
   */
  deleteColumn: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      await boardService.deleteColumn(input.id);
      return successResponse(null, 'Sütun başarıyla silindi');
    }),

  /**
   * Reorder columns
   */
  reorderColumns: protectedProcedure
    .input(reorderColumnsSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      await boardService.reorderColumns(input.boardId, input.columnOrder);
      return successResponse(null, 'Sütunlar başarıyla sıralandı');
    }),

  // ---------------------------------------------------------------------------
  // SWIMLANES
  // ---------------------------------------------------------------------------

  /**
   * Get swimlane for a board
   */
  getSwimlane: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .use(requirePermission('board:view'))
    .query(async ({ input }) => {
      const data = await boardService.getSwimlane(input.boardId);
      return successResponse(data, 'Swimlane başarıyla getirildi');
    }),

  /**
   * Set swimlane for a board
   */
  setSwimlane: protectedProcedure
    .input(setSwimlaneSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      const { boardId, ...swimlaneData } = input;
      const data = await boardService.setSwimlane(boardId, swimlaneData);
      return successResponse(data, 'Swimlane başarıyla ayarlandı');
    }),

  /**
   * Remove swimlane from a board
   */
  removeSwimlane: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      await boardService.removeSwimlane(input.boardId);
      return successResponse(null, 'Swimlane başarıyla kaldırıldı');
    }),

  // ---------------------------------------------------------------------------
  // QUICK FILTERS
  // ---------------------------------------------------------------------------

  /**
   * Get quick filters for a board
   */
  getQuickFilters: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .use(requirePermission('board:view'))
    .query(async ({ input }) => {
      const data = await boardService.getQuickFiltersByBoard(input.boardId);
      return successResponse(data, 'Hızlı filtreler başarıyla getirildi');
    }),

  /**
   * Create a new quick filter
   */
  createQuickFilter: protectedProcedure
    .input(createQuickFilterSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      const data = await boardService.createQuickFilter(input);
      return successResponse(data, 'Hızlı filtre başarıyla oluşturuldu');
    }),

  /**
   * Update a quick filter
   */
  updateQuickFilter: protectedProcedure
    .input(updateQuickFilterSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await boardService.updateQuickFilter(id, updateData);
      return successResponse(data, 'Hızlı filtre başarıyla güncellendi');
    }),

  /**
   * Delete a quick filter
   */
  deleteQuickFilter: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      await boardService.deleteQuickFilter(input.id);
      return successResponse(null, 'Hızlı filtre başarıyla silindi');
    }),

  /**
   * Reorder quick filters
   */
  reorderQuickFilters: protectedProcedure
    .input(reorderQuickFiltersSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      await boardService.reorderQuickFilters(input.boardId, input.filterOrder);
      return successResponse(null, 'Hızlı filtreler başarıyla sıralandı');
    }),

  // ---------------------------------------------------------------------------
  // CARD LAYOUT
  // ---------------------------------------------------------------------------

  /**
   * Get card layout for a board
   */
  getCardLayout: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .use(requirePermission('board:view'))
    .query(async ({ input }) => {
      const data = await boardService.getCardLayout(input.boardId);
      return successResponse(data, 'Kart görünümü başarıyla getirildi');
    }),

  /**
   * Set card layout for a board
   */
  setCardLayout: protectedProcedure
    .input(setCardLayoutSchema)
    .use(requirePermission('board:edit'))
    .mutation(async ({ input }) => {
      const { boardId, ...layoutData } = input;
      const data = await boardService.setCardLayout(boardId, layoutData);
      return successResponse(data, 'Kart görünümü başarıyla ayarlandı');
    }),

  // ---------------------------------------------------------------------------
  // USER SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Get user settings for a board
   */
  getUserSettings: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .use(requirePermission('board:view'))
    .query(async ({ ctx, input }) => {
      const data = await boardService.getUserSettings(
        input.boardId,
        ctx.session!.user.id,
      );
      return successResponse(data, 'Kullanıcı ayarları başarıyla getirildi');
    }),

  /**
   * Set user settings for a board
   */
  setUserSettings: protectedProcedure
    .input(setUserSettingsSchema)
    .use(requirePermission('board:view'))
    .mutation(async ({ ctx, input }) => {
      const { boardId, ...settingsData } = input;
      const data = await boardService.setUserSettings(
        boardId,
        ctx.session!.user.id,
        settingsData,
      );
      return successResponse(data, 'Kullanıcı ayarları başarıyla kaydedildi');
    }),

  // ---------------------------------------------------------------------------
  // BOARD DATA
  // ---------------------------------------------------------------------------

  /**
   * Get full board data for rendering
   */
  getBoardData: protectedProcedure
    .input(getBoardDataSchema)
    .use(requirePermission('board:view'))
    .query(async ({ ctx, input }) => {
      const data = await boardService.getBoardData(
        input.boardId,
        ctx.session!.user.id,
        {
          sprintId: input.sprintId,
          quickFilterIds: input.quickFilterIds,
        },
      );
      return successResponse(data, 'Board verileri başarıyla getirildi');
    }),
});
