// Lambda function to process SES complaint notifications
// This function immediately suppresses complained addresses

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const SUPPRESSION_TABLE = process.env.SUPPRESSION_TABLE || 'ses-suppression-list';

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        // Parse SNS message
        const message = JSON.parse(event.Records[0].Sns.Message);
        
        if (message.notificationType !== 'Complaint') {
            console.log('Not a complaint notification, skipping');
            return { statusCode: 200, body: 'Not a complaint notification' };
        }
        
        const complaint = message.complaint;
        const timestamp = new Date(complaint.timestamp).getTime();
        const complaintFeedbackType = complaint.complaintFeedbackType || 'unknown';
        
        // Process each complained recipient
        const suppressionPromises = complaint.complainedRecipients.map(async (recipient) => {
            const email = recipient.emailAddress.toLowerCase();
            
            console.log(`Processing complaint for ${email}: ${complaintFeedbackType}`);
            
            // Always suppress emails that generate complaints
            const item = {
                email: email,
                reason: `complaint:${complaintFeedbackType}`,
                timestamp: timestamp,
                messageId: message.mail.messageId,
                feedbackId: complaint.feedbackId || 'N/A',
                userAgent: complaint.userAgent || 'unknown',
                complaintFeedbackType: complaintFeedbackType,
                arrivalDate: complaint.arrivalDate || 'unknown',
                addedAt: new Date().toISOString(),
                permanent: true, // Complaints are permanent suppressions
                ttl: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 year TTL
            };
            
            try {
                await dynamodb.put({
                    TableName: SUPPRESSION_TABLE,
                    Item: item,
                    ConditionExpression: 'attribute_not_exists(email) OR #ts < :timestamp',
                    ExpressionAttributeNames: { '#ts': 'timestamp' },
                    ExpressionAttributeValues: { ':timestamp': timestamp }
                }).promise();
                
                console.log(`Added ${email} to permanent suppression list due to complaint`);
                
                // Send alert for complaint
                await sendAlert(email, complaintFeedbackType, message.mail.source);
                
                // Send metrics to CloudWatch
                await sendMetric('ComplaintSuppression', 1, 'Count');
                await sendMetric(`Complaint_${complaintFeedbackType}`, 1, 'Count');
                
            } catch (err) {
                if (err.code !== 'ConditionalCheckFailedException') {
                    throw err;
                }
                console.log(`${email} already in suppression list with newer timestamp`);
            }
        });
        
        await Promise.all(suppressionPromises);
        
        // Log complaint statistics
        await sendMetric('TotalComplaints', complaint.complainedRecipients.length, 'Count');
        
        // Check complaint rate and send warning if needed
        await checkComplaintRate();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Complaint processed successfully',
                recipients: complaint.complainedRecipients.length,
                type: complaintFeedbackType
            })
        };
        
    } catch (error) {
        console.error('Error processing complaint:', error);
        await sendMetric('ComplaintProcessingError', 1, 'Count');
        throw error;
    }
};

async function sendAlert(email, complaintType, sender) {
    const sns = new AWS.SNS();
    
    const message = `
URGENT: Email Complaint Received

Recipient: ${email}
Complaint Type: ${complaintType}
Sender Address: ${sender}
Time: ${new Date().toISOString()}

This email has been permanently added to the suppression list.

Action Required:
1. Review the email content that generated this complaint
2. Ensure all emails are properly solicited
3. Review opt-in processes

This is an automated alert from the Candlefish SES monitoring system.
    `;
    
    const params = {
        Subject: 'URGENT: SES Complaint Received',
        Message: message,
        TopicArn: process.env.ALERT_TOPIC_ARN || 'arn:aws:sns:us-east-1:681214184463:ses-complaints'
    };
    
    try {
        await sns.publish(params).promise();
        console.log('Alert sent for complaint');
    } catch (err) {
        console.error('Failed to send alert:', err);
    }
}

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

async function checkComplaintRate() {
    const cloudwatch = new AWS.CloudWatch();
    
    // Get recent send and complaint metrics
    const endTime = new Date();
    const startTime = new Date(endTime - 24 * 60 * 60 * 1000); // Last 24 hours
    
    try {
        const params = {
            Namespace: 'AWS/SES',
            MetricName: 'Reputation.ComplaintRate',
            StartTime: startTime,
            EndTime: endTime,
            Period: 3600,
            Statistics: ['Average', 'Maximum']
        };
        
        const data = await cloudwatch.getMetricStatistics(params).promise();
        
        if (data.Datapoints && data.Datapoints.length > 0) {
            const maxComplaintRate = Math.max(...data.Datapoints.map(d => d.Maximum));
            
            if (maxComplaintRate > 0.001) { // 0.1% threshold
                console.error(`WARNING: High complaint rate detected: ${maxComplaintRate * 100}%`);
                await sendMetric('HighComplaintRateWarning', 1, 'Count');
            }
        }
    } catch (err) {
        console.error('Failed to check complaint rate:', err);
    }
}