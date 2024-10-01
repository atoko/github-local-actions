import * as child_process from 'child_process';
import * as path from "path";
import { commands, CustomExecution, env, EventEmitter, Pseudoterminal, ShellExecution, TaskDefinition, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, TaskScope, TerminalDimensions, window, workspace } from "vscode";
import { ComponentsManager } from "./componentsManager";
import { SettingsManager } from './settingsManager';
import { Workflow, WorkflowsManager } from "./workflowsManager";

export enum EventTrigger {
    BranchProtectionRule = 'branch_protection_rule',
    CheckRun = 'check_run',
    CheckSuite = 'check_suite',
    Create = 'create',
    Delete = 'delete',
    Deployment = 'deployment',
    DeploymentStatus = 'deployment_status',
    Discussion = 'discussion',
    DiscussionComment = 'discussion_comment',
    Fork = 'fork',
    Gollum = 'gollum',
    IssueComment = 'issue_comment',
    Issues = 'issues',
    Label = 'label',
    MergeGroup = 'merge_group',
    Milestone = 'milestone',
    PageBuild = 'page_build',
    Public = 'public',
    PullRequest = 'pull_request',
    PullRequestComment = 'pull_request_comment',
    PullRequestReview = 'pull_request_review',
    PullRequestReviewComment = 'pull_request_review_comment',
    PullRequestTarget = 'pull_request_target',
    Push = 'push',
    RegistryPackage = 'registry_package',
    Release = 'release',
    RepositoryDispatch = 'repository_dispatch',
    Schedule = 'schedule',
    Status = 'status',
    Watch = 'watch',
    WorkflowCall = 'workflow_call',
    WorkflowDispatch = 'workflow_dispatch',
    WorkflowRun = 'workflow_run'
}

export enum Option {
    Workflows = '-W',
    Variable = '-var'
}

export class Act {
    private static base: string = 'act';
    componentsManager: ComponentsManager;
    workflowsManager: WorkflowsManager;
    settingsManager: SettingsManager;
    installationCommands: { [packageManager: string]: string };
    prebuiltExecutables: { [architecture: string]: string };

    constructor() {
        this.componentsManager = new ComponentsManager();
        this.workflowsManager = new WorkflowsManager();
        this.settingsManager = new SettingsManager();

        switch (process.platform) {
            case 'win32':
                this.installationCommands = {
                    'Chocolatey': 'choco install act-cli',
                    'Winget': 'winget install nektos.act',
                    'Scoop': 'scoop install act',
                    'GitHub CLI': 'gh extension install https://github.com/nektos/gh-act'
                };

                this.prebuiltExecutables = {
                    'Windows 64-bit (arm64/aarch64)': 'https://github.com/nektos/act/releases/latest/download/act_Windows_arm64.zip',
                    'Windows 64-bit (amd64/x86_64)': 'https://github.com/nektos/act/releases/latest/download/act_Windows_x86_64.zip',
                    'Windows 32-bit (armv7)': 'https://github.com/nektos/act/releases/latest/download/act_Windows_armv7.zip',
                    'Windows 32-bit (i386/x86)': 'https://github.com/nektos/act/releases/latest/download/act_Windows_i386.zip'
                };
                break;
            case 'darwin':
                this.installationCommands = {
                    'Homebrew': 'brew install act',
                    'Nix': 'nix run nixpkgs#act',
                    'MacPorts': 'sudo port install act',
                    'GitHub CLI': 'gh extension install https://github.com/nektos/gh-act'
                };
                
                this.prebuiltExecutables = {
                    'macOS 64-bit (Apple Silicon)': 'https://github.com/nektos/act/releases/latest/download/act_Darwin_arm64.tar.gz',
                    'macOS 64-bit (Intel)': 'https://github.com/nektos/act/releases/latest/download/act_Darwin_x86_64.tar.gz'
                };
                break;
            case 'linux':
                this.installationCommands = {
                    'Homebrew': 'brew install act',
                    'Nix': 'nix run nixpkgs#act',
                    'AUR': 'yay -Syu act',
                    'COPR': 'dnf copr enable goncalossilva/act && dnf install act-cli',
                    'GitHub CLI': 'gh extension install https://github.com/nektos/gh-act'
                };
                
                this.prebuiltExecutables = {
                    'Linux 64-bit (arm64/aarch64)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_arm64.tar.gz',
                    'Linux 64-bit (amd64/x86_64)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_x86_64.tar.gz',
                    'Linux 32-bit (armv7)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_armv7.tar.gz',
                    'Linux 32-bit (armv6)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_armv6.tar.gz',
                    'Linux 32-bit (i386/x86)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_i386.tar.gz',
                };
                break;
            default:
                this.installationCommands = {};
                this.prebuiltExecutables = {};
        }
    }

    async runAllWorkflows() {
        // TODO: Implement
    }

    async runEvent(eventTrigger: EventTrigger) {
        // return await this.runCommand(`${Act.base} ${eventTrigger}`);
    }

    async runWorkflow(workflow: Workflow) {
        return await this.runCommand(workflow, `${Act.base} ${Option.Workflows} ".github/workflows/${path.parse(workflow.uri.fsPath).base}"`);
    }

    async runCommand(workflow: Workflow, command: string) {
        const unreadyComponents = await this.componentsManager.getUnreadyComponents();
        if (unreadyComponents.length > 0) {
            window.showErrorMessage(`The following required components are not ready: ${unreadyComponents.map(component => component.name).join(', ')}`, 'Fix...').then(async value => {
                if (value === 'Fix...') {
                    await commands.executeCommand('components.focus');
                }
            });
            return;
        }

        const workspaceFolder = workspace.getWorkspaceFolder(workflow.uri);
        if (!workspaceFolder) {
            window.showErrorMessage('Failed to detect workspace folder');
            return;
        }

        await tasks.executeTask({
            name: workflow.name,
            detail: 'Run workflow',
            definition: { type: 'GitHub Local Actions' },
            source: 'GitHub Local Actions',
            scope: workspaceFolder || TaskScope.Workspace,
            isBackground: true,
            presentationOptions: {
                reveal: TaskRevealKind.Always,
                focus: false,
                clear: true,
                close: false,
                echo: true,
                panel: TaskPanelKind.Dedicated,
                showReuseMessage: false
            },
            problemMatchers: [],
            runOptions: {},
            group: TaskGroup.Build,
            execution: new CustomExecution(async (resolvedDefinition: TaskDefinition): Promise<Pseudoterminal> => {
                const writeEmitter = new EventEmitter<string>();
                const closeEmitter = new EventEmitter<number>();

                return {
                    onDidWrite: writeEmitter.event,
                    onDidClose: closeEmitter.event,
                    open: async (initialDimensions: TerminalDimensions | undefined): Promise<void> => {
                        writeEmitter.fire(`Workflow:    ${workflow.name}\r\n`);
                        writeEmitter.fire(`Path:        ${workflow.uri.fsPath}\r\n`);
                        writeEmitter.fire(`Command:     ${command}\r\n`);
                        writeEmitter.fire(`Environments: OSSBUILD\r\n`);
                        writeEmitter.fire(`Variables:   VARIABLE1=ABC, VARIABLE2=DEF\r\n`);
                        writeEmitter.fire(`Secrets:     SECRET1=ABC, SECRET2=DEF\r\n`);
                        writeEmitter.fire(`Timestamp:   ${new Date().toLocaleTimeString()}\r\n`);
                        writeEmitter.fire(`\r\n`);

                        const exec = child_process.spawn(command, { cwd: workspaceFolder.uri.fsPath, shell: env.shell });
                        exec.stdout.on('data', (data) => {
                            const output = data.toString().replaceAll('\n', '\r\n');
                            writeEmitter.fire(output);
                        });

                        exec.stderr.on('data', (data) => {
                            const error = data.toString();
                            writeEmitter.fire(error);
                        });

                        exec.on('close', (code) => {
                            closeEmitter.fire(code || 0);
                        });
                    },

                    close: () => { }
                };
            })
        });
    }

    async install(packageManager: string) {
        const command = this.installationCommands[packageManager];
        if (command) {
            await tasks.executeTask({
                name: 'nektos/act',
                detail: 'Install nektos/act',
                definition: { type: 'GitHub Local Actions' },
                source: 'GitHub Local Actions',
                scope: TaskScope.Workspace,
                isBackground: true,
                presentationOptions: {
                    reveal: TaskRevealKind.Always,
                    focus: false,
                    clear: true,
                    close: false,
                    echo: true,
                    panel: TaskPanelKind.Shared,
                    showReuseMessage: false
                },
                problemMatchers: [],
                runOptions: {},
                group: TaskGroup.Build,
                execution: new ShellExecution(command)
            });
        }
    }
}