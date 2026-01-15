cat > backend/DEV_QUICKSTART.md <<'MD'
# Backend DEV Quickstart (Cleaning SaaS)

## Run
From `backend/`:
- Run server:
  ./venv/bin/python manage.py runserver 0.0.0.0:8001
- Run tests:
  ./venv/bin/python manage.py test

Base URL:
- http://127.0.0.1:8001

## DEV Credentials
Cleaner:
- cleaner@test.com / Test1234!

Manager:
- manager@test.com / Test1234!

## Auth
Cleaner login:
- POST /api/auth/login/

Manager login:
- POST /api/manager/auth/login/

Both return:
- token, user_id, email, full_name, role

Auth header for all protected endpoints:
- Authorization: Token <TOKEN>

## Key Endpoints
Cleaner:
- GET  /api/jobs/today/
- GET  /api/jobs/<id>/
- POST /api/jobs/<id>/check-in/
- POST /api/jobs/<id>/check-out/
- POST /api/jobs/<job_id>/checklist/<item_id>/toggle/
- POST /api/jobs/<job_id>/checklist/bulk/
- GET  /api/jobs/<id>/photos/
- POST /api/jobs/<id>/photos/ (multipart: photo_type=before|after, file=@/path/to.jpg)
- DELETE /api/jobs/<id>/photos/<photo_type>/
- POST /api/jobs/<id>/report/pdf/

Manager:
- GET  /api/manager/jobs/today/
- GET  /api/manager/jobs/<id>/
- POST /api/jobs/<id>/report/pdf/
MD
