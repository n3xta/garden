@echo off
setlocal

set "INPUT_DIR=pngs"
set "OUTPUT_DIR=webps"


if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%"
)

for %%f in (%INPUT_DIR%\*.png) do (
    set "filename=%%~nf"
    call cwebp -q 80 "%%f" -o "%OUTPUT_DIR%\%%~nf.webp"
    echo Converted: %%~nxf → %%~nf.webp
)

echo All PNG files have been converted to WebP.
pause
