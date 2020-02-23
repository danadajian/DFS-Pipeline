let AWS = require('aws-sdk');
AWS.config.credentials = new AWS.Credentials(process.env.AWS_KEY, process.env.AWS_SECRET);
const sns = new AWS.SNS({region: 'us-east-1'});
const s3 = new AWS.S3({region: 'us-east-2'});
const cloudWatchEvents = new AWS.CloudWatchEvents({apiVersion: '2015-10-07', region: 'us-east-2'});
const {getDateString} = require("./scheduleStateMachines/getPipelineStartTimes");

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

const sendTextMessage = async (Message, PhoneNumber) => {
    let params = {
        Message,
        MessageStructure: 'string',
        PhoneNumber
    };
    await sns.publish(params).promise();
    return 'Text message sent successfully.'
};

const createCloudWatchEvent = async (sport, date) => {
    const putRuleParams = {
        Name: `${sport}-pipeline-rule`,
        RoleArn: 'arn:aws:iam::062130427086:role/service-role/AWS_Events_Invoke_Step_Functions_1764449984',
        ScheduleExpression: getCronExpressionFromDate(date),
        State: 'ENABLED'
    };
    const putTargetsParams = {
        Rule: `${sport}-pipeline-rule`,
        Targets: [
            {
                Arn: 'arn:aws:states:us-east-2:062130427086:stateMachine:DFSPipeline-z8ElFsPzuJUz',
                RoleArn: 'arn:aws:iam::062130427086:role/service-role/AWS_Events_Invoke_Step_Functions_1764449984',
                Id: 'dfsPipelineTarget',
                Input: JSON.stringify({
                    invocationType: 'pipeline',
                    date: getDateString(),
                    sport,
                    maxCombinations: 100000000000
                })
            }
        ]
    };
    await cloudWatchEvents.putRule(putRuleParams).promise().catch(e => console.log(e));
    await cloudWatchEvents.putTargets(putTargetsParams).promise().catch(e => console.log(e));
    return 'Cloudwatch events created.';
};

const getCronExpressionFromDate = (date) => {
    return 'cron(' +
        date.getUTCMinutes() +
        " " + date.getUTCHours() +
        " " + date.getUTCDate() +
        " " + (date.getUTCMonth() + 1) +
        " ? " +
        date.getUTCFullYear() + ')'
};

exports.retrieveObjectFromS3 = retrieveObjectFromS3;
exports.uploadObjectToS3 = uploadObjectToS3;
exports.sendTextMessage = sendTextMessage;
exports.createCloudWatchEvent = createCloudWatchEvent;
exports.getCronExpressionFromDate = getCronExpressionFromDate;
