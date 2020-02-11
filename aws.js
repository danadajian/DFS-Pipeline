let AWS = require('aws-sdk');
AWS.config.region = 'us-east-2';
AWS.config.credentials = new AWS.Credentials(process.env.AWS_KEY, process.env.AWS_SECRET);
const s3 = new AWS.S3();
const cloudWatchEvents = new AWS.CloudWatchEvents({apiVersion: '2015-10-07'});

const retrieveObjectFromS3 = async (fileName) => {
    let params = {
        Bucket: "dfs-pipeline",
        Key: fileName
    };
    const data = await s3.getObject(params).promise();
    return JSON.parse(data.Body.toString());
};

const uploadObjectToS3 = async (object, fileName) => {
    let params = {
        Bucket: "dfs-pipeline",
        Key: fileName,
        Body: JSON.stringify(object)
    };
    await s3.putObject(params).promise();
    return 'File uploaded successfully.'
};

const createCloudWatchEvent = async (date) => {
    const putRuleParams = {
        Name: "mlb-pipeline",
        RoleArn: 'arn:aws:iam::062130427086:role/service-role/AWS_Events_Invoke_Step_Functions_1764449984',
        ScheduleExpression: getCronExpressionFromDate(date),
        State: 'ENABLED'
    };

    const putTargetsParams = {
        Rule: "mlb-pipeline",
        Targets: [
            {
                Arn: 'arn:aws:states:us-east-2:062130427086:stateMachine:DFSPipeLine',
                RoleArn: 'arn:aws:iam::062130427086:role/service-role/AWS_Events_Invoke_Step_Functions_1764449984',
                Id: 'dfsPipelineTarget',
                Input: '{"invocationType": "pipeline", "sport": "mlb"}'
            }
        ]
    };

    const putRule = await cloudWatchEvents.putRule(putRuleParams).promise();
    console.log(putRule);

    const putTargets = await cloudWatchEvents.putTargets(putTargetsParams).promise();
    console.log(putTargets);
    return 'Done.';
};

const getCronExpressionFromDate = (date) => {
    return 'cron(' +
        date.getMinutes() +
        " " + date.getHours() +
        " " + date.getDate() +
        " " + (date.getMonth() + 1) +
        " ? " +
        date.getFullYear() + ')'
};

exports.retrieveObjectFromS3 = retrieveObjectFromS3;
exports.uploadObjectToS3 = uploadObjectToS3;
exports.createCloudWatchEvent = createCloudWatchEvent;