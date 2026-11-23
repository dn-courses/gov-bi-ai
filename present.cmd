@echo off
rem Cloud Data & AI Agents for BI Developers - start the lesson app beside one lab. Generated; edit the master repo.
rem For a Windows laptop with only Docker Desktop and Git:   present <lab>
rem Written as straight lines, no jumps: those misbehave when a .cmd file loses its CRLF endings.
setlocal
cd /d "%~dp0"
set "LAB=%~1"
set "FILES="
if /i "%LAB%"=="agents" set "FILES=-f labs/agents/compose.yml -f labs/agents/compose.app.yml"
if /i "%LAB%"=="agents" if not exist "labs\agents\seed\01-pagila-schema.sql" curl.exe -fsSL -o "labs\agents\seed\01-pagila-schema.sql" "https://raw.githubusercontent.com/devrimgunduz/pagila/5ba5a57aeb159f75f02aca2432d3c262186d13d3/pagila-schema.sql"
if /i "%LAB%"=="agents" if not exist "labs\agents\seed\02-pagila-data.sql" curl.exe -fsSL -o "labs\agents\seed\02-pagila-data.sql" "https://raw.githubusercontent.com/devrimgunduz/pagila/5ba5a57aeb159f75f02aca2432d3c262186d13d3/pagila-data.sql"
if /i "%LAB%"=="postgres" set "FILES=-f labs/postgres/compose.yml -f labs/postgres/compose.app.yml"
if /i "%LAB%"=="postgres" if not exist "labs\postgres\seed\01-pagila-schema.sql" curl.exe -fsSL -o "labs\postgres\seed\01-pagila-schema.sql" "https://raw.githubusercontent.com/devrimgunduz/pagila/5ba5a57aeb159f75f02aca2432d3c262186d13d3/pagila-schema.sql"
if /i "%LAB%"=="postgres" if not exist "labs\postgres\seed\02-pagila-data.sql" curl.exe -fsSL -o "labs\postgres\seed\02-pagila-data.sql" "https://raw.githubusercontent.com/devrimgunduz/pagila/5ba5a57aeb159f75f02aca2432d3c262186d13d3/pagila-data.sql"
if not defined FILES echo usage: present ^<lab^>   one of: agents, postgres
if not defined FILES exit /b 2
set "APP_LAB=%LAB%"
set "SEED_TALK_DATA=0"
set "ENVFILE="
if exist ".env" set "ENVFILE=--env-file .env"
set "APP_IMAGE=me-west1-docker.pkg.dev/enjoytech-bq-lab/courses/gov-bi-ai:latest"
docker compose %ENVFILE% -p gov-bi-ai -f labs/base/compose.yml %FILES% -f labs/base/compose.app.yml pull workspace
docker compose %ENVFILE% -p gov-bi-ai -f labs/base/compose.yml %FILES% -f labs/base/compose.app.yml up -d --no-build --remove-orphans --force-recreate workspace
if errorlevel 1 exit /b 1
echo Lesson app: http://localhost:3000   lab: %LAB%
