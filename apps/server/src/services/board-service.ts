import { boardRepository } from '@/repositories/board-repository';
import { projectRepository } from '@/repositories/project-repository';
import { IssueRepository } from '@/repositories/issue-repository';
import type {
  Board,
  NewBoard,
  BoardColumn,
  NewBoardColumn,
  BoardSwimlane,
  NewBoardSwimlane,
  BoardQuickFilter,
  NewBoardQuickFilter,
  BoardCardLayout,
  NewBoardCardLayout,
  BoardUserSettings,
  BoardType,
  SwimlaneType,
  BoardSettings,
} from '@/db/schema/boards';
import { throwNotFoundError, throwValidationError } from '@/lib/errors';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Board issue card for display
 */
export interface BoardIssueCard {
  id: string;
  key: string;
  summary: string;
  statusId: string;
  issueTypeId: string;
  issueTypeName: string;
  issueTypeIcon: string | null;
  priority: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  labels: string[];
  dueDate: Date | null;
  storyPoints: number | null;
  rank: string | null;
  parentId: string | null;
  parentKey: string | null;
  sprintId: string | null;
}

/**
 * Column with issue count and WIP status
 */
export interface BoardColumnWithStats extends BoardColumn {
  issueCount: number;
  isOverWipLimit: boolean;
  isUnderWipLimit: boolean;
}

/**
 * Swimlane group with issues
 */
export interface SwimlaneGroup {
  id: string;
  name: string;
  avatarUrl?: string;
  issueCount: number;
  issues: BoardIssueCard[];
}

/**
 * Full board data for rendering
 */
export interface BoardData {
  board: Board;
  columns: BoardColumnWithStats[];
  swimlane: BoardSwimlane | null;
  swimlaneGroups: SwimlaneGroup[];
  quickFilters: BoardQuickFilter[];
  cardLayout: BoardCardLayout | null;
  userSettings: BoardUserSettings | null;
  backlog?: BoardIssueCard[];
}

// =============================================================================
// BOARD SERVICE
// =============================================================================

export class BoardService {
  // ---------------------------------------------------------------------------
  // BOARDS CRUD
  // ---------------------------------------------------------------------------

  async getBoard(id: string): Promise<Board | null> {
    return await boardRepository.findById(id);
  }

  async getBoardsByProject(projectId: string): Promise<Board[]> {
    return await boardRepository.findByProjectId(projectId);
  }

  async getDefaultBoardByProject(projectId: string): Promise<Board | null> {
    return await boardRepository.findDefaultByProjectId(projectId);
  }

  async getAllBoards(): Promise<Board[]> {
    return await boardRepository.findAll();
  }

  async getBoardsByOwner(ownerId: string): Promise<Board[]> {
    return await boardRepository.findByOwner(ownerId);
  }

  async createBoard(
    data: Omit<NewBoard, 'id'> & { createDefaultColumns?: boolean },
  ): Promise<Board> {
    const { createDefaultColumns, ...boardData } = data;

    // Validate project exists
    const project = await projectRepository().findProjectById(
      boardData.projectId,
    );
    if (!project) {
      throwNotFoundError('PROJECT_NOT_FOUND', {
        projectId: boardData.projectId,
      });
    }

    // Create board
    const board = await boardRepository.create(boardData);

    // Create default columns if requested
    if (createDefaultColumns) {
      await this.createDefaultColumns(board.id, board.type as BoardType);
    }

    // Create default card layout
    await boardRepository.createCardLayout({
      boardId: board.id,
      showAvatar: true,
      showPriority: true,
      showIssueType: true,
    });

    return board;
  }

  async updateBoard(
    id: string,
    data: Partial<Omit<NewBoard, 'id'>>,
  ): Promise<Board> {
    const board = await boardRepository.findById(id);
    if (!board) {
      throwNotFoundError('BOARD_NOT_FOUND', { boardId: id });
    }
    return await boardRepository.update(id, data);
  }

  async deleteBoard(id: string): Promise<void> {
    const board = await boardRepository.findById(id);
    if (!board) {
      throwNotFoundError('BOARD_NOT_FOUND', { boardId: id });
    }
    await boardRepository.delete(id);
  }

  async setDefaultBoard(id: string): Promise<void> {
    const board = await boardRepository.findById(id);
    if (!board) {
      throwNotFoundError('BOARD_NOT_FOUND', { boardId: id });
    }
    await boardRepository.setDefault(id, board.projectId);
  }

  // ---------------------------------------------------------------------------
  // BOARD STRUCTURE
  // ---------------------------------------------------------------------------

  async getBoardWithStructure(id: string): Promise<{
    board: Board;
    columns: BoardColumn[];
    swimlane: BoardSwimlane | null;
    quickFilters: BoardQuickFilter[];
    cardLayout: BoardCardLayout | null;
  } | null> {
    return await boardRepository.findWithStructure(id);
  }

  /**
   * Clone a board with all its configuration
   */
  async cloneBoard(sourceId: string, newName: string): Promise<Board | null> {
    const source = await boardRepository.findWithStructure(sourceId);
    if (!source) return null;

    // Create new board
    const newBoard = await boardRepository.create({
      name: newName,
      description: source.board.description,
      type: source.board.type,
      projectId: source.board.projectId,
      filterJql: source.board.filterJql,
      settings: source.board.settings,
      ownerId: source.board.ownerId,
      isDefault: false,
    });

    // Clone columns
    for (const column of source.columns) {
      await boardRepository.createColumn({
        boardId: newBoard.id,
        name: column.name,
        statusIds: column.statusIds,
        position: column.position,
        minIssues: column.minIssues,
        maxIssues: column.maxIssues,
        constraintType: column.constraintType,
        color: column.color,
      });
    }

    // Clone swimlane
    if (source.swimlane) {
      await boardRepository.createSwimlane({
        boardId: newBoard.id,
        type: source.swimlane.type,
        customFieldId: source.swimlane.customFieldId,
        settings: source.swimlane.settings,
      });
    }

    // Clone quick filters
    for (const filter of source.quickFilters) {
      await boardRepository.createQuickFilter({
        boardId: newBoard.id,
        name: filter.name,
        jql: filter.jql,
        position: filter.position,
        isDefault: filter.isDefault,
      });
    }

    // Clone card layout
    if (source.cardLayout) {
      await boardRepository.createCardLayout({
        boardId: newBoard.id,
        cardColorFieldId: source.cardLayout.cardColorFieldId,
        cardColorMapping: source.cardLayout.cardColorMapping,
        visibleFields: source.cardLayout.visibleFields,
        showAvatar: source.cardLayout.showAvatar,
        showPriority: source.cardLayout.showPriority,
        showIssueType: source.cardLayout.showIssueType,
        showLabels: source.cardLayout.showLabels,
        showDueDate: source.cardLayout.showDueDate,
        showEstimate: source.cardLayout.showEstimate,
        cardSize: source.cardLayout.cardSize,
      });
    }

    return newBoard;
  }

  // ---------------------------------------------------------------------------
  // COLUMNS
  // ---------------------------------------------------------------------------

  async getColumn(id: string): Promise<BoardColumn | null> {
    return await boardRepository.findColumnById(id);
  }

  async getColumnsByBoard(boardId: string): Promise<BoardColumn[]> {
    return await boardRepository.findColumnsByBoardId(boardId);
  }

  async createColumn(data: Omit<NewBoardColumn, 'id'>): Promise<BoardColumn> {
    return await boardRepository.createColumn(data);
  }

  async updateColumn(
    id: string,
    data: Partial<Omit<NewBoardColumn, 'id'>>,
  ): Promise<BoardColumn> {
    return await boardRepository.updateColumn(id, data);
  }

  async deleteColumn(id: string): Promise<void> {
    return await boardRepository.deleteColumn(id);
  }

  async reorderColumns(
    boardId: string,
    columnOrder: Array<{ id: string; position: number }>,
  ): Promise<void> {
    return await boardRepository.reorderColumns(boardId, columnOrder);
  }

  /**
   * Create default columns for a board based on type
   */
  async createDefaultColumns(boardId: string, type: BoardType): Promise<void> {
    if (type === 'scrum') {
      // Scrum: To Do, In Progress, Done
      await boardRepository.createColumn({
        boardId,
        name: 'To Do',
        statusIds: [],
        position: 0,
      });
      await boardRepository.createColumn({
        boardId,
        name: 'In Progress',
        statusIds: [],
        position: 1,
      });
      await boardRepository.createColumn({
        boardId,
        name: 'Done',
        statusIds: [],
        position: 2,
      });
    } else {
      // Kanban: Backlog, Selected, In Progress, Done
      await boardRepository.createColumn({
        boardId,
        name: 'Backlog',
        statusIds: [],
        position: 0,
      });
      await boardRepository.createColumn({
        boardId,
        name: 'Selected for Development',
        statusIds: [],
        position: 1,
      });
      await boardRepository.createColumn({
        boardId,
        name: 'In Progress',
        statusIds: [],
        position: 2,
        maxIssues: 5,
        constraintType: 'warn',
      });
      await boardRepository.createColumn({
        boardId,
        name: 'Done',
        statusIds: [],
        position: 3,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // SWIMLANES
  // ---------------------------------------------------------------------------

  async getSwimlane(boardId: string): Promise<BoardSwimlane | null> {
    return await boardRepository.findSwimlaneByBoardId(boardId);
  }

  async setSwimlane(
    boardId: string,
    data: Omit<NewBoardSwimlane, 'boardId'>,
  ): Promise<BoardSwimlane> {
    return await boardRepository.upsertSwimlane(boardId, data);
  }

  async removeSwimlane(boardId: string): Promise<void> {
    return await boardRepository.deleteSwimlane(boardId);
  }

  // ---------------------------------------------------------------------------
  // QUICK FILTERS
  // ---------------------------------------------------------------------------

  async getQuickFilter(id: string): Promise<BoardQuickFilter | null> {
    return await boardRepository.findQuickFilterById(id);
  }

  async getQuickFiltersByBoard(boardId: string): Promise<BoardQuickFilter[]> {
    return await boardRepository.findQuickFiltersByBoardId(boardId);
  }

  async createQuickFilter(
    data: Omit<NewBoardQuickFilter, 'id'>,
  ): Promise<BoardQuickFilter> {
    return await boardRepository.createQuickFilter(data);
  }

  async updateQuickFilter(
    id: string,
    data: Partial<Omit<NewBoardQuickFilter, 'id'>>,
  ): Promise<BoardQuickFilter> {
    return await boardRepository.updateQuickFilter(id, data);
  }

  async deleteQuickFilter(id: string): Promise<void> {
    return await boardRepository.deleteQuickFilter(id);
  }

  async reorderQuickFilters(
    boardId: string,
    filterOrder: Array<{ id: string; position: number }>,
  ): Promise<void> {
    return await boardRepository.reorderQuickFilters(boardId, filterOrder);
  }

  // ---------------------------------------------------------------------------
  // CARD LAYOUT
  // ---------------------------------------------------------------------------

  async getCardLayout(boardId: string): Promise<BoardCardLayout | null> {
    return await boardRepository.findCardLayoutByBoardId(boardId);
  }

  async setCardLayout(
    boardId: string,
    data: Omit<NewBoardCardLayout, 'boardId'>,
  ): Promise<BoardCardLayout> {
    return await boardRepository.upsertCardLayout(boardId, data);
  }

  // ---------------------------------------------------------------------------
  // USER SETTINGS
  // ---------------------------------------------------------------------------

  async getUserSettings(
    boardId: string,
    userId: string,
  ): Promise<BoardUserSettings | null> {
    return await boardRepository.findUserSettings(boardId, userId);
  }

  async setUserSettings(
    boardId: string,
    userId: string,
    data: Partial<Omit<BoardUserSettings, 'id' | 'boardId' | 'userId'>>,
  ): Promise<BoardUserSettings> {
    return await boardRepository.upsertUserSettings(boardId, userId, data);
  }

  async recordBoardView(boardId: string, userId: string): Promise<void> {
    return await boardRepository.recordBoardView(boardId, userId);
  }

  async getRecentBoards(userId: string, limit?: number): Promise<Board[]> {
    return await boardRepository.getRecentBoardsForUser(userId, limit);
  }

  // ---------------------------------------------------------------------------
  // BOARD DATA (for rendering)
  // ---------------------------------------------------------------------------

  /**
   * Get full board data for rendering
   * This is the main method used by the frontend
   */
  async getBoardData(
    boardId: string,
    userId: string,
    options: {
      sprintId?: string;
      quickFilterIds?: string[];
    } = {},
  ): Promise<BoardData | null> {
    const structure = await boardRepository.findWithStructure(boardId);
    if (!structure) return null;

    const { board, columns, swimlane, quickFilters, cardLayout } = structure;

    // Get user settings
    const userSettings = await boardRepository.findUserSettings(
      boardId,
      userId,
    );

    // Record board view
    await boardRepository.recordBoardView(boardId, userId);

    // TODO: Fetch actual issues based on board filter, sprint, and quick filters
    // This will be implemented when JQL engine is ready
    // For now, return empty data structure

    const columnsWithStats: BoardColumnWithStats[] = columns.map((col) => ({
      ...col,
      issueCount: 0,
      isOverWipLimit: false,
      isUnderWipLimit: col.minIssues ? true : false,
    }));

    return {
      board,
      columns: columnsWithStats,
      swimlane,
      swimlaneGroups: [],
      quickFilters,
      cardLayout,
      userSettings,
    };
  }
}

export const boardService = new BoardService();
