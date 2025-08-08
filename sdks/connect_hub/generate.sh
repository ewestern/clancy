set -eux

find src/* -delete
openapi-generator generate \
  -i "http://localhost:3001/openapi.json" \
  -g typescript-fetch \
  -c ./config.yaml \
  -o src/
npm run build
