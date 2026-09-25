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

The nightly web-watch screen (cloudbuild-screen.yaml) is posted the same way,
from its own snapshot, with any substitution overridden on the command line:

    python3 scripts/refresh_job_body.py --config cloudbuild-screen.yaml \\
      --snapshot-object catalyst/screen-source.tgz [--sub _APPLY=--apply]
"""
import argparse
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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default=str(CONFIG), help="Cloud Build YAML to inline")
    parser.add_argument("--snapshot-object", default=SNAPSHOT["object"], help="source tarball in the snapshot bucket")
    parser.add_argument("--sub", action="append", default=[], metavar="KEY=VALUE", help="override one substitution")
    args = parser.parse_args(argv)
    config = yaml.safe_load(Path(args.config).read_text(encoding="utf-8"))
    substitutions = dict(config.get("substitutions") or {})
    for item in args.sub:
        key, sep, value = item.partition("=")
        if not sep or key not in substitutions:
            parser.error(f"--sub {item!r}: not KEY=VALUE for a substitution the config declares")
        substitutions[key] = value
    body = {
        "source": {"storageSource": {**SNAPSHOT, "object": args.snapshot_object}},
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
