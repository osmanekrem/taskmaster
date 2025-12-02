import { boardRepository } from '@/repositories/board-repository';
import { projectRepository } from '@/repositories/project-repository';
import { IssueRepository, issueRepository } from '@/repositories/issue-repository';
import { jqlService } from '@/services/jql-service';
import { db } from '@/db';
import { issues } from '@/db/schema/issues';
import { issueTypes } from '@/db/schema/issue-types';
import { statuses } from '@/db/schema/statuses';
import { user } from '@/db/schema/auth';
import { sprintIssues, sprints } from '@/db/schema/sprints';
import { eq, and, inArray, sql, isNull } from 'drizzle-orm';
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

    // Build JQL for fetching issues
    let jqlParts: string[] = [];
    
    // 1. Board's base filter
    if (board.filterJql) {
      jqlParts.push(`(${board.filterJql})`);
    } else {
      // Default: filter by project
      jqlParts.push(`project = "${board.projectId}"`);
    }

    // 2. Sprint filter
    if (options.sprintId) {
      jqlParts.push(`sprint = "${options.sprintId}"`);
    } else if (board.type === 'scrum') {
      // For scrum boards without sprint, show active sprint
      jqlParts.push(`sprint IN openSprints()`);
    }

    // 3. Quick filters
    if (options.quickFilterIds && options.quickFilterIds.length > 0) {
      const activeFilters = quickFilters.filter(f => 
        options.quickFilterIds!.includes(f.id)
      );
      for (const filter of activeFilters) {
        if (filter.jql) {
          jqlParts.push(`(${filter.jql})`);
        }
      }
    }

    const combinedJql = jqlParts.join(' AND ');
    
    // Fetch issues using JQL
    let boardIssues: BoardIssueCard[] = [];
    try {
      const jqlResult = await jqlService.executeSearch(combinedJql, {
        userId,
        projectId: board.projectId,
        limit: 500, // Board reasonable limit
      });

      boardIssues = jqlResult.items.map(issue => ({
        id: issue.id,
        key: issue.key,
        summary: issue.summary,
        statusId: issue.statusId,
        issueTypeId: issue.issueTypeId,
        issueTypeName: issue.issueTypeName,
        issueTypeIcon: issue.issueTypeIcon,
        priority: issue.priority,
        assigneeId: issue.assigneeId,
        assigneeName: issue.assigneeName,
        assigneeAvatar: issue.assigneeAvatar,
        labels: [], // Not included in JQL result currently
        dueDate: issue.dueDate,
        storyPoints: null, // Would need to be added to JQL result
        rank: null, // Would need to be added to JQL result
        parentId: null,
        parentKey: null,
        sprintId: null,
      }));
    } catch (error) {
      console.error('[BoardService] Error executing board JQL:', error);
      // Return empty board on JQL error
    }

    // Build columns with issue counts and WIP stats
    const columnsWithStats: BoardColumnWithStats[] = columns.map((col) => {
      const statusIds = (col.statusIds as string[]) || [];
      const columnIssues = boardIssues.filter(issue => 
        statusIds.includes(issue.statusId)
      );
      const issueCount = columnIssues.length;
      
      return {
        ...col,
        issueCount,
        isOverWipLimit: col.maxIssues ? issueCount > col.maxIssues : false,
        isUnderWipLimit: col.minIssues ? issueCount < col.minIssues : false,
      };
    });

    // Build swimlane groups
    let swimlaneGroups: SwimlaneGroup[] = [];
    
    if (swimlane) {
      swimlaneGroups = this.groupIssuesBySwimlane(
        boardIssues, 
        swimlane.type as SwimlaneType
      );
    } else {
      // No swimlane - single group with all issues
      swimlaneGroups = [{
        id: 'default',
        name: 'All Issues',
        issueCount: boardIssues.length,
        issues: boardIssues,
      }];
    }

    // Get backlog for scrum boards (issues not in active sprint)
    let backlog: BoardIssueCard[] | undefined;
    if (board.type === 'scrum' && !options.sprintId) {
      try {
        const backlogJql = board.filterJql 
          ? `(${board.filterJql}) AND sprint IS EMPTY`
          : `project = "${board.projectId}" AND sprint IS EMPTY`;
        
        const backlogResult = await jqlService.executeSearch(backlogJql, {
          userId,
          projectId: board.projectId,
          limit: 200,
        });

        backlog = backlogResult.items.map(issue => ({
          id: issue.id,
          key: issue.key,
          summary: issue.summary,
          statusId: issue.statusId,
          issueTypeId: issue.issueTypeId,
          issueTypeName: issue.issueTypeName,
          issueTypeIcon: issue.issueTypeIcon,
          priority: issue.priority,
          assigneeId: issue.assigneeId,
          assigneeName: issue.assigneeName,
          assigneeAvatar: issue.assigneeAvatar,
          labels: [],
          dueDate: issue.dueDate,
          storyPoints: null,
          rank: null,
          parentId: null,
          parentKey: null,
          sprintId: null,
        }));
      } catch (error) {
        console.error('[BoardService] Error fetching backlog:', error);
      }
    }

    return {
      board,
      columns: columnsWithStats,
      swimlane,
      swimlaneGroups,
      quickFilters,
      cardLayout,
      userSettings,
      backlog,
    };
  }

  /**
   * Group issues by swimlane type
   */
  private groupIssuesBySwimlane(
    issues: BoardIssueCard[],
    swimlaneType: SwimlaneType,
  ): SwimlaneGroup[] {
    const groups = new Map<string, SwimlaneGroup>();

    switch (swimlaneType) {
      case 'assignee':
        for (const issue of issues) {
          const key = issue.assigneeId || 'unassigned';
          const name = issue.assigneeName || 'Unassigned';
          
          if (!groups.has(key)) {
            groups.set(key, {
              id: key,
              name,
              avatarUrl: issue.assigneeAvatar || undefined,
              issueCount: 0,
              issues: [],
            });
          }
          
          const group = groups.get(key)!;
          group.issueCount++;
          group.issues.push(issue);
        }
        break;

      case 'priority':
        const priorityOrder = ['highest', 'high', 'medium', 'low', 'lowest', 'none'];
        for (const issue of issues) {
          const key = issue.priority || 'none';
          const name = issue.priority 
            ? issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)
            : 'No Priority';
          
          if (!groups.has(key)) {
            groups.set(key, {
              id: key,
              name,
              issueCount: 0,
              issues: [],
            });
          }
          
          const group = groups.get(key)!;
          group.issueCount++;
          group.issues.push(issue);
        }
        // Sort by priority order
        return priorityOrder
          .filter(p => groups.has(p))
          .map(p => groups.get(p)!);

      case 'epic':
      case 'parent':
        // Group by parent/epic
        for (const issue of issues) {
          const key = issue.parentId || 'no-epic';
          const name = issue.parentKey || 'No Epic';
          
          if (!groups.has(key)) {
            groups.set(key, {
              id: key,
              name,
              issueCount: 0,
              issues: [],
            });
          }
          
          const group = groups.get(key)!;
          group.issueCount++;
          group.issues.push(issue);
        }
        break;

      case 'custom_field':
        // Would require custom field value in issue data
        // For now, fall through to none
        
      case 'none':
      default:
        // Single group with all issues
        return [{
          id: 'all',
          name: 'All Issues',
          issueCount: issues.length,
          issues,
        }];
    }

    return Array.from(groups.values());
  }
}

export const boardService = new BoardService();
