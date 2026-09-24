#!/usr/bin/env python3
"""
Print the Cloud Build body the catalyst-data-refresh scheduler job should POST.

The job does not read cloudbuild-refresh.yaml: it POSTs an inline copy of the
build to the Cloud Build REST API, so an edit to the YAML changes nothing until
the job body is replaced too. This turns the YAML into that body — the same
steps, the user substitutions resolved (the REST call carries none), the
snapshot as source, and the build identity the job already uses — so the two
cannot drift by hand-copying.

    python3 scripts/refresh_job_body.py > /tmp/refresh-body.json
    gcloud scheduler jobs update http catalyst-data-refresh --location=us-central1 \\
      --message-body-from-file=/tmp/refresh-body.json
"""
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "cloudbuild-refresh.yaml"
SNAPSHOT = {"bucket": "ada-sectors-508410_cloudbuild", "object": "catalyst/refresh-source.tgz"}
BUILD_IDENTITY = "projects/ada-sectors-508410/serviceAccounts/1019003607640-compute@developer.gserviceaccount.com"


def resolve(value, substitutions: dict):
    if isinstance(value, str):
        for key, replacement in substitutions.items():
            value = value.replace("${" + key + "}", str(replacement))
        return value
    if isinstance(value, list):
        return [resolve(item, substitutions) for item in value]
    if isinstance(value, dict):
        return {key: resolve(item, substitutions) for key, item in value.items()}
    return value


def main() -> int:
    config = yaml.safe_load(CONFIG.read_text(encoding="utf-8"))
    substitutions = config.get("substitutions") or {}
    body = {
        "source": {"storageSource": SNAPSHOT},
        "steps": resolve(config["steps"], substitutions),
        "availableSecrets": config["availableSecrets"],
        "options": config["options"],
        "timeout": config["timeout"],
        "serviceAccount": BUILD_IDENTITY,
    }
    json.dump(body, sys.stdout, indent=1)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
