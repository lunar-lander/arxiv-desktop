/**
 * User Repository Implementation
 * Handles user persistence using local file storage
 */

import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { User } from "../../domain/entities/User";
import { Result, success, failure, StorageError } from "../../shared/errors";
import { LoggerFactory } from "../logging/Logger";
import { SecureFileSystem } from "../ipc/SecureFileSystem";
import * as path from "path";
import * as os from "os";

const logger = LoggerFactory.getLogger("UserRepository");

interface StoredUserData {
  currentUser: ReturnType<User["toObject"]> | null;
  version: string;
}

/**
 * User repository implementation using local file storage
 */
export class UserRepository implements IUserRepository {
  private readonly fileSystem: SecureFileSystem;
  private readonly dataFilePath: string;
  private cache: StoredUserData | null = null;
  private readonly CURRENT_VERSION = "1.0.0";

  constructor(fileSystem: SecureFileSystem) {
    this.fileSystem = fileSystem;
    const appDataPath = path.join(os.homedir(), "ArxivDesktop");
    this.dataFilePath = path.join(appDataPath, "user-data.json");
    logger.info("UserRepository initialized", {
      dataFilePath: this.dataFilePath,
    });
  }

  /**
   * Get current authenticated user
   */
  public async getCurrentUser(): Promise<Result<User | null>> {
    logger.debug("getCurrentUser called");

    try {
      const data = await this.loadData();

      if (!data.currentUser) {
        return success(null);
      }

      const user = User.fromObject(data.currentUser);
      return success(user);
    } catch (error) {
      logger.error("getCurrentUser failed", error as Error);
      return failure(new StorageError("Failed to get current user", { error }));
    }
  }

  /**
   * Save user
   */
  public async save(user: User): Promise<Result<User>> {
    logger.debug("save called", { username: user.username });

    try {
      const data = await this.loadData();
      data.currentUser = user.toObject();

      await this.saveData(data);
      this.cache = data;

      logger.info("User saved", { username: user.username });
      return success(user);
    } catch (error) {
      logger.error("save failed", error as Error, {
        username: user.username,
      });
      return failure(new StorageError("Failed to save user", { error }));
    }
  }

  /**
   * Delete user
   */
  public async delete(username: string): Promise<Result<void>> {
    logger.debug("delete called", { username });

    try {
      const data = await this.loadData();

      if (data.currentUser && data.currentUser.username === username) {
        data.currentUser = null;
        await this.saveData(data);
        this.cache = data;
        logger.info("User deleted", { username });
      }

      return success(undefined);
    } catch (error) {
      logger.error("delete failed", error as Error, { username });
      return failure(new StorageError("Failed to delete user", { error }));
    }
  }

  /**
   * Check if user exists
   */
  public async exists(username: string): Promise<boolean> {
    logger.debug("exists called", { username });

    try {
      const data = await this.loadData();
      return data.currentUser?.username === username;
    } catch (error) {
      logger.error("exists failed", error as Error, { username });
      return false;
    }
  }

  /**
   * Clear all user data
   */
  public async clear(): Promise<Result<void>> {
    logger.debug("clear called");

    try {
      const emptyData: StoredUserData = {
        currentUser: null,
        version: this.CURRENT_VERSION,
      };

      await this.saveData(emptyData);
      this.cache = emptyData;

      logger.info("User repository cleared");
      return success(undefined);
    } catch (error) {
      logger.error("clear failed", error as Error);
      return failure(
        new StorageError("Failed to clear user repository", { error })
      );
    }
  }

  /**
   * Load data from file
   */
  private async loadData(): Promise<StoredUserData> {
    // Return cached data if available
    if (this.cache) {
      return this.cache;
    }

    logger.debug("Loading user data from file", { path: this.dataFilePath });

    try {
      // Ensure directory exists
      const dirPath = path.dirname(this.dataFilePath);
      await this.fileSystem.ensureDirectory(dirPath);

      // Check if file exists
      const exists = await this.fileSystem.fileExists(this.dataFilePath);
      if (!exists) {
        logger.debug("User data file not found, creating new");
        const defaultData = this.getDefaultData();
        await this.saveData(defaultData);
        return defaultData;
      }

      // Read and parse file
      const readResult = await this.fileSystem.readFile(this.dataFilePath);
      if (!readResult.success) {
        throw new Error(readResult.error.message);
      }

      const data: StoredUserData = JSON.parse(readResult.data);

      // Validate data
      const validatedData = this.validateData(data);

      this.cache = validatedData;
      logger.debug("User data loaded successfully");

      return validatedData;
    } catch (error) {
      logger.error("Failed to load user data, using defaults", error as Error);
      return this.getDefaultData();
    }
  }

  /**
   * Save data to file
   */
  private async saveData(data: StoredUserData): Promise<void> {
    logger.debug("Saving user data to file", { path: this.dataFilePath });

    const jsonData = JSON.stringify(data, null, 2);
    const writeResult = await this.fileSystem.writeFile(
      this.dataFilePath,
      jsonData
    );

    if (!writeResult.success) {
      throw new Error(writeResult.error.message);
    }

    logger.debug("User data saved successfully");
  }

  /**
   * Get default empty data structure
   */
  private getDefaultData(): StoredUserData {
    return {
      currentUser: null,
      version: this.CURRENT_VERSION,
    };
  }

  /**
   * Validate data structure
   */
  private validateData(data: any): StoredUserData {
    // Add version if missing
    if (!data.version) {
      data.version = this.CURRENT_VERSION;
    }

    // Ensure currentUser is either null or an object
    if (data.currentUser !== null && typeof data.currentUser !== "object") {
      data.currentUser = null;
    }

    return data as StoredUserData;
  }
}
