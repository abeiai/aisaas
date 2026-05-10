FROM python:3.12-slim-bookworm AS base
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

FROM base AS deps
COPY apps/ai-gateway/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM base AS runner
COPY --from=deps /install /usr/local
COPY apps/ai-gateway/app ./app

RUN useradd --create-home --uid 1001 appuser
USER appuser

EXPOSE 7343
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7343"]
