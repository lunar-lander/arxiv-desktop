/**
 * Download Paper Use Case
 * Handles downloading PDF files and updating local paths
 */

import { Paper } from "../../domain/entities/Paper";
import { IPaperRepository } from "../../domain/repositories/IPaperRepository";
import { Result, success, failure, AppError } from "../../shared/errors";
import { LoggerFactory } from "../../infrastructure/logging/Logger";
import { SecureFileSystem } from "../../infrastructure/ipc/SecureFileSystem";
import * as path from "path";
import * as os from "os";
import axios from "axios";

const logger = LoggerFactory.getLogger("DownloadPaperUseCase");

export interface DownloadPaperInput {
  paper: Paper;
  destination?: string; // Optional custom destination
}

export interface DownloadPaperOutput {
  paper: Paper;
  localPath: string;
  fileSize: number;
}

/**
 * Use case for downloading papers
 */
export class DownloadPaperUseCase {
  private readonly fileSystem: SecureFileSystem;
  private readonly downloadPath: string;

  constructor(
    private readonly paperRepository: IPaperRepository,
    fileSystem?: SecureFileSystem
  ) {
    this.fileSystem = fileSystem || new SecureFileSystem();
    this.downloadPath = path.join(os.homedir(), "ArxivDesktop", "papers");
    logger.info("DownloadPaperUseCase initialized", {
      downloadPath: this.downloadPath,
    });
  }

  /**
   * Download a paper PDF
   */
  public async execute(
    input: DownloadPaperInput
  ): Promise<Result<DownloadPaperOutput>> {
    logger.debug("execute called", { paperId: input.paper.id });

    try {
      const { paper, destination } = input;

      // Check if already downloaded
      if (paper.localPath) {
        const existsResult = await this.fileSystem.fileExists(paper.localPath);
        if (existsResult) {
          logger.debug("Paper already downloaded", {
            paperId: paper.id,
            path: paper.localPath,
          });

          // Get file size
          const sizeResult = await this.fileSystem.getFileSize(paper.localPath);
          const fileSize = sizeResult.success ? sizeResult.data : 0;

          return success({
            paper,
            localPath: paper.localPath,
            fileSize,
          });
        }
      }

      // Ensure download directory exists
      const targetDir = destination || this.downloadPath;
      await this.fileSystem.ensureDirectory(targetDir);

      // Generate safe filename
      const filename = this.generateFilename(paper);
      const localPath = path.join(targetDir, filename);

      logger.info("Starting download", {
        paperId: paper.id,
        url: paper.pdfUrl,
        destination: localPath,
      });

      // Download the PDF
      const downloadResult = await this.downloadFile(paper.pdfUrl, localPath);

      if (!downloadResult.success) {
        return failure(downloadResult.error);
      }

      const fileSize = downloadResult.data;

      // Update paper with local path
      const updatedPaper = paper.setLocalPath(localPath);

      // Update repository
      const updateResult = await this.paperRepository.updateLocalPath(
        paper.id,
        localPath
      );

      if (!updateResult.success) {
        logger.warn("Failed to update repository with local path", {
          paperId: paper.id,
          error: updateResult.error.message,
        });
        // Don't fail - the file is downloaded
      }

      logger.info("Download completed successfully", {
        paperId: paper.id,
        fileSize,
        path: localPath,
      });

      return success({
        paper: updatedPaper,
        localPath,
        fileSize,
      });
    } catch (error) {
      logger.error("execute failed", error as Error, {
        paperId: input.paper.id,
      });
      return failure(
        new AppError("Failed to download paper", "DOWNLOAD_FAILED", 500, {
          paperId: input.paper.id,
          error,
        })
      );
    }
  }

  /**
   * Download file from URL
   */
  private async downloadFile(
    url: string,
    destination: string
  ): Promise<Result<number>> {
    logger.debug("downloadFile called", { url, destination });

    try {
      // Download with axios
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000, // 60 second timeout for large files
        maxContentLength: 50 * 1024 * 1024, // 50MB max
      });

      const data = Buffer.from(response.data);
      const fileSize = data.length;

      logger.debug("File downloaded", { size: fileSize });

      // Write to disk using SecureFileSystem
      const writeResult = await this.fileSystem.writeFile(destination, data);

      if (!writeResult.success) {
        return failure(writeResult.error);
      }

      return success(fileSize);
    } catch (error) {
      logger.error("downloadFile failed", error as Error, { url });

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
          return failure(
            new AppError("Download timed out", "DOWNLOAD_TIMEOUT", 408, {
              url,
              error,
            })
          );
        }

        if (!error.response) {
          return failure(
            new AppError(
              "Network error during download",
              "NETWORK_ERROR",
              503,
              { url, error }
            )
          );
        }

        return failure(
          new AppError(
            `Download failed: ${error.response.statusText}`,
            "DOWNLOAD_FAILED",
            error.response.status,
            { url, error }
          )
        );
      }

      return failure(
        new AppError("Failed to download file", "DOWNLOAD_FAILED", 500, {
          url,
          error,
        })
      );
    }
  }

  /**
   * Generate safe filename for paper
   */
  private generateFilename(paper: Paper): string {
    // Use paper ID as base
    let filename = paper.id;

    // Sanitize: remove invalid characters
    filename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Add .pdf extension if not present
    if (!filename.endsWith(".pdf")) {
      filename += ".pdf";
    }

    return filename;
  }

  /**
   * Check if paper is downloaded
   */
  public async isDownloaded(paper: Paper): Promise<boolean> {
    if (!paper.localPath) {
      return false;
    }

    try {
      return await this.fileSystem.fileExists(paper.localPath);
    } catch (error) {
      logger.error("isDownloaded check failed", error as Error, {
        paperId: paper.id,
      });
      return false;
    }
  }

  /**
   * Get downloaded papers
   */
  public async getDownloadedPapers(): Promise<Result<Paper[]>> {
    logger.debug("getDownloadedPapers called");

    try {
      const result = await this.paperRepository.findDownloaded();

      if (result.success) {
        // Verify files still exist
        const verifiedPapers: Paper[] = [];
        for (const paper of result.data) {
          if (await this.isDownloaded(paper)) {
            verifiedPapers.push(paper);
          }
        }

        logger.info("Retrieved downloaded papers", {
          count: verifiedPapers.length,
        });

        return success(verifiedPapers);
      }

      return failure(result.error);
    } catch (error) {
      logger.error("getDownloadedPapers failed", error as Error);
      return failure(
        new AppError(
          "Failed to get downloaded papers",
          "GET_DOWNLOADED_FAILED",
          500,
          { error }
        )
      );
    }
  }

  /**
   * Delete downloaded paper file
   */
  public async deletePaper(paper: Paper): Promise<Result<void>> {
    logger.debug("deletePaper called", { paperId: paper.id });

    if (!paper.localPath) {
      return success(undefined);
    }

    try {
      // Delete file
      const deleteResult = await this.fileSystem.deleteFile(paper.localPath);

      if (!deleteResult.success) {
        return failure(deleteResult.error);
      }

      // Update repository
      await this.paperRepository.updateLocalPath(paper.id, "");

      logger.info("Paper file deleted", { paperId: paper.id });
      return success(undefined);
    } catch (error) {
      logger.error("deletePaper failed", error as Error, {
        paperId: paper.id,
      });
      return failure(
        new AppError("Failed to delete paper", "DELETE_FAILED", 500, {
          paperId: paper.id,
          error,
        })
      );
    }
  }
}
