import * as core from "@aws-cdk/core";
import * as s3 from '@aws-cdk/aws-s3';

export class RDSBackupService extends core.Construct {
  constructor(scope: core.Construct, id: string) {
    super(scope, id);

    const sqlScriptsBucket = new s3.Bucket(this, 'sqlScriptsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED
    });

    const rdsBackupsBucket = new s3.Bucket(this, 'rdsBackupsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED
    });
  }
}
