@echo off
setlocal
cd /d "%~dp0.."
call pnpm build:app || exit /b 1
call pnpm exec cap sync android || exit /b 1
cd android
call gradlew.bat assembleDebug
exit /b %errorlevel%
