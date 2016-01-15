@echo off
goto :MAIN

REM -------------------------------------------------------
:WAITPROC
    tasklist /nh /fi "pid eq %1" | find "%1"
    if %errorlevel% == 0 (
        timeout 3 /NOBREAK
        goto :WAITPROC
    )
    goto :EOF
REM -------------------------------------------------------

:MAIN
call :WAITPROC %1
if exist %3\* (
    rd /s /q %3
) else (
    del %3
)
move /y %2 %3
start %4
del "%~f0"
