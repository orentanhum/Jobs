@echo off
setlocal
cd /d C:\Users\Tanthum\Jobs
set PATH=C:\Program Files\nodejs;%PATH%
set NODE_ENV=development
"C:\Program Files\nodejs\npm.cmd" run dev
