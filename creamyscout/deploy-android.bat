@echo off
setlocal
pushd %~dp0
call npm run build
call npx cap copy android || exit /b 1
call npx cap sync android || exit /b 1
call npx cap open android
