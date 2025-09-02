#!/usr/bin/env python3
"""
AWS Secrets Rotation Script
Automatically rotates secrets stored in AWS Secrets Manager
"""

import boto3
import json
import uuid
import secrets
import string
from datetime import datetime
from typing import Dict, Any
import argparse
import sys

class SecretsRotator:
    def __init__(self, region: str = 'us-east-1'):
        """Initialize the secrets rotator with AWS clients"""
        self.secrets_client = boto3.client('secretsmanager', region_name=region)
        self.region = region
        
    def generate_password(self, length: int = 32) -> str:
        """Generate a secure random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def generate_api_key(self) -> str:
        """Generate a UUID-based API key"""
        return str(uuid.uuid4())
    
    def rotate_secret(self, secret_name: str, rotation_type: str = 'password') -> Dict[str, Any]:
        """Rotate a specific secret"""
        try:
            # Get current secret
            response = self.secrets_client.get_secret_value(SecretId=secret_name)
            current_secret = json.loads(response['SecretString'])
            
            # Generate new values based on type
            if rotation_type == 'password':
                new_value = self.generate_password()
                if 'password' in current_secret:
                    current_secret['password'] = new_value
                elif 'secret' in current_secret:
                    current_secret['secret'] = new_value
            elif rotation_type == 'api_key':
                new_value = self.generate_api_key()
                if 'api_key' in current_secret:
                    current_secret['api_key'] = new_value
                elif 'key' in current_secret:
                    current_secret['key'] = new_value
            else:
                raise ValueError(f"Unknown rotation type: {rotation_type}")
            
            # Update secret
            self.secrets_client.update_secret(
                SecretId=secret_name,
                SecretString=json.dumps(current_secret)
            )
            
            # Add rotation metadata
            self.secrets_client.tag_resource(
                SecretId=secret_name,
                Tags=[
                    {'Key': 'LastRotated', 'Value': datetime.now().isoformat()},
                    {'Key': 'RotationType', 'Value': 'Automatic'}
                ]
            )
            
            return {
                'secret_name': secret_name,
                'status': 'success',
                'rotated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'secret_name': secret_name,
                'status': 'failed',
                'error': str(e)
            }
    
    def rotate_all_candlefish_secrets(self) -> list:
        """Rotate all Candlefish secrets"""
        results = []
        
        # Define secrets to rotate
        secrets_config = [
            ('candlefish/mongodb/credentials', 'password'),
            ('candlefish/api/smithery', 'api_key'),
            ('candlefish/auth/jwt', 'password'),
            ('candlefish/security/encryption', 'password'),
        ]
        
        for secret_name, rotation_type in secrets_config:
            print(f"Rotating {secret_name}...")
            result = self.rotate_secret(secret_name, rotation_type)
            results.append(result)
            
            if result['status'] == 'success':
                print(f"✅ Successfully rotated {secret_name}")
            else:
                print(f"❌ Failed to rotate {secret_name}: {result.get('error')}")
        
        return results
    
    def verify_rotation(self, secret_name: str) -> bool:
        """Verify that a secret was recently rotated"""
        try:
            response = self.secrets_client.describe_secret(SecretId=secret_name)
            tags = {tag['Key']: tag['Value'] for tag in response.get('Tags', [])}
            
            if 'LastRotated' in tags:
                last_rotated = datetime.fromisoformat(tags['LastRotated'])
                time_since = datetime.now() - last_rotated
                
                if time_since.total_seconds() < 300:  # Within last 5 minutes
                    return True
            
            return False
        except Exception:
            return False

def main():
    parser = argparse.ArgumentParser(description='Rotate AWS Secrets Manager secrets')
    parser.add_argument('--region', default='us-east-1', help='AWS region')
    parser.add_argument('--secret', help='Specific secret to rotate')
    parser.add_argument('--type', choices=['password', 'api_key'], default='password',
                       help='Type of rotation')
    parser.add_argument('--all', action='store_true', help='Rotate all Candlefish secrets')
    parser.add_argument('--verify', help='Verify a secret was rotated')
    
    args = parser.parse_args()
    
    rotator = SecretsRotator(region=args.region)
    
    if args.verify:
        if rotator.verify_rotation(args.verify):
            print(f"✅ {args.verify} was recently rotated")
            sys.exit(0)
        else:
            print(f"❌ {args.verify} was NOT recently rotated")
            sys.exit(1)
    
    if args.all:
        results = rotator.rotate_all_candlefish_secrets()
        
        # Summary
        successful = sum(1 for r in results if r['status'] == 'success')
        failed = sum(1 for r in results if r['status'] == 'failed')
        
        print(f"\n📊 Rotation Summary:")
        print(f"  Successful: {successful}")
        print(f"  Failed: {failed}")
        
        if failed > 0:
            sys.exit(1)
    
    elif args.secret:
        result = rotator.rotate_secret(args.secret, args.type)
        if result['status'] == 'success':
            print(f"✅ Successfully rotated {args.secret}")
        else:
            print(f"❌ Failed to rotate {args.secret}: {result.get('error')}")
            sys.exit(1)
    
    else:
        parser.print_help()

if __name__ == '__main__':
    main()