aws s3 rm s3://g-scan-staging --recursive
aws s3 cp ./dist/ s3://g-scan-staging/ --recursive
