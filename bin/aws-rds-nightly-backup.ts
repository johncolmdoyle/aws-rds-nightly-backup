#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsRdsNightlyBackupStack } from '../lib/aws-rds-nightly-backup-stack';

const app = new cdk.App();
new AwsRdsNightlyBackupStack(app, 'AwsRdsNightlyBackupStack');
