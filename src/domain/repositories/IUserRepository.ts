/**
 * User Repository Interface
 * Defines contract for user data access
 */

import { User } from "../entities/User";
import { Result } from "../../shared/errors";

/**
 * Repository interface for user persistence
 */
export interface IUserRepository {
  /**
   * Get current authenticated user
   */
  getCurrentUser(): Promise<Result<User | null>>;

  /**
   * Save user
   */
  save(user: User): Promise<Result<User>>;

  /**
   * Delete user
   */
  delete(username: string): Promise<Result<void>>;

  /**
   * Check if user exists
   */
  exists(username: string): Promise<boolean>;

  /**
   * Clear all user data
   */
  clear(): Promise<Result<void>>;
}
