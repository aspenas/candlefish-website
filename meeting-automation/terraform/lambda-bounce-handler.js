// Lambda function to process SES bounce notifications
// This function adds bounced emails to a DynamoDB suppression list

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const SUPPRESSION_TABLE = process.env.SUPPRESSION_TABLE || 'ses-suppression-list';

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        // Parse SNS message
        const message = JSON.parse(event.Records[0].Sns.Message);
        
        if (message.notificationType !== 'Bounce') {
            console.log('Not a bounce notification, skipping');
            return { statusCode: 200, body: 'Not a bounce notification' };
        }
        
        const bounce = message.bounce;
        const timestamp = new Date(bounce.timestamp).getTime();
        
        // Process each bounced recipient
        const suppressionPromises = bounce.bouncedRecipients.map(async (recipient) => {
            const email = recipient.emailAddress.toLowerCase();
            const bounceType = bounce.bounceType;
            const bounceSubType = bounce.bounceSubType;
            
            console.log(`Processing bounce for ${email}: ${bounceType}/${bounceSubType}`);
            
            // Only suppress hard bounces and certain soft bounce subtypes
            const shouldSuppress = 
                bounceType === 'Permanent' ||
                (bounceType === 'Transient' && [
                    'MailboxFull',
                    'MessageTooLarge',
                    'ContentRejected',
                    'AttachmentRejected'
                ].includes(bounceSubType));
            
            if (shouldSuppress) {
                const item = {
                    email: email,
                    reason: `bounce:${bounceType}:${bounceSubType}`,
                    timestamp: timestamp,
                    messageId: message.mail.messageId,
                    diagnosticCode: recipient.diagnosticCode || 'N/A',
                    action: recipient.action || 'failed',
                    status: recipient.status || 'unknown',
                    addedAt: new Date().toISOString(),
                    ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
                };
                
                try {
                    await dynamodb.put({
                        TableName: SUPPRESSION_TABLE,
                        Item: item,
                        ConditionExpression: 'attribute_not_exists(email) OR #ts < :timestamp',
                        ExpressionAttributeNames: { '#ts': 'timestamp' },
                        ExpressionAttributeValues: { ':timestamp': timestamp }
                    }).promise();
                    
                    console.log(`Added ${email} to suppression list`);
                    
                    // Send metrics to CloudWatch
                    await sendMetric('BounceSuppression', 1, 'Count');
                    
                } catch (err) {
                    if (err.code !== 'ConditionalCheckFailedException') {
                        throw err;
                    }
                    console.log(`${email} already in suppression list with newer timestamp`);
                }
            } else {
                console.log(`Soft bounce for ${email}, not suppressing`);
                await sendMetric('SoftBounce', 1, 'Count');
            }
        });
        
        await Promise.all(suppressionPromises);
        
        // Log bounce statistics
        await sendMetric('TotalBounces', bounce.bouncedRecipients.length, 'Count');
        await sendMetric(`Bounce_${bounce.bounceType}`, 1, 'Count');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Bounce processed successfully',
                recipients: bounce.bouncedRecipients.length
            })
        };
        
    } catch (error) {
        console.error('Error processing bounce:', error);
        await sendMetric('BounceProcessingError', 1, 'Count');
        throw error;
    }
};

async function sendMetric(metricName, value, unit) {
    const cloudwatch = new AWS.CloudWatch();
    
    const params = {
        Namespace: 'Candlefish/SES',
        MetricData: [
            {
                MetricName: metricName,
                Value: value,
                Unit: unit,
                Timestamp: new Date()
            }
        ]
    };
    
    try {
        await cloudwatch.putMetricData(params).promise();
    } catch (err) {
        console.error(`Failed to send metric ${metricName}:`, err);
    }
}