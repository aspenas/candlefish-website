# CloudWatch Dashboard for SES Monitoring

resource "aws_cloudwatch_dashboard" "ses_monitoring" {
  dashboard_name = "SES-Production-Monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/SES", "Send", { stat = "Sum", label = "Emails Sent" }],
            [".", "Bounce", { stat = "Sum", label = "Bounces" }],
            [".", "Complaint", { stat = "Sum", label = "Complaints" }],
            [".", "Delivery", { stat = "Sum", label = "Delivered" }]
          ]
          period = 300
          stat = "Sum"
          region = "us-east-1"
          title = "Email Volume"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/SES", "Reputation.BounceRate", { stat = "Average", label = "Bounce Rate %" }],
            [".", "Reputation.ComplaintRate", { stat = "Average", label = "Complaint Rate %", yAxis = "right" }]
          ]
          period = 3600
          stat = "Average"
          region = "us-east-1"
          title = "Reputation Metrics"
          yAxis = {
            left = {
              min = 0
              max = 5
            }
            right = {
              min = 0
              max = 0.5
            }
          }
          annotations = {
            horizontal = [
              {
                value = 5
                fill = "above"
                color = "#d62728"
                label = "Bounce Rate Danger Zone"
              },
              {
                value = 0.1
                fill = "above"
                color = "#ff9800"
                label = "Complaint Rate Warning"
                yAxis = "right"
              }
            ]
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["Candlefish/SES", "TotalBounces", { stat = "Sum" }],
            [".", "Bounce_Permanent", { stat = "Sum" }],
            [".", "Bounce_Transient", { stat = "Sum" }],
            [".", "SoftBounce", { stat = "Sum" }]
          ]
          period = 3600
          stat = "Sum"
          region = "us-east-1"
          title = "Bounce Breakdown"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["Candlefish/SES", "TotalComplaints", { stat = "Sum" }],
            [".", "Complaint_abuse", { stat = "Sum" }],
            [".", "Complaint_fraud", { stat = "Sum" }],
            [".", "Complaint_other", { stat = "Sum" }]
          ]
          period = 3600
          stat = "Sum"
          region = "us-east-1"
          title = "Complaint Types"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["Candlefish/SES", "BounceSuppression", { stat = "Sum", label = "Bounce Suppressions" }],
            [".", "ComplaintSuppression", { stat = "Sum", label = "Complaint Suppressions" }]
          ]
          period = 86400
          stat = "Sum"
          region = "us-east-1"
          title = "Suppression List Activity (Daily)"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { "stat": "Sum", "dimensions": { "FunctionName": "ses-process-bounces" } }],
            [".", "Errors", { "stat": "Sum", "dimensions": { "FunctionName": "ses-process-bounces" } }],
            [".", "Invocations", { "stat": "Sum", "dimensions": { "FunctionName": "ses-process-complaints" } }],
            [".", "Errors", { "stat": "Sum", "dimensions": { "FunctionName": "ses-process-complaints" } }]
          ]
          period = 3600
          stat = "Sum"
          region = "us-east-1"
          title = "Lambda Processing Health"
        }
      },
      {
        type = "log"
        properties = {
          query = "SOURCE '/aws/lambda/ses-process-bounces' | SOURCE '/aws/lambda/ses-process-complaints' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
          region = "us-east-1"
          title = "Recent Processing Errors"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/SES", "Send", { period = 86400, stat = "Sum" }]
          ]
          period = 86400
          stat = "Sum"
          region = "us-east-1"
          title = "Daily Send Volume (Last 30 Days)"
          start = "-P30D"
          end = "P0D"
        }
      }
    ]
  })
}