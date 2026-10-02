@echo off
title Hidden Epic Offline Launcher

echo [1/4] Podman machine starting...
podman machine start

echo [2/4] Local rogueserver starting...
cd /d C:\Game\rogueserver
podman compose -f docker-compose.Development.yml up -d

echo [3/4] Hidden Epic client starting...
cd /d C:\Game\pokerogue-hidden-epic
start "Hidden Epic Client" cmd /k "pnpm run start:dev"

echo [4/4] Waiting for client...
timeout /t 4 /nobreak >nul

start "" "https://localhost:8000/"

exit