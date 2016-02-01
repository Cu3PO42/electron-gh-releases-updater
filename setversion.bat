@echo off
goto :MAIN

REM -------------------------------------------------------
:WAITPROC
    tasklist /fi "pid eq %1" | find "%1"
    if %errorlevel% == 0 (
        timeout 3 /NOBREAK
        goto :WAITPROC
    )
    goto :EOF
REM -------------------------------------------------------

:MAIN
set rcedit="%~1"
set execPath="%~2"
set versionNumber="%~3"
set pid=%4

echo Updating. Please do not close.
echo Waiting for process %pid% to end.
call :WAITPROC %pid%
echo Process closed.
echo Setting version string of %execPath% to %versionNumber%.
%rcedit% %execPath% --set-file-version %versionNumber% --set-product-version %versionNumber% --set-version-string %versionNumber%
echo Set version string.
echo Restarting %execPath%.
start "" %execPath%
del "%~f0"
