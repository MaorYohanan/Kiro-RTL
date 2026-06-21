/**
 * OutputChannelLogger — structured logging to a VS Code Output Channel.
 *
 * Components: Error Handling / Output Channel
 * Requirements: 6.5
 *
 * Features:
 * - Log messages formatted as: [ISO timestamp] [LEVEL] [source] message
 * - Stack trace appended when an Error is provided.
 * - Filtered by `kiroRtl.logging.level` configuration.
 * - Rate limiting: after 3 identical (level, source, message) entries, subsequent
 *   occurrences are throttled with a single "throttled" notice.
 */

import * as vscode from 'vscode';

/** Log severity levels ordered by priority (lower index = more verbose). */
const LOG_LEVELS = ['info', 'warn', 'error'] as const;
type LogLevel = typeof LOG_LEVELS[number];

/** Maximum identical messages before throttling kicks in. */
const THROTTLE_THRESHOLD = 3;

/**
 * Builds a composite key for rate-limiting deduplication.
 */
function throttleKey(level: LogLevel, source: string, message: string): string {
  return `${level}|${source}|${message}`;
}

/**
 * OutputChannelLogger provides structured, level-filtered, rate-limited logging
 * to the "Kiro RTL Auto-Direction" VS Code Output Channel.
 */
export class OutputChannelLogger {
  private readonly channel: vscode.OutputChannel;
  private readonly hitCounts: Map<string, number> = new Map();

  /**
   * Creates or reuses a VS Code OutputChannel.
   * @param channel - Optional pre-existing channel (useful for testing / DI).
   *                  If omitted, a new channel named "Kiro RTL Auto-Direction" is created.
   */
  constructor(channel?: vscode.OutputChannel) {
    this.channel = channel ?? vscode.window.createOutputChannel('Kiro RTL Auto-Direction');
  }

  /**
   * Log an informational message.
   */
  info(source: string, message: string): void {
    this.log('info', source, message);
  }

  /**
   * Log a warning message.
   */
  warn(source: string, message: string): void {
    this.log('warn', source, message);
  }

  /**
   * Log an error message, optionally attaching a stack trace.
   */
  error(source: string, message: string, err?: Error): void {
    this.log('error', source, message, err);
  }

  /**
   * Exposes the underlying OutputChannel (e.g. for "Open Logs" command).
   */
  getChannel(): vscode.OutputChannel {
    return this.channel;
  }

  /**
   * Disposes the output channel.
   */
  dispose(): void {
    this.channel.dispose();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  /**
   * Core logging method with level filtering and rate limiting.
   */
  private log(level: LogLevel, source: string, message: string, err?: Error): void {
    // Level filtering: only emit if the message level is >= configured level.
    if (!this.isLevelEnabled(level)) {
      return;
    }

    // Rate limiting per (level, source, message) tuple.
    const key = throttleKey(level, source, message);
    const count = (this.hitCounts.get(key) ?? 0) + 1;
    this.hitCounts.set(key, count);

    if (count > THROTTLE_THRESHOLD) {
      // Emit a single throttle notice on the first suppression only.
      if (count === THROTTLE_THRESHOLD + 1) {
        const throttleNotice = this.formatLine(level, source, `(throttled) repeated: ${message}`);
        this.channel.appendLine(throttleNotice);
      }
      return;
    }

    // Format and emit.
    const line = this.formatLine(level, source, message);
    this.channel.appendLine(line);

    // Append stack trace if available.
    if (err?.stack) {
      this.channel.appendLine(err.stack);
    }
  }

  /**
   * Formats a single log line following the pattern:
   * [ISO timestamp] [LEVEL] [source] message
   */
  private formatLine(level: LogLevel, source: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message}`;
  }

  /**
   * Determines whether a given level passes the configured minimum threshold.
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const configuredLevel = this.getConfiguredLevel();
    const configuredIndex = LOG_LEVELS.indexOf(configuredLevel);
    const messageIndex = LOG_LEVELS.indexOf(level);
    return messageIndex >= configuredIndex;
  }

  /**
   * Reads the configured log level from VS Code settings.
   * Falls back to 'warn' if the setting is missing or invalid.
   */
  private getConfiguredLevel(): LogLevel {
    const config = vscode.workspace.getConfiguration('kiroRtl.logging');
    const value = config.get<string>('level');
    if (value && (LOG_LEVELS as readonly string[]).includes(value)) {
      return value as LogLevel;
    }
    return 'warn';
  }
}
