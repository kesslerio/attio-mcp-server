/**
 * Service for writing formatted output to disk
 *
 * Handles file I/O operations including:
 * - Creating directory structures
 * - Writing files to disk
 * - Creating ZIP archives
 * - Path validation (security)
 *
 * @see Issue #983
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { zipSync, strToU8 } from 'fflate';
import type {
  FormattedOutput,
  GenerateSkillConfig,
  SkillOutput,
} from './types.js';

/**
 * Service for writing skill output to disk
 */
export class OutputWriterService {
  /**
   * Writes formatted output to disk
   *
   * @param formatted - Formatted output from SchemaFormatterService
   * @param config - Generation configuration
   * @returns Information about written files
   */
  async write(
    formatted: FormattedOutput,
    config: GenerateSkillConfig
  ): Promise<SkillOutput> {
    const outputPath = this.resolveOutputPath(config);

    // Create output directory
    await fs.mkdir(outputPath, { recursive: true });

    // Write all files
    const writtenFiles: string[] = [];
    for (const [relativePath, content] of Object.entries(formatted.files)) {
      const fullPath = path.join(outputPath, relativePath);
      const dir = path.dirname(fullPath);

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, 'utf8');
      writtenFiles.push(relativePath);
    }

    // Create ZIP if requested
    if (config.zip) {
      await this.createZip(outputPath, formatted.files);
      writtenFiles.push(`${path.basename(outputPath)}.zip`);
    }

    return {
      format: formatted.format,
      path: outputPath,
      files: writtenFiles,
    };
  }

  /**
   * Creates ZIP archive of output files
   *
   * @param basePath - Base directory path
   * @param files - Map of relative paths to file contents
   */
  private async createZip(
    basePath: string,
    files: Record<string, string>
  ): Promise<void> {
    // Convert files to fflate format (Uint8Array)
    const fileMap: Record<string, Uint8Array> = {};

    for (const [relativePath, content] of Object.entries(files)) {
      fileMap[relativePath] = strToU8(content);
    }

    // Create ZIP
    const zipped = zipSync(fileMap, {
      level: 6, // Compression level (0-9, 6 is default)
    });

    // Write ZIP file
    const zipPath = `${basePath}.zip`;
    await fs.writeFile(zipPath, zipped);
  }

  /**
   * Resolves and validates output path
   *
   * @param config - Generation configuration
   * @returns Absolute output path
   * @throws Error if path validation fails (directory traversal attempt)
   */
  private resolveOutputPath(config: GenerateSkillConfig): string {
    // Determine base name based on format
    const baseName =
      config.format === 'skill'
        ? 'attio-workspace-skill'
        : `attio-workspace-schema-${config.format}`;

    // Resolve absolute paths
    const outputDirResolved = path.resolve(config.outputDir);
    const currentWorkingDir = process.cwd();

    // Security: Prevent directory traversal attacks
    // Check if outputDir attempts to escape the current working directory
    const normalized = path.normalize(outputDirResolved);

    // Only allow output within current working directory or subdirectories
    if (!normalized.startsWith(currentWorkingDir)) {
      throw new Error(
        'Invalid output path: directory traversal detected. ' +
          `Output directory must be within current working directory: ${currentWorkingDir}`
      );
    }

    // Construct final output path
    const outputPath = path.join(outputDirResolved, baseName);

    return outputPath;
  }
}
