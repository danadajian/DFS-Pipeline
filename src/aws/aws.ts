import {S3, SNS, CloudWatchEvents} from '../aws';
import {MAX_COMBINATIONS, STEP_FUNCTION_ARN, STEP_FUNCTIONS_ROLE_ARN} from "../constants";
import {getTodayDateString} from '../helpers/helpers';

export const retrieveObjectFromS3 = async (fileName) => {
    let params = {
        Bucket: "dfs-pipeline",
        Key: fileName
    };
    const data = await S3.getObject(params).promise();
    return JSON.parse(data.Body.toString());
};

export const uploadObjectToS3 = async (object, fileName) => {
    let params = {
        Bucket: "dfs-pipeline",
        Key: fileName,
        Body: JSON.stringify(object)
    };
    await S3.putObject(params).promise();
    return 'File uploaded successfully.'
};

export const sendTextMessage = async (message, phoneNumber) => {
    let params = {
        Message: message,
        MessageStructure: 'string',
        PhoneNumber: phoneNumber
    };
    await SNS.publish(params).promise();
    return 'Text message sent successfully.'
};

export const createCloudWatchEvent = async (sport, date) => {
    const putRuleParams = {
        Name: `${sport}-pipeline-rule`,
        RoleArn: STEP_FUNCTIONS_ROLE_ARN,
        ScheduleExpression: getCronExpressionFromDate(date),
        State: 'ENABLED'
    };
    const putTargetsParams = {
        Rule: `${sport}-pipeline-rule`,
        Targets: [
            {
                Arn: STEP_FUNCTION_ARN,
                RoleArn: STEP_FUNCTIONS_ROLE_ARN,
                Id: 'dfsPipelineTarget',
                Input: JSON.stringify({
                    invocationType: 'pipeline',
                    date: getTodayDateString(),
                    sport,
                    maxCombinations: MAX_COMBINATIONS
                })
            }
        ]
    };
    await CloudWatchEvents.putRule(putRuleParams).promise();
    await CloudWatchEvents.putTargets(putTargetsParams).promise();
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