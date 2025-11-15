/**
 * Paper domain entity
 * Represents an academic paper with behavior and business logic
 */

export interface Author {
  name: string;
  affiliation?: string;
}

export type PaperSource = "arxiv" | "biorxiv";

export interface PaperProps {
  id: string;
  title: string;
  authors: Author[];
  abstract: string;
  publishedDate: string;
  updatedDate?: string;
  categories: string[];
  pdfUrl: string;
  source: PaperSource;
  doi?: string;
  comments?: string;
  journalRef?: string;
  localPath?: string;
}

/**
 * Paper entity with business logic
 */
export class Paper {
  private readonly props: PaperProps;

  constructor(props: PaperProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  // Getters
  public get id(): string {
    return this.props.id;
  }

  public get title(): string {
    return this.props.title;
  }

  public get authors(): Author[] {
    return [...this.props.authors];
  }

  public get abstract(): string {
    return this.props.abstract;
  }

  public get publishedDate(): string {
    return this.props.publishedDate;
  }

  public get updatedDate(): string | undefined {
    return this.props.updatedDate;
  }

  public get categories(): string[] {
    return [...this.props.categories];
  }

  public get pdfUrl(): string {
    return this.props.pdfUrl;
  }

  public get source(): PaperSource {
    return this.props.source;
  }

  public get doi(): string | undefined {
    return this.props.doi;
  }

  public get comments(): string | undefined {
    return this.props.comments;
  }

  public get journalRef(): string | undefined {
    return this.props.journalRef;
  }

  public get localPath(): string | undefined {
    return this.props.localPath;
  }

  /**
   * Get formatted author names
   */
  public getAuthorNames(): string {
    return this.props.authors.map((a) => a.name).join(", ");
  }

  /**
   * Get first author
   */
  public getFirstAuthor(): Author | undefined {
    return this.props.authors[0];
  }

  /**
   * Get display date (updated or published)
   */
  public getDisplayDate(): string {
    return this.props.updatedDate || this.props.publishedDate;
  }

  /**
   * Check if paper is downloaded locally
   */
  public isDownloaded(): boolean {
    return !!this.props.localPath;
  }

  /**
   * Update local path after download
   */
  public setLocalPath(path: string): Paper {
    return new Paper({
      ...this.props,
      localPath: path,
    });
  }

  /**
   * Get plain object representation
   */
  public toObject(): PaperProps {
    return { ...this.props };
  }

  /**
   * Create Paper from plain object
   */
  public static fromObject(obj: PaperProps): Paper {
    return new Paper(obj);
  }

  /**
   * Validate paper properties
   */
  private validateProps(props: PaperProps): void {
    if (!props.id || props.id.trim() === "") {
      throw new Error("Paper ID is required");
    }
    if (!props.title || props.title.trim() === "") {
      throw new Error("Paper title is required");
    }
    if (!props.authors || props.authors.length === 0) {
      throw new Error("Paper must have at least one author");
    }
    if (!props.pdfUrl || props.pdfUrl.trim() === "") {
      throw new Error("Paper PDF URL is required");
    }
    if (!props.source) {
      throw new Error("Paper source is required");
    }
  }

  /**
   * Compare papers for equality
   */
  public equals(other: Paper): boolean {
    return this.id === other.id;
  }

  /**
   * Clone paper with modifications
   */
  public clone(modifications?: Partial<PaperProps>): Paper {
    return new Paper({
      ...this.props,
      ...modifications,
    });
  }
}
