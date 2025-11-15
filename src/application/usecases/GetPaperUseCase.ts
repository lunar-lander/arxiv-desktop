/**
 * Get Paper Use Case
 * Retrieves a specific paper by ID or DOI
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
import { ApiClientFactory, PaperSource } from "../../infrastructure/api";

const logger = LoggerFactory.getLogger("GetPaperUseCase");

export interface GetPaperByIdInput {
  id: string;
  source: PaperSource;
  forceRefresh?: boolean; // If true, fetch from API even if in repository
}

export interface GetPaperByDoiInput {
  doi: string;
  source: PaperSource;
  forceRefresh?: boolean;
}

/**
 * Use case for retrieving a specific paper
 */
export class GetPaperUseCase {
  constructor(private readonly paperRepository: IPaperRepository) {
    logger.info("GetPaperUseCase initialized");
  }

  /**
   * Get paper by ID
   */
  public async getById(
    input: GetPaperByIdInput
  ): Promise<Result<Paper | null>> {
    logger.debug("getById called", { input });

    try {
      const { id, source, forceRefresh = false } = input;

      // Check local repository first (unless force refresh)
      if (!forceRefresh) {
        const localResult = await this.paperRepository.findById(id);
        if (localResult.success && localResult.data) {
          logger.debug("Paper found in repository", { id });
          return success(localResult.data);
        }
      }

      // Fetch from API
      logger.debug("Fetching paper from API", { id, source });
      const client = ApiClientFactory.getClient(source);

      // Check if client supports getPaperById
      if (!client.getPaperById) {
        return failure(
          new AppError(
            `Source ${source} does not support getting paper by ID`,
            ErrorCode.VALIDATION,
            400,
            { source }
          )
        );
      }

      const apiResult = await client.getPaperById(id);

      if (!apiResult.success) {
        return failure(apiResult.error);
      }

      const paper = apiResult.data;

      // Save to repository if found
      if (paper) {
        await this.paperRepository.save(paper);
        logger.info("Paper retrieved and saved", { id });
      } else {
        logger.debug("Paper not found", { id });
      }

      return success(paper);
    } catch (error) {
      logger.error("getById failed", error as Error, { id: input.id });
      return failure(
        new AppError("Failed to get paper by ID", ErrorCode.NOT_FOUND, 500, {
          id: input.id,
          error,
        })
      );
    }
  }

  /**
   * Get paper by DOI
   */
  public async getByDoi(
    input: GetPaperByDoiInput
  ): Promise<Result<Paper | null>> {
    logger.debug("getByDoi called", { input });

    try {
      const { doi, source, forceRefresh = false } = input;

      // Check local repository first (unless force refresh)
      if (!forceRefresh) {
        // Search for paper with this DOI
        const searchResult = await this.paperRepository.findAll({
          query: doi,
        });

        if (searchResult.success && searchResult.data.length > 0) {
          const paper = searchResult.data.find((p) => p.doi === doi);
          if (paper) {
            logger.debug("Paper found in repository", { doi });
            return success(paper);
          }
        }
      }

      // Fetch from API
      logger.debug("Fetching paper from API", { doi, source });
      const client = ApiClientFactory.getClient(source);

      // Check if client supports getPaperByDoi
      if (!client.getPaperByDoi) {
        return failure(
          new AppError(
            `Source ${source} does not support getting paper by DOI`,
            ErrorCode.VALIDATION,
            400,
            { source }
          )
        );
      }

      const apiResult = await client.getPaperByDoi(doi);

      if (!apiResult.success) {
        return failure(apiResult.error);
      }

      const paper = apiResult.data;

      // Save to repository if found
      if (paper) {
        await this.paperRepository.save(paper);
        logger.info("Paper retrieved and saved", { doi });
      } else {
        logger.debug("Paper not found", { doi });
      }

      return success(paper);
    } catch (error) {
      logger.error("getByDoi failed", error as Error, { doi: input.doi });
      return failure(
        new AppError("Failed to get paper by DOI", ErrorCode.NOT_FOUND, 500, {
          doi: input.doi,
          error,
        })
      );
    }
  }

  /**
   * Get paper from repository only (no API call)
   */
  public async getFromRepository(id: string): Promise<Result<Paper | null>> {
    logger.debug("getFromRepository called", { id });

    try {
      const result = await this.paperRepository.findById(id);

      if (result.success) {
        logger.debug("Paper retrieved from repository", {
          id,
          found: !!result.data,
        });
      }

      return result;
    } catch (error) {
      logger.error("getFromRepository failed", error as Error, { id });
      return failure(
        new AppError(
          "Failed to get paper from repository",
          ErrorCode.STORAGE_ERROR,
          500,
          { id, error }
        )
      );
    }
  }

  /**
   * Check if paper exists in repository
   */
  public async exists(id: string): Promise<boolean> {
    logger.debug("exists called", { id });

    try {
      return await this.paperRepository.exists(id);
    } catch (error) {
      logger.error("exists check failed", error as Error, { id });
      return false;
    }
  }
}
