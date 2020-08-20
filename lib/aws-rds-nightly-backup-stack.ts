import * as cdk from '@aws-cdk/core';
import * as backup_service from '../lib/backup_service';

export class AwsRdsNightlyBackupStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new backup_service.RDSBackupService(this, 'RDSBackup');
  }
}
