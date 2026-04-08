@echo off
REM ============================================================
REM  PDD Inventory Sync — Windows Task Scheduler entry point
REM  Run this script every 5 minutes via Task Scheduler.
REM
REM  Setup:
REM    1. Open Task Scheduler → Create Basic Task
REM    2. Trigger: Daily, repeat every 5 minutes indefinitely
REM    3. Action: Start a program
REM       Program:  cmd.exe
REM       Arguments: /c "C:\Stock PDD Project\marketplace\scripts\schedule-sync.bat"
REM       Start in: C:\Stock PDD Project\marketplace
REM ============================================================

cd /d "C:\Stock PDD Project\marketplace"
echo [%DATE% %TIME%] Starting PDD inventory sync...

call npm run sync >> "C:\Stock PDD Project\sync-logs\sync.log" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] Sync completed successfully.
) else (
    echo [%DATE% %TIME%] Sync finished with errors (exit code %ERRORLEVEL%).
)
