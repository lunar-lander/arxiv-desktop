/**
 * Paper Repository Implementation
 * Handles paper persistence using local file storage
 */

import {
  IPaperRepository,
  SearchCriteria,
} from "../../domain/repositories/IPaperRepository";
import { Paper } from "../../domain/entities/Paper";
import { Result, success, failure, StorageError } from "../../shared/errors";
import { LoggerFactory } from "../logging/Logger";
import { SecureFileSystem } from "../ipc/SecureFileSystem";
import * as path from "path";
import * as os from "os";

const logger = LoggerFactory.getLogger("PaperRepository");

interface StoredData {
  starredPapers: Array<ReturnType<Paper["toObject"]>>;
  openPapers: Array<ReturnType<Paper["toObject"]>>;
  paperMetadata: Record<string, ReturnType<Paper["toObject"]>>;
  version: string;
}

/**
 * Paper repository implementation using local file storage
 */
export class PaperRepository implements IPaperRepository {
  private readonly fileSystem: SecureFileSystem;
  private readonly dataFilePath: string;
  private cache: StoredData | null = null;
  private readonly CURRENT_VERSION = "1.0.0";

  constructor(fileSystem: SecureFileSystem) {
    this.fileSystem = fileSystem;
    const appDataPath = path.join(os.homedir(), "ArxivDesktop");
    this.dataFilePath = path.join(appDataPath, "papers-data.json");
    logger.info("PaperRepository initialized", {
      dataFilePath: this.dataFilePath,
    });
  }

  /**
   * Find paper by ID
   */
  public async findById(id: string): Promise<Result<Paper | null>> {
    logger.debug("findById called", { id });

    try {
      const data = await this.loadData();
      const paperData = data.paperMetadata[id];

      if (!paperData) {
        return success(null);
      }

      return success(Paper.fromObject(paperData));
    } catch (error) {
      logger.error("findById failed", error as Error, { id });
      return failure(
        new StorageError("Failed to find paper by ID", { id, error })
      );
    }
  }

  /**
   * Find all papers matching criteria
   */
  public async findAll(criteria?: SearchCriteria): Promise<Result<Paper[]>> {
    logger.debug("findAll called", { criteria });

    try {
      const data = await this.loadData();
      let papers = Object.values(data.paperMetadata).map((paperData) =>
        Paper.fromObject(paperData)
      );

      // Apply filters if provided
      if (criteria) {
        papers = this.applySearchCriteria(papers, criteria);
      }

      return success(papers);
    } catch (error) {
      logger.error("findAll failed", error as Error);
      return failure(new StorageError("Failed to find papers", { error }));
    }
  }

  /**
   * Save a paper
   */
  public async save(paper: Paper): Promise<Result<Paper>> {
    logger.debug("save called", { paperId: paper.id });

    try {
      const data = await this.loadData();
      data.paperMetadata[paper.id] = paper.toObject();

      await this.saveData(data);
      this.cache = data;

      logger.info("Paper saved", { paperId: paper.id });
      return success(paper);
    } catch (error) {
      logger.error("save failed", error as Error, { paperId: paper.id });
      return failure(new StorageError("Failed to save paper", { error }));
    }
  }

  /**
   * Save multiple papers
   */
  public async saveMany(papers: Paper[]): Promise<Result<Paper[]>> {
    logger.debug("saveMany called", { count: papers.length });

    try {
      const data = await this.loadData();

      for (const paper of papers) {
        data.paperMetadata[paper.id] = paper.toObject();
      }

      await this.saveData(data);
      this.cache = data;

      logger.info("Papers saved", { count: papers.length });
      return success(papers);
    } catch (error) {
      logger.error("saveMany failed", error as Error, {
        count: papers.length,
      });
      return failure(new StorageError("Failed to save papers", { error }));
    }
  }

  /**
   * Delete a paper
   */
  public async delete(id: string): Promise<Result<void>> {
    logger.debug("delete called", { id });

    try {
      const data = await this.loadData();

      delete data.paperMetadata[id];

      // Remove from starred and open lists
      data.starredPapers = data.starredPapers.filter((p) => p.id !== id);
      data.openPapers = data.openPapers.filter((p) => p.id !== id);

      await this.saveData(data);
      this.cache = data;

      logger.info("Paper deleted", { id });
      return success(undefined);
    } catch (error) {
      logger.error("delete failed", error as Error, { id });
      return failure(new StorageError("Failed to delete paper", { error }));
    }
  }

  /**
   * Check if paper exists
   */
  public async exists(id: string): Promise<boolean> {
    logger.debug("exists called", { id });

    try {
      const data = await this.loadData();
      return id in data.paperMetadata;
    } catch (error) {
      logger.error("exists failed", error as Error, { id });
      return false;
    }
  }

  /**
   * Get all starred papers
   */
  public async findStarred(): Promise<Result<Paper[]>> {
    logger.debug("findStarred called");

    try {
      const data = await this.loadData();
      const papers = data.starredPapers.map((paperData) =>
        Paper.fromObject(paperData)
      );

      return success(papers);
    } catch (error) {
      logger.error("findStarred failed", error as Error);
      return failure(
        new StorageError("Failed to find starred papers", { error })
      );
    }
  }

  /**
   * Add paper to starred list
   */
  public async star(paper: Paper): Promise<Result<void>> {
    logger.debug("star called", { paperId: paper.id });

    try {
      const data = await this.loadData();

      // Check if already starred
      const alreadyStarred = data.starredPapers.some((p) => p.id === paper.id);
      if (!alreadyStarred) {
        data.starredPapers.push(paper.toObject());
        data.paperMetadata[paper.id] = paper.toObject();

        await this.saveData(data);
        this.cache = data;

        logger.info("Paper starred", { paperId: paper.id });
      }

      return success(undefined);
    } catch (error) {
      logger.error("star failed", error as Error, { paperId: paper.id });
      return failure(new StorageError("Failed to star paper", { error }));
    }
  }

  /**
   * Remove paper from starred list
   */
  public async unstar(paperId: string): Promise<Result<void>> {
    logger.debug("unstar called", { paperId });

    try {
      const data = await this.loadData();
      data.starredPapers = data.starredPapers.filter((p) => p.id !== paperId);

      await this.saveData(data);
      this.cache = data;

      logger.info("Paper unstarred", { paperId });
      return success(undefined);
    } catch (error) {
      logger.error("unstar failed", error as Error, { paperId });
      return failure(new StorageError("Failed to unstar paper", { error }));
    }
  }

  /**
   * Check if paper is starred
   */
  public async isStarred(paperId: string): Promise<boolean> {
    logger.debug("isStarred called", { paperId });

    try {
      const data = await this.loadData();
      return data.starredPapers.some((p) => p.id === paperId);
    } catch (error) {
      logger.error("isStarred failed", error as Error, { paperId });
      return false;
    }
  }

  /**
   * Get all open papers
   */
  public async findOpen(): Promise<Result<Paper[]>> {
    logger.debug("findOpen called");

    try {
      const data = await this.loadData();
      const papers = data.openPapers.map((paperData) =>
        Paper.fromObject(paperData)
      );

      return success(papers);
    } catch (error) {
      logger.error("findOpen failed", error as Error);
      return failure(new StorageError("Failed to find open papers", { error }));
    }
  }

  /**
   * Add paper to open list
   */
  public async addToOpen(paper: Paper): Promise<Result<void>> {
    logger.debug("addToOpen called", { paperId: paper.id });

    try {
      const data = await this.loadData();

      // Check if already open
      const alreadyOpen = data.openPapers.some((p) => p.id === paper.id);
      if (!alreadyOpen) {
        data.openPapers.push(paper.toObject());
        data.paperMetadata[paper.id] = paper.toObject();

        await this.saveData(data);
        this.cache = data;

        logger.info("Paper added to open list", { paperId: paper.id });
      }

      return success(undefined);
    } catch (error) {
      logger.error("addToOpen failed", error as Error, { paperId: paper.id });
      return failure(
        new StorageError("Failed to add paper to open list", { error })
      );
    }
  }

  /**
   * Remove paper from open list
   */
  public async removeFromOpen(paperId: string): Promise<Result<void>> {
    logger.debug("removeFromOpen called", { paperId });

    try {
      const data = await this.loadData();
      data.openPapers = data.openPapers.filter((p) => p.id !== paperId);

      await this.saveData(data);
      this.cache = data;

      logger.info("Paper removed from open list", { paperId });
      return success(undefined);
    } catch (error) {
      logger.error("removeFromOpen failed", error as Error, { paperId });
      return failure(
        new StorageError("Failed to remove paper from open list", { error })
      );
    }
  }

  /**
   * Update paper's local path
   */
  public async updateLocalPath(
    paperId: string,
    localPath: string
  ): Promise<Result<void>> {
    logger.debug("updateLocalPath called", { paperId, localPath });

    try {
      const data = await this.loadData();

      // Update in metadata
      if (data.paperMetadata[paperId]) {
        data.paperMetadata[paperId].localPath = localPath;
      }

      // Update in starred list
      const starredIndex = data.starredPapers.findIndex(
        (p) => p.id === paperId
      );
      if (starredIndex !== -1) {
        data.starredPapers[starredIndex].localPath = localPath;
      }

      // Update in open list
      const openIndex = data.openPapers.findIndex((p) => p.id === paperId);
      if (openIndex !== -1) {
        data.openPapers[openIndex].localPath = localPath;
      }

      await this.saveData(data);
      this.cache = data;

      logger.info("Paper local path updated", { paperId, localPath });
      return success(undefined);
    } catch (error) {
      logger.error("updateLocalPath failed", error as Error, {
        paperId,
        localPath,
      });
      return failure(
        new StorageError("Failed to update paper local path", { error })
      );
    }
  }

  /**
   * Find papers by local availability
   */
  public async findDownloaded(): Promise<Result<Paper[]>> {
    logger.debug("findDownloaded called");

    try {
      const data = await this.loadData();
      const papers = Object.values(data.paperMetadata)
        .filter((paperData) => paperData.localPath)
        .map((paperData) => Paper.fromObject(paperData));

      return success(papers);
    } catch (error) {
      logger.error("findDownloaded failed", error as Error);
      return failure(
        new StorageError("Failed to find downloaded papers", { error })
      );
    }
  }

  /**
   * Clear all cached data
   */
  public async clear(): Promise<Result<void>> {
    logger.debug("clear called");

    try {
      const emptyData: StoredData = {
        starredPapers: [],
        openPapers: [],
        paperMetadata: {},
        version: this.CURRENT_VERSION,
      };

      await this.saveData(emptyData);
      this.cache = emptyData;

      logger.info("Repository cleared");
      return success(undefined);
    } catch (error) {
      logger.error("clear failed", error as Error);
      return failure(new StorageError("Failed to clear repository", { error }));
    }
  }

  /**
   * Load data from file
   */
  private async loadData(): Promise<StoredData> {
    // Return cached data if available
    if (this.cache) {
      return this.cache;
    }

    logger.debug("Loading data from file", { path: this.dataFilePath });

    try {
      // Ensure directory exists
      const dirPath = path.dirname(this.dataFilePath);
      await this.fileSystem.ensureDirectory(dirPath);

      // Check if file exists
      const exists = await this.fileSystem.fileExists(this.dataFilePath);
      if (!exists) {
        logger.debug("Data file not found, creating new");
        const defaultData = this.getDefaultData();
        await this.saveData(defaultData);
        return defaultData;
      }

      // Read and parse file
      const readResult = await this.fileSystem.readFile(this.dataFilePath);
      if (!readResult.success) {
        throw new Error(readResult.error.message);
      }

      const data: StoredData = JSON.parse(readResult.data);

      // Validate and migrate if needed
      const validatedData = this.validateAndMigrate(data);

      this.cache = validatedData;
      logger.debug("Data loaded successfully");

      return validatedData;
    } catch (error) {
      logger.error("Failed to load data, using defaults", error as Error);
      return this.getDefaultData();
    }
  }

  /**
   * Save data to file
   */
  private async saveData(data: StoredData): Promise<void> {
    logger.debug("Saving data to file", { path: this.dataFilePath });

    const jsonData = JSON.stringify(data, null, 2);
    const writeResult = await this.fileSystem.writeFile(
      this.dataFilePath,
      jsonData
    );

    if (!writeResult.success) {
      throw new Error(writeResult.error.message);
    }

    logger.debug("Data saved successfully");
  }

  /**
   * Get default empty data structure
   */
  private getDefaultData(): StoredData {
    return {
      starredPapers: [],
      openPapers: [],
      paperMetadata: {},
      version: this.CURRENT_VERSION,
    };
  }

  /**
   * Validate and migrate data if needed
   */
  private validateAndMigrate(data: any): StoredData {
    // Add version if missing
    if (!data.version) {
      data.version = this.CURRENT_VERSION;
    }

    // Ensure arrays exist
    if (!Array.isArray(data.starredPapers)) {
      data.starredPapers = [];
    }
    if (!Array.isArray(data.openPapers)) {
      data.openPapers = [];
    }
    if (typeof data.paperMetadata !== "object") {
      data.paperMetadata = {};
    }

    // TODO: Add version-specific migrations here

    return data as StoredData;
  }

  /**
   * Apply search criteria to filter papers
   */
  private applySearchCriteria(
    papers: Paper[],
    criteria: SearchCriteria
  ): Paper[] {
    return papers.filter((paper) => {
      // Filter by query (search in title and abstract)
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const titleMatch = paper.title.toLowerCase().includes(query);
        const abstractMatch = paper.abstract.toLowerCase().includes(query);
        if (!titleMatch && !abstractMatch) {
          return false;
        }
      }

      // Filter by author
      if (criteria.author) {
        const authorQuery = criteria.author.toLowerCase();
        const hasAuthor = paper.authors.some((author) =>
          author.name.toLowerCase().includes(authorQuery)
        );
        if (!hasAuthor) {
          return false;
        }
      }

      // Filter by title
      if (criteria.title) {
        const titleQuery = criteria.title.toLowerCase();
        if (!paper.title.toLowerCase().includes(titleQuery)) {
          return false;
        }
      }

      // Filter by categories
      if (criteria.categories && criteria.categories.length > 0) {
        const hasCategory = criteria.categories.some((cat) =>
          paper.categories.includes(cat)
        );
        if (!hasCategory) {
          return false;
        }
      }

      // Filter by date range
      if (criteria.startDate) {
        const paperDate = new Date(paper.publishedDate);
        const startDate = new Date(criteria.startDate);
        if (paperDate < startDate) {
          return false;
        }
      }

      if (criteria.endDate) {
        const paperDate = new Date(paper.publishedDate);
        const endDate = new Date(criteria.endDate);
        if (paperDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }
}
