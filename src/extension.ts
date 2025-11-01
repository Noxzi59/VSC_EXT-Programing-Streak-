import * as vscode from 'vscode';

let timer: NodeJS.Timeout | null = null;
let startTime: number | null = null;
let totalTime: number = 0;
let statusBarItem: vscode.StatusBarItem;
let startStopButton: vscode.StatusBarItem;
let currentSessionStart: Date | null = null;

interface DailyCodingData {
    date: string;
    totalTime: number;
    sessions: { start: Date; end: Date; duration: number }[];
}

let codingData: { [date: string]: DailyCodingData } = {};

function getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
}

function saveCodingData(context: vscode.ExtensionContext) {
    context.globalState.update('codingData', codingData);
}

function loadCodingData(context: vscode.ExtensionContext) {
    const saved = context.globalState.get('codingData', {});
    codingData = saved as { [date: string]: DailyCodingData };
}

function startTimer() {
    if (timer) {
        vscode.window.showInformationMessage('Timer is already running!');
        return;
    }

    startTime = Date.now();
    currentSessionStart = new Date();
    const today = getTodayDateString();

    if (!codingData[today]) {
        codingData[today] = {
            date: today,
            totalTime: 0,
            sessions: []
        };
    }

    timer = setInterval(() => {
        if (startTime) {
            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            statusBarItem.text = `Programming Time: ${minutes}m ${seconds}s`;
        }
    }, 1000);

    startStopButton.text = '$(stop) Stop';
    vscode.window.showInformationMessage('Programming timer started!');
}

function stopTimer() {
    if (!timer || !startTime || !currentSessionStart) {
        vscode.window.showInformationMessage('No timer is running!');
        return;
    }

    const elapsed = Date.now() - startTime;
    totalTime += elapsed;

    const sessionEnd = new Date();
    const today = getTodayDateString();

    if (codingData[today]) {
        codingData[today].totalTime += elapsed;
        codingData[today].sessions.push({
            start: currentSessionStart,
            end: sessionEnd,
            duration: elapsed
        });
    }

    if (timer) {
        clearInterval(timer);
        timer = null;
    }

    startTime = null;
    currentSessionStart = null;

    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
    statusBarItem.text = `Programming Time: ${Math.floor(totalTime / 60000)}m ${Math.floor((totalTime % 60000) / 1000)}s`;
    startStopButton.text = '$(play) Start';
    vscode.window.showInformationMessage(`Timer stopped! Elapsed time: ${elapsedMinutes}m ${elapsedSeconds}s`);
}

function calculateStreak(): { currentStreak: number; longestStreak: number; last7Days: { date: string; coded: boolean; time: number }[] } {
    const dates = Object.keys(codingData).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate streaks
    for (let i = dates.length - 1; i >= 0; i--) {
        const date = dates[i];
        const data = codingData[date];
        const hasCoded = data.totalTime > 0; // Consider coding if more than 0 time

        if (hasCoded) {
            tempStreak++;
            if (i === dates.length - 1) currentStreak = tempStreak;
        } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 0;
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Get last 7 days
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const data = codingData[dateStr];
        last7Days.push({
            date: dateStr,
            coded: data ? data.totalTime > 0 : false,
            time: data ? data.totalTime : 0
        });
    }

    return { currentStreak, longestStreak, last7Days };
}

function createStreakDashboard(context: vscode.ExtensionContext): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
        'codingStreakDashboard',
        'Coding Streak Dashboard',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: []
        }
    );

    const streakData = calculateStreak();

    panel.webview.html = getWebviewContent(streakData);

    return panel;
}

function getWebviewContent(streakData: { currentStreak: number; longestStreak: number; last7Days: { date: string; coded: boolean; time: number }[] }): string {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Coding Streak Dashboard</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
                font-size: 14px;
                line-height: 1.5;
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                margin: 0;
                padding: 20px;
                min-height: 100vh;
            }
            .container {
                max-width: 1000px;
                margin: 0 auto;
            }

            /* Header section */
            .header {
                border-bottom: 1px solid var(--vscode-panel-border);
                padding-bottom: 16px;
                margin-bottom: 24px;
            }

            .repo-header {
                display: flex;
                align-items: center;
                margin-bottom: 16px;
            }

            .repo-title {
                font-size: 24px;
                font-weight: 600;
                color: var(--vscode-editor-foreground);
                margin: 0;
            }

            .repo-badge {
                background-color: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                font-size: 12px;
                padding: 2px 6px;
                border-radius: 12px;
                margin-left: 8px;
            }

            .repo-description {
                color: var(--vscode-descriptionForeground);
                margin: 8px 0 0 0;
                font-size: 14px;
            }

            /* Stats section */
            .stats-section {
                margin-bottom: 24px;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
            }

            .stat-card {
                background-color: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-widget-border);
                border-radius: 6px;
                padding: 16px;
                text-align: center;
            }

            .stat-number {
                font-size: 48px;
                font-weight: 300;
                color: var(--vscode-textLink-foreground);
                line-height: 1.25;
                margin-bottom: 4px;
            }

            .stat-label {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
            }

            /* Contribution graph section */
            .graph-section {
                margin-bottom: 24px;
            }

            .section-header {
                font-size: 16px;
                font-weight: 600;
                color: var(--vscode-editor-foreground);
                margin-bottom: 8px;
            }

            .graph-container {
                background-color: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-widget-border);
                border-radius: 6px;
                padding: 16px;
            }

            .graph-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .graph-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--vscode-editor-foreground);
            }

            .legend {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .legend-item {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
            }

            .legend-color {
                width: 10px;
                height: 10px;
                border-radius: 2px;
            }

            .contribution-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 2px;
                max-width: 600px;
            }

            .day-cell {
                width: 12px;
                height: 12px;
                border-radius: 2px;
                background-color: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
                position: relative;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .day-cell.coded {
                background-color: #39d353;
                border-color: #26a641;
            }

            .day-cell:hover {
                transform: scale(1.5);
                z-index: 10;
            }

            .day-tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background-color: var(--vscode-quickInput-background);
                color: var(--vscode-quickInput-foreground);
                border: 1px solid var(--vscode-widget-border);
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .day-cell:hover .day-tooltip {
                opacity: 1;
            }

            .month-labels {
                display: flex;
                justify-content: space-between;
                margin-top: 8px;
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
            }

            /* Activity section */
            .activity-section {
                background-color: var(--vscode-editorWidget-background);
                border: 1px solid var(--vscode-widget-border);
                border-radius: 6px;
                padding: 16px;
            }

            .activity-header {
                font-size: 14px;
                font-weight: 600;
                color: var(--vscode-editor-foreground);
                margin-bottom: 16px;
            }

            .activity-list {
                max-height: 300px;
                overflow-y: auto;
            }

            .activity-item {
                display: flex;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-list-inactiveSelectionBackground);
            }

            .activity-item:last-child {
                border-bottom: none;
            }

            .activity-icon {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background-color: #39d353;
                margin-right: 12px;
                flex-shrink: 0;
            }

            .activity-content {
                flex: 1;
            }

            .activity-title {
                font-size: 12px;
                color: var(--vscode-editor-foreground);
                margin-bottom: 2px;
            }

            .activity-meta {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
            }

            .activity-time {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
                margin-left: auto;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header section -->
            <div class="header">
                <div class="repo-header">
                    <div class="repo-title">Programming Time Tracker</div>
                    <span class="repo-badge">Extension</span>
                </div>
                <p class="repo-description">Track your coding streaks and maintain consistency in your programming journey</p>
            </div>

            <!-- Stats section -->
            <div class="stats-section">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${streakData.currentStreak}</div>
                        <div class="stat-label">Current streak</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${streakData.longestStreak}</div>
                        <div class="stat-label">Longest streak</div>
                    </div>
                </div>
            </div>

            <!-- Contribution graph section -->
            <div class="graph-section">
                <h3 class="section-header">Coding activity</h3>
                <div class="graph-container">
                    <div class="graph-header">
                        <div class="graph-title">Last 7 days</div>
                        <div class="legend">
                            <div class="legend-item">
                                <div class="legend-color" style="background-color: #39d353;"></div>
                                <span>Coded</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-color" style="background-color: var(--vscode-input-background); border: 1px solid var(--vscode-input-border);"></div>
                                <span>No coding</span>
                            </div>
                        </div>
                    </div>

                    <div class="contribution-grid">
                        ${streakData.last7Days.map((day, index) => `
                            <div class="day-cell ${day.coded ? 'coded' : ''}" data-date="${day.date}">
                                <div class="day-tooltip">
                                    <div style="font-weight: 600; margin-bottom: 4px;">${new Date(day.date).toLocaleDateString()}</div>
                                    <div>${day.coded ? `${Math.floor(day.time / 60000)}m ${Math.floor((day.time % 60000) / 1000)}s coding` : 'No coding activity'}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="month-labels">
                        <span>${new Date(streakData.last7Days[0].date).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span>${new Date(streakData.last7Days[6].date).toLocaleDateString('en-US', { month: 'short' })}</span>
                    </div>
                </div>
            </div>

            <!-- Activity section -->
            <div class="activity-section">
                <div class="activity-header">Recent coding sessions</div>
                <div class="activity-list">
                    ${Object.values(codingData)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map(day => `
                            <div class="activity-item">
                                <div class="activity-icon"></div>
                                <div class="activity-content">
                                    <div class="activity-title">Coding session on ${new Date(day.date).toLocaleDateString()}</div>
                                    <div class="activity-meta">${day.sessions.length} session${day.sessions.length !== 1 ? 's' : ''}</div>
                                </div>
                                <div class="activity-time">${Math.floor(day.totalTime / 60000)}m ${Math.floor((day.totalTime % 60000) / 1000)}s</div>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Programming Time Tracker is now active!');

    // Load saved data
    loadCodingData(context);

    // Create status bar item for displaying time
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'programming-time-tracker.showTime';
    statusBarItem.text = 'Programming Time: 0m 0s';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Create start/stop button
    startStopButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
    startStopButton.command = 'programming-time-tracker.toggleTimer';
    startStopButton.text = '$(play) Start';
    startStopButton.tooltip = 'Start/Stop Programming Timer';
    startStopButton.show();
    context.subscriptions.push(startStopButton);

    // Register commands
    let startTimerCommand = vscode.commands.registerCommand('programming-time-tracker.startTimer', () => {
        startTimer();
    });

    let stopTimerCommand = vscode.commands.registerCommand('programming-time-tracker.stopTimer', () => {
        stopTimer();
        saveCodingData(context);
    });

    let toggleTimerCommand = vscode.commands.registerCommand('programming-time-tracker.toggleTimer', () => {
        if (timer) {
            stopTimer();
            saveCodingData(context);
        } else {
            startTimer();
        }
    });

    let showTimeCommand = vscode.commands.registerCommand('programming-time-tracker.showTime', () => {
        const totalMinutes = Math.floor(totalTime / 60000);
        const totalSeconds = Math.floor((totalTime % 60000) / 1000);
        vscode.window.showInformationMessage(`Total programming time: ${totalMinutes}m ${totalSeconds}s`);
    });

    let showStreakDashboardCommand = vscode.commands.registerCommand('programming-time-tracker.showStreakDashboard', () => {
        createStreakDashboard(context);
    });

    context.subscriptions.push(startTimerCommand);
    context.subscriptions.push(stopTimerCommand);
    context.subscriptions.push(toggleTimerCommand);
    context.subscriptions.push(showTimeCommand);
    context.subscriptions.push(showStreakDashboardCommand);
}

export function deactivate() {
    if (timer) {
        clearInterval(timer);
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}