/**
 * Manage Starred Papers Use Case
 * Handles starring and unstarring papers
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

const logger = LoggerFactory.getLogger("ManageStarredPapersUseCase");

export interface StarPaperInput {
  paper: Paper;
}

export interface UnstarPaperInput {
  paperId: string;
}

export interface GetStarredPapersOutput {
  papers: Paper[];
  count: number;
}

/**
 * Use case for managing starred papers
 */
export class ManageStarredPapersUseCase {
  constructor(private readonly paperRepository: IPaperRepository) {
    logger.info("ManageStarredPapersUseCase initialized");
  }

  /**
   * Star a paper
   */
  public async starPaper(input: StarPaperInput): Promise<Result<void>> {
    logger.debug("starPaper called", { paperId: input.paper.id });

    try {
      const { paper } = input;

      // Check if already starred
      const isStarred = await this.paperRepository.isStarred(paper.id);
      if (isStarred) {
        logger.debug("Paper already starred", { paperId: paper.id });
        return success(undefined);
      }

      // Star the paper
      const result = await this.paperRepository.star(paper);

      if (result.success) {
        logger.info("Paper starred successfully", { paperId: paper.id });
        return success(undefined);
      }

      return result;
    } catch (error) {
      logger.error("starPaper failed", error as Error, {
        paperId: input.paper.id,
      });
      return failure(
        new AppError("Failed to star paper", ErrorCode.UNKNOWN, 500, {
          paperId: input.paper.id,
          error,
        })
      );
    }
  }

  /**
   * Unstar a paper
   */
  public async unstarPaper(input: UnstarPaperInput): Promise<Result<void>> {
    logger.debug("unstarPaper called", { paperId: input.paperId });

    try {
      const { paperId } = input;

      // Check if starred
      const isStarred = await this.paperRepository.isStarred(paperId);
      if (!isStarred) {
        logger.debug("Paper not starred", { paperId });
        return success(undefined);
      }

      // Unstar the paper
      const result = await this.paperRepository.unstar(paperId);

      if (result.success) {
        logger.info("Paper unstarred successfully", { paperId });
        return success(undefined);
      }

      return result;
    } catch (error) {
      logger.error("unstarPaper failed", error as Error, {
        paperId: input.paperId,
      });
      return failure(
        new AppError("Failed to unstar paper", ErrorCode.UNKNOWN, 500, {
          paperId: input.paperId,
          error,
        })
      );
    }
  }

  /**
   * Toggle starred status
   */
  public async toggleStar(input: StarPaperInput): Promise<Result<boolean>> {
    logger.debug("toggleStar called", { paperId: input.paper.id });

    try {
      const { paper } = input;
      const isStarred = await this.paperRepository.isStarred(paper.id);

      if (isStarred) {
        const result = await this.unstarPaper({ paperId: paper.id });
        if (result.success) {
          return success(false); // Now unstarred
        }
        return failure(result.error);
      } else {
        const result = await this.starPaper({ paper });
        if (result.success) {
          return success(true); // Now starred
        }
        return failure(result.error);
      }
    } catch (error) {
      logger.error("toggleStar failed", error as Error, {
        paperId: input.paper.id,
      });
      return failure(
        new AppError("Failed to toggle star status", ErrorCode.UNKNOWN, 500, {
          paperId: input.paper.id,
          error,
        })
      );
    }
  }

  /**
   * Get all starred papers
   */
  public async getStarredPapers(): Promise<Result<GetStarredPapersOutput>> {
    logger.debug("getStarredPapers called");

    try {
      const result = await this.paperRepository.findStarred();

      if (result.success) {
        logger.info("Retrieved starred papers", { count: result.data.length });
        return success({
          papers: result.data,
          count: result.data.length,
        });
      }

      return failure(result.error);
    } catch (error) {
      logger.error("getStarredPapers failed", error as Error);
      return failure(
        new AppError(
          "Failed to get starred papers",
          ErrorCode.STORAGE_ERROR,
          500,
          { error }
        )
      );
    }
  }

  /**
   * Check if a paper is starred
   */
  public async isStarred(paperId: string): Promise<boolean> {
    logger.debug("isStarred called", { paperId });

    try {
      return await this.paperRepository.isStarred(paperId);
    } catch (error) {
      logger.error("isStarred failed", error as Error, { paperId });
      return false;
    }
  }
}
