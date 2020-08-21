import * as core from "@aws-cdk/core";
import * as s3 from '@aws-cdk/aws-s3';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as events from '@aws-cdk/aws-events';
import * as eventstargets from '@aws-cdk/aws-events-targets';

export class RDSBackupService extends core.Construct {
  constructor(scope: core.Construct, id: string) {
    super(scope, id);

    const rdsBackupsBucket = new s3.Bucket(this, 'rdsBackupsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED
    });

    const backupInstanceRole = new iam.Role(this, 'backupInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    const backupInstanceProfile = new iam.CfnInstanceProfile(
      this,
      'backupInstanceProfile',
      {
        roles: [
          backupInstanceRole.roleName,
        ],
      }
    );

    backupInstanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [rdsBackupsBucket.bucketArn + '/*'],
        actions: [            
          's3:PutObject',
          's3:PutObjectAcl'
        ]
      })
    );

    const ec2_region = this.node.tryGetContext('ec2_region');
    const ec2_type = this.node.tryGetContext('ec2_type');
    const db_host = this.node.tryGetContext('db_host');
    const db_user = this.node.tryGetContext('db_user');
    const db_pass = this.node.tryGetContext('db_pass');
    const db_database = this.node.tryGetContext('db_database');

    const launchingLambda = new lambda.Function(this, 'Lambda', {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: 'function.lambda_to_ec2',
      code: lambda.Code.asset('./resources'),
      description: 'Backup Database to S3',
      timeout: core.Duration.seconds(30),
      environment: {
        INSTANCE_REGION: ec2_region,
        INSTANCE_TYPE: ec2_type,
        INSTANCE_ROLE: backupInstanceRole.roleName,
        DB_HOST: db_host,
        DB_USER: db_user,
        DB_PASS: db_pass,
        DB_DATABASE: db_database,
        S3_BUCKET: rdsBackupsBucket.bucketName
      }
    });

    launchingLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['ec2:*']
      })
    );

    launchingLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [backupInstanceRole.roleArn],
        actions: ['iam:PassRole']
      })
    );

    const lambdaTarget = new eventstargets.LambdaFunction(launchingLambda);

    const cron_minute = this.node.tryGetContext('cron_minute');
    const cron_hour = this.node.tryGetContext('cron_hour');
    const cron_day = this.node.tryGetContext('cron_day');
    const cron_month = this.node.tryGetContext('cron_month');
    const cron_year = this.node.tryGetContext('cron_year');

    new events.Rule(this, 'ScheduleRule', {
      schedule: events.Schedule.cron({ 
        minute: cron_minute,
        hour: cron_hour,
        day: cron_day,
        month: cron_month,
        year: cron_year
      }),
      targets: [lambdaTarget],
    });
  }
}