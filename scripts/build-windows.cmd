@echo off
setlocal
cd /d "%~dp0.."
call pnpm build:app || exit /b 1
call pnpm exec electron-builder --config electron-builder.yml --win nsis zip --x64
exit /b %errorlevel%
