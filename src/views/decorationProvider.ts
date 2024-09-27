import { CancellationToken, Event, FileDecoration, FileDecorationProvider, ProviderResult, ThemeColor, Uri } from "vscode";
import { Status } from "../componentManager";
import ComponentTreeItem from "./components/component";
import WorkflowTreeItem from "./workflows/workflow";

export class DecorationProvider implements FileDecorationProvider {
    onDidChangeFileDecorations?: Event<Uri | Uri[] | undefined> | undefined;
    provideFileDecoration(uri: Uri, token: CancellationToken): ProviderResult<FileDecoration> {
        const params = new URLSearchParams(uri.query);

        if (uri.scheme === ComponentTreeItem.contextValue) {
            if (params.get('status') === Status.Enabled) {
                return {
                    badge: '✅',
                    color: new ThemeColor('GitHubLocalActions.green')
                };
            } else if (params.get('status') === Status.Warning) {
                return {
                    badge: '⚠️',
                    color: new ThemeColor('GitHubLocalActions.yellow')
                };
            } else if (params.get('status') === Status.Disabled) {
                return {
                    badge: '❌',
                    color: new ThemeColor('GitHubLocalActions.red')
                };
            }
        } else if (uri.scheme === WorkflowTreeItem.contextValue) {
            // TODO: Fix color
            if (params.get('error')) {
                return {
                    badge: '❌',
                    color: new ThemeColor('GitHubLocalActions.red')
                };
            }
        }
    }
}