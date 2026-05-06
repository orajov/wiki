@echo off
setlocal
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"

pushd "%~dp0"
set "ROOT=%CD:\=/%"
set "URL=file:///%ROOT%/index.html"
popd

if not exist "%CHROME%" (
  echo Google Chrome not found in:
  echo   %CHROME%
  echo Update CHROME variable in start.bat or install Chrome from google.com/chrome
  pause
  exit /b 1
)

start "" "%CHROME%" --allow-file-access-from-files "%URL%"
