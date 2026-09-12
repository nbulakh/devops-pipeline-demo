# Requirements

We are building a small Node.js/Typescript API to manage a todo list. This is a demo project whose goal is showcasing the devops capabilities. The main focus is on the CI/CD pipeline.

1. Application functional requirements:
- POST endpoint to create a todo item
- GET endpoint to list all items
- DELETE endpoint to remote a todo item

2. Non-functional requirements:
- Must have unit tests
- No authentication is required on the endpoints

3. Pipeline requirements
Use GitHub workflows to handle 3 different scenarios:
### Pull request or push to main branch:
1. Run linter
1. Run unit tests with coverage
1. Run integration tests
1. Security/vulnerability check
1. App build
1. Docker build

### Push of a new semver tag:
1. App build
1. Docker build
1. Publish image to container registry (GHCR)



