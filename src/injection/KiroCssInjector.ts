/**
 * KiroCssInjector — Injects RTL CSS directly into the Kiro agent chat CSS file.
 * This approach modifies the webview's bundled CSS on disk.
 * No integrity check issues, no electron access needed.
 *
 * Inspired by yechielby/claude-code-rtl-extension approach.
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OutputChannelLogger } from '../logging/OutputChannelLogger';

const LOG_SOURCE = 'KiroCssInjector';
const MARKER_START = '/* kiro-rtl-start */';
const MARKER_END = '/* kiro-rtl-end */';
const BACKUP_SUFFIX = '.kiro-rtl-bak';

// RTL CSS to inject - uses unicode-bidi: plaintext for auto-direction detection
// Targets the actual Kiro chat DOM classes found in the webview CSS:
// - .user-message-text (user messages in acp chat)
// - .vr-narrative pre (agent narrative responses)
// - Generic p, li, pre elements (continuedev gui)
const RTL_CSS = `
${MARKER_START}
/* Kiro Chat RTL Auto-Direction - Injected CSS */
/* Auto-detect text direction using unicode-bidi: plaintext */

/* === User messages === */
.user-message-text,
.user-message-body,
.user-message {
  direction: auto;
  unicode-bidi: plaintext;
  text-align: start;
}

/* === Agent/Kiro narrative responses === */
.vr-narrative,
.vr-narrative pre,
.vr-progress-message {
  direction: auto;
  unicode-bidi: plaintext;
  text-align: start;
}

/* === Generic paragraph and list content in chat === */
p, li, h1, h2, h3, h4, h5, h6 {
  direction: auto;
  unicode-bidi: plaintext;
  text-align: start;
}

/* === Chat input field - auto direction === */
textarea,
[contenteditable="true"],
[role="textbox"] {
  direction: auto;
  unicode-bidi: plaintext;
  text-align: start;
}

/* === Preview text === */
.preview-text {
  direction: auto;
  unicode-bidi: plaintext;
  text-align: start;
}

/* === Code blocks MUST stay LTR === */
pre > code,
code,
.code-block,
[class*="codeBlock"],
[class*="CodeBlock"],
[class*="hljs"] {
  direction: ltr !important;
  unicode-bidi: isolate !important;
  text-align: left !important;
}

/* === Tool results, thinking blocks, terminal - keep LTR === */
.command-output,
.command-output pre,
[class*="tool"],
[class*="thinking"],
[class*="terminal"] {
  direction: ltr !important;
  unicode-bidi: isolate !important;
  text-align: left !important;
}
${MARKER_END}
`;

export class KiroCssInjector {
  private readonly logger: OutputChannelLogger;
  private cssPaths: string[] = [];

  constructor(logger: OutputChannelLogger) {
    this.logger = logger;
  }

  /**
   * Find ALL Kiro agent chat CSS files that need injection.
   * Returns the list of paths found.
   */
  findCssFiles(): string[] {
    this.cssPaths = [];
    const candidates: string[] = [];

    // Build base directories to search
    const baseDirs: string[] = [];

    if (vscode.env.appRoot) {
      baseDirs.push(path.join(vscode.env.appRoot, 'extensions', 'kiro.kiro-agent'));
    }

    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      baseDirs.push(path.join(localAppData, 'Programs', 'Kiro', 'resources', 'app', 'extensions', 'kiro.kiro-agent'));
    }

    const resourcesPath = (process as unknown as { resourcesPath?: string }).resourcesPath;
    if (resourcesPath) {
      baseDirs.push(path.join(resourcesPath, 'app', 'extensions', 'kiro.kiro-agent'));
    }

    // For each base dir, look for all known CSS file locations
    const cssSubPaths = [
      path.join('packages', 'kiro-ui-agent-chat', 'dist', 'style.css'),
      path.join('packages', 'continuedev', 'gui', 'dist', 'assets', 'index.css'),
    ];

    for (const baseDir of baseDirs) {
      for (const subPath of cssSubPaths) {
        candidates.push(path.join(baseDir, subPath));
      }
    }

    // Deduplicate and check existence
    const seen = new Set<string>();
    for (const candidate of candidates) {
      const normalized = path.normalize(candidate);
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      try {
        if (fs.existsSync(normalized)) {
          this.cssPaths.push(normalized);
          this.logger.info(LOG_SOURCE, `Found CSS file: ${normalized}`);
        }
      } catch {
        // skip inaccessible
      }
    }

    if (this.cssPaths.length === 0) {
      this.logger.warn(LOG_SOURCE, 'No Kiro agent chat CSS files found.');
    } else {
      this.logger.info(LOG_SOURCE, `Found ${this.cssPaths.length} CSS file(s) to inject into.`);
    }

    return this.cssPaths;
  }

  /**
   * Legacy method for backward compat — returns first found CSS path.
   */
  findCssFile(): string | undefined {
    if (this.cssPaths.length === 0) {
      this.findCssFiles();
    }
    return this.cssPaths[0];
  }

  /**
   * Check if RTL CSS is already injected in ALL found CSS files.
   */
  isInjected(): boolean {
    if (this.cssPaths.length === 0) { this.findCssFiles(); }
    if (this.cssPaths.length === 0) { return false; }

    // Consider injected if ALL files have the marker
    return this.cssPaths.every(cssPath => {
      try {
        const content = fs.readFileSync(cssPath, 'utf-8');
        return content.includes(MARKER_START) && content.includes(MARKER_END);
      } catch {
        return false;
      }
    });
  }

  /**
   * Inject RTL CSS into ALL found Kiro chat CSS files.
   * Creates backups before modifying.
   * Returns true if any changes were made (reload needed).
   */
  inject(): boolean {
    if (this.cssPaths.length === 0) { this.findCssFiles(); }
    if (this.cssPaths.length === 0) {
      this.logger.error(LOG_SOURCE, 'Cannot inject: no CSS files found.');
      return false;
    }

    let anyChanged = false;

    for (const cssPath of this.cssPaths) {
      try {
        const content = fs.readFileSync(cssPath, 'utf-8');

        // Already injected in this file
        if (content.includes(MARKER_START)) {
          this.logger.info(LOG_SOURCE, `Already injected: ${cssPath}`);
          continue;
        }

        // Create backup
        const backupPath = cssPath + BACKUP_SUFFIX;
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(cssPath, backupPath);
          this.logger.info(LOG_SOURCE, `Backup: ${backupPath}`);
        }

        // Append RTL CSS
        fs.appendFileSync(cssPath, RTL_CSS, 'utf-8');
        this.logger.info(LOG_SOURCE, `Injected into: ${cssPath}`);
        anyChanged = true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error(LOG_SOURCE, `Failed to inject into ${cssPath}: ${error.message}`, error);
      }
    }

    return anyChanged;
  }

  /**
   * Remove injected RTL CSS from ALL files. Restores from backups.
   * Returns true if any changes were made.
   */
  remove(): boolean {
    if (this.cssPaths.length === 0) { this.findCssFiles(); }
    if (this.cssPaths.length === 0) { return false; }

    let anyChanged = false;

    for (const cssPath of this.cssPaths) {
      try {
        const backupPath = cssPath + BACKUP_SUFFIX;

        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, cssPath);
          fs.unlinkSync(backupPath);
          this.logger.info(LOG_SOURCE, `Restored from backup: ${cssPath}`);
          anyChanged = true;
        } else {
          const content = fs.readFileSync(cssPath, 'utf-8');
          if (content.includes(MARKER_START)) {
            const startIdx = content.indexOf(MARKER_START);
            const endIdx = content.indexOf(MARKER_END) + MARKER_END.length;
            const cleaned = content.substring(0, startIdx) + content.substring(endIdx);
            fs.writeFileSync(cssPath, cleaned, 'utf-8');
            this.logger.info(LOG_SOURCE, `Removed markers from: ${cssPath}`);
            anyChanged = true;
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.error(LOG_SOURCE, `Failed to remove from ${cssPath}: ${error.message}`, error);
      }
    }

    return anyChanged;
  }

}
