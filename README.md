# DevOps Pipeline Demo

A minimal Node.js/TypeScript todo REST API that exists to showcase a complete **GitHub Actions CI/CD pipeline**.  
The application itself is intentionally small. The interesting part is the pipeline.

This README focuses on the DevOps setup: workflows, gating, containerization, and the automated security/dependency tooling.

## Pipeline at a glance

| Trigger | Workflow | Outcome |
|---|---|---|
| Pull request to `main` | `ci.yml` | Lint, tests + coverage gate, CodeQL, dependency review, secret scan, then Docker build (no push) |
| Push to `main` | `ci.yml` | Same as above, minus dependency review (can't run outside of PRs) |
| Push SemVer tag  | `release.yml` | Build the app, then build and publish the Docker image to GHCR |

## CI workflow (`.github/workflows/ci.yml`)

The CI workflow invokes different code quality and security tools **in parallel**, providing feedback to the developer as quickly as possible, then builds the Docker image if all the checks pass.

```
ci ────────────────┐
codeql ────────────┤
dependency-review ─┼──▶ build (docker build, no push)
secret-scan ───────┘
```

### Jobs

#### `ci` — the core validation job
Runs a linter and executes tests.

Enforces a line coverage threshold. The threshold value is **intentionally set inside the pipeline YAML** and not in `vitests.config.ts`. In an enterprise context, this would be an ogranization-wide setting that can be applied either through **templated workflows** or other tools that observe test coverage, e.g. *SonarQube*.

Builds the source code and uploads the compiled `dist/` as a build artifact that the Docker build job will consume (see [Build once, ship once](#build-once-ship-once)).

#### `codeql` job
GitHub Advanced Security scanning using the `security-and-quality` query suite.

#### `dependency-review` job
The GitHub Dependency Review Action is designed to review **only dependency changes between two revisions**, so it only makes sense in the context of a Pull Request.

Ideally, a full dependency tree scanning should be done on the main branch with a tool like JFrog XRay. This is a **shortcoming** of this workflow due to tool limitations: the developer may never find out about newly-disclosed vulnerabilities in already merged code, which would be **unacceptable in an enterprise setting**.

#### `secret-scan` job
Gitleaks scans the repository, including full git history for committed secrets.

#### `build` job
Evaluates the status of all of the above and runs the Docker build only when checks are green.

### Fail-fast and timeout

Steps within each job run top-to-bottom and stop at the first non-zero exit. Every job carries `timeout-minutes: 30` so a stuck run is terminated and reported as failed.

## Release workflow (`.github/workflows/release.yml`)

Triggered by pushing a SemVer version tag (`v*.*.*`). In GitHub, this could be the manual step of creating a release.

There are other (more automated) ways to handle the release process and it mainly depends on the processes in a specific organizaiton. For example, a workflow triggered by `push` to the `main` branch could automatically create and push a Git tag with a build number as well as push an image with the same tag.

I kept it simple for this pipeline:

```
push tag v*.*.* ─▶ application build ─▶ Docker build and publish 
```

Publishing uses the built-in `GITHUB_TOKEN` with `packages: write`, so no external personal access token is required.

## Build once, ship once

The Docker image in this repo **does not use the multi-stage build strategy by design**. The source code builds early in the pipeline to surface compilation errors to the developer **as early as possible**. If this build job is successful, the Docker build job will simply use the build output downloaded from pipeline artifacts and copy the files into the image.

This is **particularly useful** for organizations that track and gate various metrics on each build. Some combinations of code analysis tools and languages/frameworks **require a build to run outside of Docker** in order to produce a report.

**Caveat**: as this is a backend Node.js application, it still needs `package.json` dependencies installed to be able to run the compiled code. This is why Dockerfile includes the `run npm ci --omit=dev` step that allows to install correct platform-specific native modules (if any). This approach would look cleaner with cross-platform self-contained applications that bundle runtime libraries, e.g. a JAR file or  React app bundles.
