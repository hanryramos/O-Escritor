@echo off
title Musical Escritor
cd /d "%~dp0"
start "" http://localhost:3000
node servidor.js
pause