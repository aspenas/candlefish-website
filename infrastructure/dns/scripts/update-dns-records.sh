#!/bin/bash
# Update DNS records for candlefish.ai subdomains

set -euo pipefail

# Configuration
DOMAIN="${DOMAIN:-candlefish.ai}"
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"
TTL="${TTL:-300}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Get hosted zone ID if not provided
get_hosted_zone_id() {
    if [[ -z "$HOSTED_ZONE_ID" ]]; then
        log "Looking up hosted zone ID for $DOMAIN..."
        HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
            --dns-name "$DOMAIN" \
            --query "HostedZones[0].Id" \
            --output text | sed 's|/hostedzone/||')
        
        if [[ "$HOSTED_ZONE_ID" == "None" ]]; then
            error "Hosted zone for $DOMAIN not found"
        fi
        
        log "Found hosted zone ID: $HOSTED_ZONE_ID"
    fi
}

# Update A record
update_a_record() {
    local subdomain="$1"
    local ip_address="$2"
    local record_name="${subdomain}.${DOMAIN}"
    
    if [[ "$subdomain" == "root" ]]; then
        record_name="$DOMAIN"
    fi
    
    log "Updating A record: $record_name -> $ip_address"
    
    local change_batch=$(cat << EOF
{
    "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": "$record_name",
            "Type": "A",
            "TTL": $TTL,
            "ResourceRecords": [{
                "Value": "$ip_address"
            }]
        }
    }]
}
EOF
    )
    
    aws route53 change-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --change-batch "$change_batch" \
        --output table
}

# Update CNAME record
update_cname_record() {
    local subdomain="$1"
    local target="$2"
    local record_name="${subdomain}.${DOMAIN}"
    
    log "Updating CNAME record: $record_name -> $target"
    
    local change_batch=$(cat << EOF
{
    "Changes": [{
        "Action": "UPSERT", 
        "ResourceRecordSet": {
            "Name": "$record_name",
            "Type": "CNAME",
            "TTL": $TTL,
            "ResourceRecords": [{
                "Value": "$target"
            }]
        }
    }]
}
EOF
    )
    
    aws route53 change-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --change-batch "$change_batch" \
        --output table
}

# Update alias record (for ALB)
update_alias_record() {
    local subdomain="$1"
    local alb_dns_name="$2"
    local alb_zone_id="$3"
    local record_name="${subdomain}.${DOMAIN}"
    
    if [[ "$subdomain" == "root" ]]; then
        record_name="$DOMAIN"
    fi
    
    log "Updating alias record: $record_name -> $alb_dns_name"
    
    local change_batch=$(cat << EOF
{
    "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": "$record_name",
            "Type": "A",
            "AliasTarget": {
                "DNSName": "$alb_dns_name",
                "EvaluateTargetHealth": true,
                "HostedZoneId": "$alb_zone_id"
            }
        }
    }]
}
EOF
    )
    
    aws route53 change-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --change-batch "$change_batch" \
        --output table
}

# Update TXT record
update_txt_record() {
    local subdomain="$1"
    local txt_value="$2"
    local record_name="${subdomain}.${DOMAIN}"
    
    log "Updating TXT record: $record_name -> $txt_value"
    
    local change_batch=$(cat << EOF
{
    "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": "$record_name", 
            "Type": "TXT",
            "TTL": $TTL,
            "ResourceRecords": [{
                "Value": "\"$txt_value\""
            }]
        }
    }]
}
EOF
    )
    
    aws route53 change-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --change-batch "$change_batch" \
        --output table
}

# List all DNS records
list_records() {
    log "Listing all DNS records for $DOMAIN..."
    
    aws route53 list-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --query "ResourceRecordSets[?contains(Name, '$DOMAIN')].[Name, Type, TTL, ResourceRecords[0].Value, AliasTarget.DNSName]" \
        --output table
}

# Delete DNS record
delete_record() {
    local subdomain="$1"
    local record_type="$2"
    local record_name="${subdomain}.${DOMAIN}"
    
    if [[ "$subdomain" == "root" ]]; then
        record_name="$DOMAIN"
    fi
    
    log "Deleting $record_type record: $record_name"
    
    # First get the current record
    local current_record=$(aws route53 list-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --query "ResourceRecordSets[?Name=='$record_name.' && Type=='$record_type']" \
        --output json)
    
    if [[ "$current_record" == "[]" ]]; then
        warn "Record $record_name ($record_type) not found"
        return 0
    fi
    
    # Extract record details for deletion
    local ttl=$(echo "$current_record" | jq -r '.[0].TTL // empty')
    local resource_records=$(echo "$current_record" | jq -r '.[0].ResourceRecords // empty')
    
    if [[ -n "$ttl" && "$resource_records" != "null" ]]; then
        local change_batch=$(cat << EOF
{
    "Changes": [{
        "Action": "DELETE",
        "ResourceRecordSet": {
            "Name": "$record_name",
            "Type": "$record_type", 
            "TTL": $ttl,
            "ResourceRecords": $resource_records
        }
    }]
}
EOF
        )
        
        aws route53 change-resource-record-sets \
            --hosted-zone-id "$HOSTED_ZONE_ID" \
            --change-batch "$change_batch" \
            --output table
    else
        warn "Could not extract record details for deletion"
    fi
}

# Verify DNS propagation
verify_propagation() {
    local subdomain="$1"
    local expected_value="$2"
    local record_name="${subdomain}.${DOMAIN}"
    
    if [[ "$subdomain" == "root" ]]; then
        record_name="$DOMAIN"
    fi
    
    log "Verifying DNS propagation for $record_name..."
    
    local nameservers=("8.8.8.8" "1.1.1.1" "208.67.222.222")
    local all_match=true
    
    for ns in "${nameservers[@]}"; do
        log "Checking against $ns..."
        local result=$(dig +short @"$ns" "$record_name" || echo "FAIL")
        
        if [[ "$result" == *"$expected_value"* ]]; then
            log "✓ $ns: $result"
        else
            warn "✗ $ns: $result (expected: $expected_value)"
            all_match=false
        fi
    done
    
    if [[ "$all_match" == "true" ]]; then
        log "✓ DNS propagation verified"
    else
        warn "DNS propagation incomplete. This may take up to 48 hours."
    fi
}

# Main function
main() {
    local action="$1"
    shift
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found. Please install and configure it."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
    fi
    
    get_hosted_zone_id
    
    case "$action" in
        "update-a")
            if [[ $# -lt 2 ]]; then
                error "Usage: $0 update-a <subdomain> <ip_address>"
            fi
            update_a_record "$1" "$2"
            verify_propagation "$1" "$2"
            ;;
        "update-cname")
            if [[ $# -lt 2 ]]; then
                error "Usage: $0 update-cname <subdomain> <target>"
            fi
            update_cname_record "$1" "$2"
            verify_propagation "$1" "$2"
            ;;
        "update-alias")
            if [[ $# -lt 3 ]]; then
                error "Usage: $0 update-alias <subdomain> <alb_dns_name> <alb_zone_id>"
            fi
            update_alias_record "$1" "$2" "$3"
            verify_propagation "$1" "$2"
            ;;
        "update-txt")
            if [[ $# -lt 2 ]]; then
                error "Usage: $0 update-txt <subdomain> <txt_value>"
            fi
            update_txt_record "$1" "$2"
            ;;
        "list")
            list_records
            ;;
        "delete")
            if [[ $# -lt 2 ]]; then
                error "Usage: $0 delete <subdomain> <record_type>"
            fi
            delete_record "$1" "$2"
            ;;
        "verify")
            if [[ $# -lt 2 ]]; then
                error "Usage: $0 verify <subdomain> <expected_value>"
            fi
            verify_propagation "$1" "$2"
            ;;
        *)
            cat << EOF
Usage: $0 <action> [arguments]

Actions:
  update-a <subdomain> <ip_address>           - Update A record
  update-cname <subdomain> <target>           - Update CNAME record
  update-alias <subdomain> <alb_dns> <zone>   - Update alias record
  update-txt <subdomain> <txt_value>          - Update TXT record
  list                                        - List all records
  delete <subdomain> <record_type>            - Delete record
  verify <subdomain> <expected_value>         - Verify DNS propagation

Environment Variables:
  DOMAIN           - Domain name (default: candlefish.ai)
  HOSTED_ZONE_ID   - Route53 hosted zone ID (auto-detected if not set)
  TTL              - DNS record TTL (default: 300)

Examples:
  $0 update-a api 192.0.2.1
  $0 update-cname www example.com
  $0 update-alias root my-alb-123.us-east-1.elb.amazonaws.com Z35SXDOTRQ7X7K
  $0 list
  $0 verify api 192.0.2.1
EOF
            exit 1
            ;;
    esac
}

# Run with all arguments
main "$@"