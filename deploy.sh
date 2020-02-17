#!/bin/bash -e

source ./config.sh

BUCKET_NAME="dfs-pipeline"
STACK_NAME="dfs-pipeline-stack"

if aws s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null
then
    echo "Bucket exists: $BUCKET_NAME"
else
    echo "Bucket does not exist, creating: ${BUCKET_NAME}"
    aws s3 mb s3://"${BUCKET_NAME}"
fi

timestamp=$( date +"%Y-%m-%d_%H-%M-%S" )
FILE_NAME="$timestamp-function.zip"

bestzip "$FILE_NAME" src \
node_modules/axios node_modules/follow-redirects node_modules/xml2js node_modules/xmlbuilder node_modules/sax \
node_modules/underscore

echo "### Initiating SAM Deploy..."

aws s3 rm "s3://${BUCKET_NAME}" --recursive --exclude "*" --include "*.zip"
aws s3 cp "${FILE_NAME}" "s3://${BUCKET_NAME}/"
aws s3 cp ./dfs-pipeline-state-machine-definition.yaml "s3://${BUCKET_NAME}/"

if [[ "$OSTYPE" == "msys" ]]; then
    sam.cmd --version
    sam.cmd deploy --template-file ./template.yaml --stack-name "${STACK_NAME}" --capabilities CAPABILITY_IAM \
     --parameter-overrides BucketName="${BUCKET_NAME}" CodeKey="${FILE_NAME}" AwsKey="${AWS_KEY}" \
     AwsSecret="${AWS_SECRET}" FanduelApiRoot="${FANDUEL_API_ROOT}" DanPhoneNumber="${DAN_PHONE_NUMBER}" \
     TonyPhoneNumber="${TONY_PHONE_NUMBER}" --no-fail-on-empty-changeset
else
    sam --version
    sam deploy --template-file ./template.yaml --stack-name "${STACK_NAME}" --capabilities CAPABILITY_IAM \
     --parameter-overrides BucketName="${BUCKET_NAME}" CodeKey="${FILE_NAME}" AwsKey="${AWS_KEY}" \
     AwsSecret="${AWS_SECRET}" FanduelApiRoot="${FANDUEL_API_ROOT}" DanPhoneNumber="${DAN_PHONE_NUMBER}" \
     TonyPhoneNumber="${TONY_PHONE_NUMBER}" --no-fail-on-empty-changeset
fi