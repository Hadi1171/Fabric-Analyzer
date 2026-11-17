@echo off
cd /d %~dp0
call .venv\Scripts\activate
pyinstaller --noconfirm --clean --windowed --name "Fabric 3D" app.py
echo Build output: dist\Fabric 3D\Fabric 3D.exe
pause
