""" Lambda to launch ec2-instances """
import boto3
import os
import operator

INSTANCE_REGION  = os.environ['INSTANCE_REGION']
INSTANCE_TYPE    = os.environ['INSTANCE_TYPE'] 
INSTANCE_ROLE    = os.environ['INSTANCE_ROLE'] 
DB_HOST          = os.environ['DB_HOST']
DB_USER          = os.environ['DB_USER']
DB_PASS          = os.environ['DB_PASS']
DB_DATABASE      = os.environ['DB_DATABASE']
S3_BUCKET        = os.environ['S3_BUCKET']

EC2 = boto3.client('ec2', region_name=INSTANCE_REGION)

def lambda_to_ec2(event, context):

    response = EC2.describe_images(
    Filters=[
            {
                'Name': 'description',
                'Values': [
                    'Amazon Linux 2 AMI * x86_64 HVM gp2',
                ]
            },
        ],
        Owners=[
            'amazon'
        ]
    )
    # Sort on Creation date Desc
    image_details = sorted(response['Images'],key=operator.itemgetter('CreationDate'),reverse=True)
    AMI = image_details[0]['ImageId']

    init_script = """#!/bin/bash
yum install -y wget tar gcc make
wget https://ftp.postgresql.org/pub/source/v11.6/postgresql-11.6.tar.gz
tar -zxvf postgresql-11.6.tar.gz
cd postgresql-11.6/
./configure --without-readline --without-zlib
make
make install
echo "*:*:*:{1}:{2}" > ~/.pgpass
chmod 600 ~/.pgpass
/usr/local/pgsql/bin/pg_dump -h {0} \
           -U {1} \
           -w \
           -c \
           -f output.sql \
           {3}
S3_KEY={4}/{0}/$(date "+%Y-%m-%d")-{3}-backup.tar.gz
tar -cvzf output.tar.gz output.sql
aws s3 cp output.tar.gz s3://$S3_KEY --sse AES256
shutdown -h +1"""

    init_script_variables = init_script.format(DB_HOST,DB_USER,DB_PASS,DB_DATABASE,S3_BUCKET)

    instance = EC2.run_instances(
        ImageId=AMI,
        InstanceType=INSTANCE_TYPE,
        MinCount=1,
        MaxCount=1,
        InstanceInitiatedShutdownBehavior='terminate',
        UserData=init_script_variables,
        BlockDeviceMappings=[
        {
            'DeviceName': '/dev/xvda',
            'Ebs': {
                'DeleteOnTermination': True,
                'VolumeSize': 100,
                'VolumeType': 'gp2',
                'Encrypted': False
            }
        }],
        Monitoring={
           'Enabled': False
        },
        IamInstanceProfile={
            'Name': INSTANCE_ROLE
        }
    )

    print("New instance created.")
    instance_id = instance['Instances'][0]['InstanceId']
    print(instance_id)

    return instance_id
