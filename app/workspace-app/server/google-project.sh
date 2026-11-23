# Sourced at start: the Google Cloud project is the one the key file belongs to, so a participant
# sets nothing. Without a key file it stays unset and a model cell says how to connect.
if [ -z "${GOOGLE_CLOUD_PROJECT:-}" ] && [ -f "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  GOOGLE_CLOUD_PROJECT="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("project_id",""))' "$GOOGLE_APPLICATION_CREDENTIALS")"
  export GOOGLE_CLOUD_PROJECT
fi
