/**
 * Lightweight Dependency Injection Container
 * Manages service instantiation and dependencies
 */

import { LoggerFactory, ILogger } from "../../infrastructure/logging/Logger";

export type ServiceIdentifier<T> =
  | string
  | symbol
  | { new (...args: any[]): T };
export type Factory<T> = (container: Container) => T;

interface ServiceRegistration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

/**
 * Dependency Injection Container
 */
export class Container {
  private services: Map<string, ServiceRegistration<unknown>> = new Map();
  private readonly logger: ILogger;

  constructor() {
    this.logger = LoggerFactory.getLogger("DI-Container");
  }

  /**
   * Register a service with the container
   */
  public register<T>(
    identifier: ServiceIdentifier<T>,
    factory: Factory<T>,
    options: { singleton?: boolean } = {}
  ): void {
    const key = this.getKey(identifier);
    const { singleton = true } = options;

    if (this.services.has(key)) {
      this.logger.warn(`Service ${key} is already registered. Overwriting.`);
    }

    this.services.set(key, {
      factory: factory as Factory<unknown>,
      singleton,
    });

    this.logger.debug(`Registered service: ${key}`, {
      singleton,
    });
  }

  /**
   * Register a singleton service (convenience method)
   */
  public registerSingleton<T>(
    identifier: ServiceIdentifier<T>,
    factory: Factory<T>
  ): void {
    this.register(identifier, factory, { singleton: true });
  }

  /**
   * Register a transient service (new instance each time)
   */
  public registerTransient<T>(
    identifier: ServiceIdentifier<T>,
    factory: Factory<T>
  ): void {
    this.register(identifier, factory, { singleton: false });
  }

  /**
   * Register an existing instance
   */
  public registerInstance<T>(
    identifier: ServiceIdentifier<T>,
    instance: T
  ): void {
    const key = this.getKey(identifier);

    this.services.set(key, {
      factory: () => instance,
      singleton: true,
      instance,
    });

    this.logger.debug(`Registered instance: ${key}`);
  }

  /**
   * Resolve a service from the container
   */
  public resolve<T>(identifier: ServiceIdentifier<T>): T {
    const key = this.getKey(identifier);
    const registration = this.services.get(key) as
      | ServiceRegistration<T>
      | undefined;

    if (!registration) {
      throw new Error(
        `Service ${key} is not registered in the container. Available services: ${Array.from(this.services.keys()).join(", ")}`
      );
    }

    // Return cached singleton instance if it exists
    if (registration.singleton && registration.instance) {
      return registration.instance;
    }

    // Create new instance
    try {
      this.logger.debug(`Resolving service: ${key}`);
      const instance = registration.factory(this);

      // Cache singleton instance
      if (registration.singleton) {
        registration.instance = instance;
      }

      return instance;
    } catch (error) {
      this.logger.error(
        `Failed to resolve service: ${key}`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Check if a service is registered
   */
  public has(identifier: ServiceIdentifier<unknown>): boolean {
    const key = this.getKey(identifier);
    return this.services.has(key);
  }

  /**
   * Unregister a service
   */
  public unregister(identifier: ServiceIdentifier<unknown>): void {
    const key = this.getKey(identifier);
    this.services.delete(key);
    this.logger.debug(`Unregistered service: ${key}`);
  }

  /**
   * Clear all services
   */
  public clear(): void {
    this.services.clear();
    this.logger.debug("Cleared all services from container");
  }

  /**
   * Get all registered service keys
   */
  public getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Create a child container that inherits from this container
   */
  public createChild(): Container {
    const child = new Container();
    // Copy all registrations to child
    this.services.forEach((registration, key) => {
      child.services.set(key, { ...registration, instance: undefined });
    });
    return child;
  }

  /**
   * Convert service identifier to string key
   */
  private getKey(identifier: ServiceIdentifier<unknown>): string {
    if (typeof identifier === "string") {
      return identifier;
    }
    if (typeof identifier === "symbol") {
      return identifier.toString();
    }
    if (typeof identifier === "function") {
      return identifier.name;
    }
    throw new Error(`Invalid service identifier: ${String(identifier)}`);
  }
}

/**
 * Service identifiers (symbols for type safety)
 */
export const SERVICE_IDENTIFIERS = {
  // Infrastructure
  Logger: Symbol.for("Logger"),
  FileSystemService: Symbol.for("FileSystemService"),
  StorageService: Symbol.for("StorageService"),

  // API Clients
  ArxivApiClient: Symbol.for("ArxivApiClient"),
  BiorxivApiClient: Symbol.for("BiorxivApiClient"),

  // Repositories
  PaperRepository: Symbol.for("PaperRepository"),
  SettingsRepository: Symbol.for("SettingsRepository"),
  UserRepository: Symbol.for("UserRepository"),

  // Use Cases
  SearchPapersUseCase: Symbol.for("SearchPapersUseCase"),
  OpenPaperUseCase: Symbol.for("OpenPaperUseCase"),
  StarPaperUseCase: Symbol.for("StarPaperUseCase"),
  DownloadPaperUseCase: Symbol.for("DownloadPaperUseCase"),

  // Services
  PdfService: Symbol.for("PdfService"),
  AuthService: Symbol.for("AuthService"),
  CacheService: Symbol.for("CacheService"),
} as const;

/**
 * Global container instance
 */
export const container = new Container();

/**
 * Helper decorator for automatic dependency injection (future enhancement)
 */
export function injectable() {
  return function <T extends { new (...args: any[]): object }>(constructor: T) {
    return constructor;
  };
}

/**
 * Helper function to create a factory with dependencies
 */
export function withDependencies<T>(
  dependencies: ServiceIdentifier<unknown>[],
  factory: (...deps: unknown[]) => T
): Factory<T> {
  return (container: Container) => {
    const resolvedDeps = dependencies.map((dep) => container.resolve(dep));
    return factory(...resolvedDeps);
  };
}
