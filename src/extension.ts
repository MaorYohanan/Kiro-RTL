/**
 * Kiro Chat RTL Auto-Direction — Extension Host entry point.
 *
 * Uses the KiroCssInjector to directly modify the Kiro agent chat CSS file
 * on disk, appending RTL direction rules. This approach avoids integrity check
 * issues since it modifies an extension file, not a system file.
 *
 * On each activation, checks if the CSS is still present (Kiro updates may
 * revert it) and re-injects if needed.
 */

import * as vscode from 'vscode';
import { OutputChannelLogger } from './logging/OutputChannelLogger';
import { KiroCssInjector } from './injection/KiroCssInjector';

const LOG_SOURCE = 'Extension';

let logger: OutputChannelLogger | undefined;
let injector: KiroCssInjector | undefined;

/**
 * Called by VS Code when the extension is activated.
 * Checks if RTL CSS injection is present and injects if needed.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger = new OutputChannelLogger();
  injector = new KiroCssInjector(logger);

  const config = vscode.workspace.getConfiguration('kiroRtl');
  const enabled = config.get<boolean>('enabled', true);

  if (enabled) {
    // Auto-inject on startup if not already injected
    const cssFile = injector.findCssFile();
    if (cssFile && !injector.isInjected()) {
      logger.info(LOG_SOURCE, 'RTL CSS not present in Kiro chat. Injecting...');
      const changed = injector.inject();
      if (changed) {
        const choice = await vscode.window.showInformationMessage(
          'Kiro RTL: CSS injected. Reload window to apply RTL support.',
          'Reload Now',
        );
        if (choice === 'Reload Now') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      }
    } else if (cssFile && injector.isInjected()) {
      logger.info(LOG_SOURCE, 'RTL CSS already active. No action needed.');
    } else {
      logger.warn(LOG_SOURCE, 'Could not find Kiro chat CSS file. RTL injection unavailable.');
    }
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('kiroRtl.activate', async () => {
      if (!injector) { return; }
      injector.findCssFile();
      const changed = injector.inject();
      if (changed) {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      } else {
        vscode.window.showInformationMessage('Kiro RTL: Already active.');
      }
    }),

    vscode.commands.registerCommand('kiroRtl.deactivate', async () => {
      if (!injector) { return; }
      const changed = injector.remove();
      if (changed) {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      } else {
        vscode.window.showInformationMessage('Kiro RTL: Already inactive.');
      }
    }),

    vscode.commands.registerCommand('kiroRtl.openLogs', () => {
      logger?.getChannel().show(true);
    }),
  );

  // Listen for config changes to enabled setting
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kiroRtl.enabled')) {
        const newConfig = vscode.workspace.getConfiguration('kiroRtl');
        const newEnabled = newConfig.get<boolean>('enabled', true);
        if (newEnabled && injector && !injector.isInjected()) {
          const changed = injector.inject();
          if (changed) {
            vscode.window.showInformationMessage(
              'Kiro RTL: CSS injected. Reload window to apply.',
              'Reload Now',
            ).then((choice) => {
              if (choice === 'Reload Now') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
              }
            });
          }
        } else if (!newEnabled && injector && injector.isInjected()) {
          const changed = injector.remove();
          if (changed) {
            vscode.window.showInformationMessage(
              'Kiro RTL: CSS removed. Reload window to apply.',
              'Reload Now',
            ).then((choice) => {
              if (choice === 'Reload Now') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
              }
            });
          }
        }
      }
    }),
  );
}

/**
 * Called by VS Code when the extension is deactivated.
 */
export async function deactivate(): Promise<void> {
  logger?.dispose();
  logger = undefined;
  injector = undefined;
}
