// =============================================================================
// ISSUE LINK SERVICE
// =============================================================================

import { IssueLinkRepository } from '../repositories/issue-link-repository';
import { IssueRepository } from '../repositories/issue-repository';
import {
  type IssueLink,
  type NewIssueLink,
  type IssueLinkType,
  type NewIssueLinkType,
} from '../db/schema';
import { TRPCError } from '@trpc/server';
import { getContainer } from '@/lib/context';
import { withTransaction } from '@/lib/transaction';
import { db } from '@/db';

export interface LinkWithDetails {
  id: string;
  linkType: IssueLinkType;
  linkedIssue: {
    id: string;
    key: string;
    statusId: string;
  };
  direction: 'outward' | 'inward';
  directionName: string;
  createdAt: Date;
}

export class IssueLinkService {
  constructor(
    private issueLinkRepository: IssueLinkRepository,
    private issueRepository: IssueRepository,
  ) {}

  // ===========================================================================
  // LINK TYPES
  // ===========================================================================

  async getAllLinkTypes(): Promise<IssueLinkType[]> {
    return this.issueLinkRepository.findAllLinkTypes();
  }

  async getLinkTypeById(id: string): Promise<IssueLinkType> {
    const linkType = await this.issueLinkRepository.findLinkTypeById(id);
    if (!linkType) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Link type not found',
      });
    }
    return linkType;
  }

  async createLinkType(data: {
    name: string;
    inwardName: string;
    outwardName: string;
    description?: string;
  }): Promise<IssueLinkType> {
    // Check for duplicate name
    const existing = await this.issueLinkRepository.findLinkTypeByName(
      data.name,
    );
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Link type with this name already exists',
      });
    }

    return this.issueLinkRepository.createLinkType({
      ...data,
      isSystem: false,
    });
  }

  async updateLinkType(
    id: string,
    data: Partial<
      Pick<
        NewIssueLinkType,
        'name' | 'inwardName' | 'outwardName' | 'description'
      >
    >,
  ): Promise<IssueLinkType> {
    const linkType = await this.getLinkTypeById(id);

    // System link types can only have description updated
    if (
      linkType.isSystem === true &&
      (data.name || data.inwardName || data.outwardName)
    ) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot modify name or direction names of system link type',
      });
    }

    // Check for duplicate name
    if (data.name && data.name !== linkType.name) {
      const existing = await this.issueLinkRepository.findLinkTypeByName(
        data.name,
      );
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Link type with this name already exists',
        });
      }
    }

    const updated = await this.issueLinkRepository.updateLinkType(id, data);
    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Link type not found',
      });
    }

    return updated;
  }

  async deleteLinkType(id: string): Promise<void> {
    const linkType = await this.getLinkTypeById(id);

    if (linkType.isSystem === true) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot delete system link type',
      });
    }

    const deleted = await this.issueLinkRepository.deleteLinkType(id);
    if (!deleted) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Link type not found',
      });
    }
  }

  // ===========================================================================
  // ISSUE LINKS
  // ===========================================================================

  /**
   * Get all links for an issue with details
   */
  async getLinksForIssue(issueId: string): Promise<LinkWithDetails[]> {
    const { outwardLinks, inwardLinks } =
      await this.issueLinkRepository.findLinksByIssueId(issueId);

    const result: LinkWithDetails[] = [];

    // Process outward links
    for (const link of outwardLinks) {
      const linkedIssue = await this.issueRepository.findById(
        link.targetIssueId,
      );
      if (linkedIssue) {
        result.push({
          id: link.id,
          linkType: link.linkType,
          linkedIssue: {
            id: linkedIssue.id,
            key: linkedIssue.key,
            statusId: linkedIssue.statusId,
          },
          direction: 'outward',
          directionName: link.linkType.outwardName,
          createdAt: link.createdAt,
        });
      }
    }

    // Process inward links
    for (const link of inwardLinks) {
      const linkedIssue = await this.issueRepository.findById(
        link.sourceIssueId,
      );
      if (linkedIssue) {
        result.push({
          id: link.id,
          linkType: link.linkType,
          linkedIssue: {
            id: linkedIssue.id,
            key: linkedIssue.key,
            statusId: linkedIssue.statusId,
          },
          direction: 'inward',
          directionName: link.linkType.inwardName,
          createdAt: link.createdAt,
        });
      }
    }

    return result;
  }

  /**
   * Create a link between two issues
   */
  async createLink(data: {
    sourceIssueId: string;
    targetIssueId: string;
    linkTypeId: string;
    createdBy: string;
  }): Promise<IssueLink> {
    // Validate issues exist
    const sourceIssue = await this.issueRepository.findById(data.sourceIssueId);
    if (!sourceIssue) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Source issue not found',
      });
    }

    const targetIssue = await this.issueRepository.findById(data.targetIssueId);
    if (!targetIssue) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Target issue not found',
      });
    }

    // Validate link type exists
    const linkType = await this.getLinkTypeById(data.linkTypeId);

    // Cannot link to self
    if (data.sourceIssueId === data.targetIssueId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot link an issue to itself',
      });
    }

    // Check for existing link
    const existing = await this.issueLinkRepository.findExistingLink(
      data.sourceIssueId,
      data.targetIssueId,
      data.linkTypeId,
    );

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This link already exists',
      });
    }

    // Check reverse link for symmetric types
    const reverseExisting = await this.issueLinkRepository.findExistingLink(
      data.targetIssueId,
      data.sourceIssueId,
      data.linkTypeId,
    );

    if (reverseExisting) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A reverse link of this type already exists',
      });
    }

    // Use transaction for atomic link creation + history entries
    return withTransaction(async (tx) => {
      // Create repository instances with transaction
      const txLinkRepo = new IssueLinkRepository(tx);
      const txIssueRepo = new IssueRepository();

      const link = await txLinkRepo.createLink(data);

      // Add history to source issue (outward direction)
      await txIssueRepo.addHistory(data.sourceIssueId, data.createdBy, [
        {
          field: 'link',
          oldValue: null,
          newValue: `${linkType.outwardName} ${targetIssue.key}`,
        },
      ]);

      // Add history to target issue (inward direction)
      await txIssueRepo.addHistory(data.targetIssueId, data.createdBy, [
        {
          field: 'link',
          oldValue: null,
          newValue: `${linkType.inwardName} ${sourceIssue.key}`,
        },
      ]);

      return link;
    });
  }

  /**
   * Delete a link
   */
  async deleteLink(id: string, userId: string): Promise<void> {
    const link = await this.issueLinkRepository.findLinkById(id);
    if (!link) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Link not found',
      });
    }

    // Get link type and issues for history
    const linkType = await this.getLinkTypeById(link.linkTypeId);
    const sourceIssue = await this.issueRepository.findById(link.sourceIssueId);
    const targetIssue = await this.issueRepository.findById(link.targetIssueId);

    // Check permissions: user must have issue:link permission on at least one of the projects
    // OR be the creator of the link (if we tracked that) OR be an admin
    const container = getContainer();
    
    // Check if user has issue:link permission on source issue's project
    const hasSourcePermission = sourceIssue 
      ? await container.permission.hasPermission(userId, 'issue:link', sourceIssue.projectId)
      : false;
    
    // Check if user has issue:link permission on target issue's project
    const hasTargetPermission = targetIssue
      ? await container.permission.hasPermission(userId, 'issue:link', targetIssue.projectId)
      : false;
    
    // Check if user is a system admin
    const isAdmin = await container.permission.hasPermission(userId, 'admin:manage_projects');
    
    if (!hasSourcePermission && !hasTargetPermission && !isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this link',
      });
    }

    // Wrap delete and history in transaction for atomicity
    await withTransaction(async (tx) => {
      // Create repository with transaction context
      const txIssueLinkRepository = new IssueLinkRepository(tx);
      
      const deleted = await txIssueLinkRepository.deleteLink(id);
      if (!deleted) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete link',
        });
      }

      // Add history to source issue (link removed)
      if (sourceIssue && targetIssue) {
        await this.issueRepository.addHistory(link.sourceIssueId, userId, [
          {
            field: 'link',
            oldValue: `${linkType.outwardName} ${targetIssue.key}`,
            newValue: null,
          },
        ]);

        // Add history to target issue (link removed)
        await this.issueRepository.addHistory(link.targetIssueId, userId, [
          {
            field: 'link',
            oldValue: `${linkType.inwardName} ${sourceIssue.key}`,
            newValue: null,
          },
        ]);
      }
    });
  }

  /**
   * Get blocking issues for an issue
   */
  async getBlockingIssues(issueId: string): Promise<
    {
      id: string;
      key: string;
      statusId: string;
    }[]
  > {
    const blockingLinks = await this.issueLinkRepository.findBlockingIssues(
      issueId,
    );

    const result = [];
    for (const link of blockingLinks) {
      const issue = await this.issueRepository.findById(link.sourceIssueId);
      if (issue) {
        result.push({
          id: issue.id,
          key: issue.key,
          statusId: issue.statusId,
        });
      }
    }

    return result;
  }

  /**
   * Get issues blocked by this issue
   */
  async getBlockedByIssue(issueId: string): Promise<
    {
      id: string;
      key: string;
      statusId: string;
    }[]
  > {
    const blockedLinks = await this.issueLinkRepository.findBlockedIssues(
      issueId,
    );

    const result = [];
    for (const link of blockedLinks) {
      const issue = await this.issueRepository.findById(link.targetIssueId);
      if (issue) {
        result.push({
          id: issue.id,
          key: issue.key,
          statusId: issue.statusId,
        });
      }
    }

    return result;
  }

  /**
   * Check if issue has any blocking issues
   */
  async isBlocked(issueId: string): Promise<boolean> {
    const blockingIssues = await this.issueLinkRepository.findBlockingIssues(
      issueId,
    );
    return blockingIssues.length > 0;
  }

  /**
   * Get link statistics
   */
  async getLinkStats(): Promise<
    Array<{ linkTypeId: string; linkTypeName: string; count: number }>
  > {
    return this.issueLinkRepository.countLinksByType();
  }
}
