# Deadlock Lab

A small operating systems playground with an HTML, CSS, and JavaScript frontend and a C backend. The C program serves the web files and performs the resource-state algorithms locally.

## Run on Windows

Install a C compiler such as MinGW-w64 and make sure `gcc` is on `PATH`. Then double-click `run.bat`, or run it from PowerShell. The launcher builds into your Windows temporary folder, so a previously locked `deadlock-lab.exe` in the project folder will not block the build. Open [http://127.0.0.1:8080](http://127.0.0.1:8080) in your browser. Stop the server with Ctrl+C. If the server reports that port 8080 is busy, stop the older server first. On organization-managed devices, Device Guard may block unsigned local executables; if that happens, ask IT to authorize this C backend. The launcher cannot change that policy.

To use a different port, run `deadlock-lab.exe 8081` and open `http://127.0.0.1:8081`.

## Run on Linux or macOS

```sh
cc -std=c11 -O2 -Wall -Wextra server.c -o deadlock-lab
./deadlock-lab
```

Then visit `http://127.0.0.1:8080`. The server must be started from this folder so it can find `index.html`, `style.css`, and `app.js`.

## What it demonstrates

- **Detection:** Runs the multiple-instance deadlock detection algorithm. It starts with `Work = Available`, repeatedly completes processes whose outstanding request fits in `Work`, and adds their allocations back. Any process left unfinished is reported as deadlocked.
- **Prevention:** Enforces the **no hold-and-wait** policy. A process holding any resource must release its allocation before submitting a new bundle. Otherwise, the complete bundle is granted atomically when available or the process waits without holding resources.
- Edit allocation, request, and available values, resize the simulation, and load the safe, circular-wait, or prevention sandbox examples.

The browser calls the C server at `/api/detect`, `/api/prevent`, and `/api/release`. The prevention example uses the no-hold-and-wait prevention policy; it is not Banker's deadlock-avoidance algorithm.
