/**
 * Manage Open Papers Use Case
 * Handles opening and closing papers (tabs)
 */

import { Paper } from "../../domain/entities/Paper";
import { IPaperRepository } from "../../domain/repositories/IPaperRepository";
import {
  Result,
  success,
  failure,
  AppError,
  ErrorCode,
} from "../../shared/errors";
import { LoggerFactory } from "../../infrastructure/logging/Logger";

const logger = LoggerFactory.getLogger("ManageOpenPapersUseCase");

export interface OpenPaperInput {
  paper: Paper;
}

export interface ClosePaperInput {
  paperId: string;
}

export interface GetOpenPapersOutput {
  papers: Paper[];
  count: number;
}

/**
 * Use case for managing open papers (tabs)
 */
export class ManageOpenPapersUseCase {
  constructor(private readonly paperRepository: IPaperRepository) {
    logger.info("ManageOpenPapersUseCase initialized");
  }

  /**
   * Open a paper (add to open list)
   */
  public async openPaper(input: OpenPaperInput): Promise<Result<void>> {
    logger.debug("openPaper called", { paperId: input.paper.id });

    try {
      const { paper } = input;

      // Add to open list
      const result = await this.paperRepository.addToOpen(paper);

      if (result.success) {
        logger.info("Paper opened successfully", { paperId: paper.id });
        return success(undefined);
      }

      return result;
    } catch (error) {
      logger.error("openPaper failed", error as Error, {
        paperId: input.paper.id,
      });
      return failure(
        new AppError("Failed to open paper", ErrorCode.UNKNOWN, 500, {
          paperId: input.paper.id,
          error,
        })
      );
    }
  }

  /**
   * Close a paper (remove from open list)
   */
  public async closePaper(input: ClosePaperInput): Promise<Result<void>> {
    logger.debug("closePaper called", { paperId: input.paperId });

    try {
      const { paperId } = input;

      // Remove from open list
      const result = await this.paperRepository.removeFromOpen(paperId);

      if (result.success) {
        logger.info("Paper closed successfully", { paperId });
        return success(undefined);
      }

      return result;
    } catch (error) {
      logger.error("closePaper failed", error as Error, {
        paperId: input.paperId,
      });
      return failure(
        new AppError("Failed to close paper", ErrorCode.UNKNOWN, 500, {
          paperId: input.paperId,
          error,
        })
      );
    }
  }

  /**
   * Get all open papers
   */
  public async getOpenPapers(): Promise<Result<GetOpenPapersOutput>> {
    logger.debug("getOpenPapers called");

    try {
      const result = await this.paperRepository.findOpen();

      if (result.success) {
        logger.info("Retrieved open papers", { count: result.data.length });
        return success({
          papers: result.data,
          count: result.data.length,
        });
      }

      return failure(result.error);
    } catch (error) {
      logger.error("getOpenPapers failed", error as Error);
      return failure(
        new AppError(
          "Failed to get open papers",
          ErrorCode.STORAGE_ERROR,
          500,
          {
            error,
          }
        )
      );
    }
  }

  /**
   * Close all papers
   */
  public async closeAllPapers(): Promise<Result<void>> {
    logger.debug("closeAllPapers called");

    try {
      // Get all open papers
      const openPapersResult = await this.paperRepository.findOpen();
      if (!openPapersResult.success) {
        return failure(openPapersResult.error);
      }

      // Close each paper
      const closePromises = openPapersResult.data.map((paper) =>
        this.paperRepository.removeFromOpen(paper.id)
      );

      const results = await Promise.allSettled(closePromises);

      // Check if any failed
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        logger.warn("Some papers failed to close", {
          failureCount: failures.length,
        });
      }

      logger.info("All papers closed", {
        total: results.length,
        failures: failures.length,
      });

      return success(undefined);
    } catch (error) {
      logger.error("closeAllPapers failed", error as Error);
      return failure(
        new AppError("Failed to close all papers", ErrorCode.UNKNOWN, 500, {
          error,
        })
      );
    }
  }

  /**
   * Reorder open papers
   */
  public async reorderOpenPapers(paperIds: string[]): Promise<Result<void>> {
    logger.debug("reorderOpenPapers called", { count: paperIds.length });

    try {
      // Get current open papers
      const openPapersResult = await this.paperRepository.findOpen();
      if (!openPapersResult.success) {
        return failure(openPapersResult.error);
      }

      const openPapers = openPapersResult.data;

      // Create a map for quick lookup
      const paperMap = new Map(openPapers.map((p) => [p.id, p]));

      // Reorder based on provided IDs
      const reorderedPapers: Paper[] = [];
      for (const id of paperIds) {
        const paper = paperMap.get(id);
        if (paper) {
          reorderedPapers.push(paper);
        }
      }

      // Remove all and re-add in order
      await this.closeAllPapers();

      for (const paper of reorderedPapers) {
        await this.paperRepository.addToOpen(paper);
      }

      logger.info("Papers reordered successfully", {
        count: reorderedPapers.length,
      });

      return success(undefined);
    } catch (error) {
      logger.error("reorderOpenPapers failed", error as Error);
      return failure(
        new AppError("Failed to reorder open papers", ErrorCode.UNKNOWN, 500, {
          error,
        })
      );
    }
  }
}
