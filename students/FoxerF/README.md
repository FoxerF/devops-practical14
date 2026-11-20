# Focus Session Tracker

A small REST API for recording study sessions and viewing study-time statistics.

## Features

- Create study sessions.
- List all recorded sessions.
- Filter sessions by subject.
- Delete sessions.
- View total study time and statistics.
- Persist session data using a Docker named volume.

## Technology

- Node.js 26
- Express 5
- Docker
- Docker Hub
- Terraform
- AWS EC2
- GitHub Actions

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | Create a session |
| DELETE | `/api/sessions/:id` | Delete a session |
| GET | `/api/stats` | View statistics |

### Example session request

```json
{
  "title": "Kubernetes Practical",
  "subject": "DevOps",
  "durationMinutes": 45
}
```

## Local Docker execution

Build the image:

```powershell
docker build -t focus-session-tracker:local .
```

Create a persistent volume:

```powershell
docker volume create focus-session-data
```

Run the application:

```powershell
docker run -d --name focus-session-tracker -p 3000:3000 --mount source=focus-session-data,target=/app/data focus-session-tracker:local
```

Open:

- http://localhost:3000/
- http://localhost:3000/health
- http://localhost:3000/api/sessions
- http://localhost:3000/api/stats

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DATA_FILE` | `/app/data/sessions.json` | Location of the persistent JSON data file |

## Infrastructure

Terraform provisions:

- One Ubuntu 24.04 EC2 instance.
- One security group.
- One EC2 SSH key pair.

The EC2 user-data script installs Docker automatically.

Terraform state is stored in an encrypted S3 backend with versioning and state locking.

## CI/CD pipeline

A push or merge to `main` triggers GitHub Actions.

1. Checks out the repository.
2. Builds the Docker image.
3. Pushes the image to Docker Hub using a commit-based tag and `latest`.
4. Configures AWS credentials.
5. Runs Terraform init, plan and apply.
6. Retrieves the EC2 public IP.
7. Connects to EC2 over SSH.
8. Pulls the new Docker image.
9. Replaces the application container.
10. Checks the application health endpoint.

The Docker volume is reused during deployment, preserving saved study sessions.

## GitHub Secrets

| Secret | Purpose |
|---|---|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_TOKEN` | Docker Hub personal access token |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key |
| `EC2_SSH_KEY_B64` | Base64-encoded SSH private key |
| `EC2_SSH_PUBLIC_KEY` | SSH public key used by Terraform |
| `TF_STATE_BUCKET` | S3 bucket used for Terraform state |


## Destroy infrastructure

From the `infra` directory, initialize Terraform with the same S3 backend and run:

```powershell
terraform destroy
```

After Terraform destroys the EC2 resources, the S3 state bucket must also be emptied and deleted manually.