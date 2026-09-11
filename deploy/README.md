# Deploy examples

Generic nginx and container files. Hosting vendor is **TODO: CONFIGURE**.

| File | Use |
| --- | --- |
| `nginx-spa.conf.example` | SPA `try_files` fallback |
| `nginx-spa.docker.conf` | Same for the example frontend image (`server_name _`) |
| `nginx-api.conf.example` | Reverse proxy to Node |
| `Dockerfile.api` | API image |
| `Dockerfile.web` | nginx + `frontend/dist` |
| `compose.example.yml` | Local/staging compose (uses `../.env`) |

See `DEPLOYMENT.md`.
