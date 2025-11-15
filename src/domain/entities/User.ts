/**
 * User domain entity
 * Represents an authenticated user
 */

import { PaperSource } from "./Paper";

export interface UserProps {
  username: string;
  email?: string;
  authenticated: boolean;
  source?: PaperSource;
  createdAt?: string;
  lastLoginAt?: string;
}

/**
 * User entity with business logic
 */
export class User {
  private readonly props: UserProps;

  constructor(props: UserProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  // Getters
  public get username(): string {
    return this.props.username;
  }

  public get email(): string | undefined {
    return this.props.email;
  }

  public get authenticated(): boolean {
    return this.props.authenticated;
  }

  public get source(): PaperSource | undefined {
    return this.props.source;
  }

  public get createdAt(): string | undefined {
    return this.props.createdAt;
  }

  public get lastLoginAt(): string | undefined {
    return this.props.lastLoginAt;
  }

  /**
   * Get display name
   */
  public getDisplayName(): string {
    return this.props.username;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.props.authenticated;
  }

  /**
   * Update last login timestamp
   */
  public updateLastLogin(): User {
    return new User({
      ...this.props,
      lastLoginAt: new Date().toISOString(),
    });
  }

  /**
   * Get plain object representation
   */
  public toObject(): UserProps {
    return { ...this.props };
  }

  /**
   * Create User from plain object
   */
  public static fromObject(obj: UserProps): User {
    return new User(obj);
  }

  /**
   * Create guest user (not authenticated)
   */
  public static createGuest(): User {
    return new User({
      username: "Guest",
      authenticated: false,
    });
  }

  /**
   * Validate user properties
   */
  private validateProps(props: UserProps): void {
    if (!props.username || props.username.trim() === "") {
      throw new Error("Username is required");
    }
    if (props.email && !this.isValidEmail(props.email)) {
      throw new Error("Invalid email format");
    }
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Compare users for equality
   */
  public equals(other: User): boolean {
    return this.username === other.username && this.source === other.source;
  }

  /**
   * Clone user with modifications
   */
  public clone(modifications?: Partial<UserProps>): User {
    return new User({
      ...this.props,
      ...modifications,
    });
  }
}
