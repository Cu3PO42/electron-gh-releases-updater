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
:SAFEDELETEPROC
    if exist %1\* (
        rd /s /q %1
    ) else (
        del %1
    )
    if exist %1 (
        echo Could not delete %1. Please close all programs that have it open.
        echo Press enter to continue.
        pause
        goto :SAFEDELETEPROC
    )
    goto :EOF
REM -------------------------------------------------------

:MAIN
set pid=%1
set tempFolder="%~2"
set appFolder="%~3"
set execPath="%~4"

echo Updating. Please do not close.
echo Waiting for process %1 to end.
call :WAITPROC %pid%
echo Process closed.
echo Deleting %appFolder%.
call :SAFEDELETEPROC %appFolder%
echo Deleted %appFolder%. Moving %tempFolder% there.
move /y %tempFolder% %appFolder%
echo Restarting application %execPath%.
start "" %execPath%
del "%~f0"
