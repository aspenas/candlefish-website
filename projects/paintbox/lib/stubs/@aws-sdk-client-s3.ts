// Stub module for @aws-sdk/client-s3
// This is used during build when the actual dependency is not installed

export class S3Client {
  constructor(_config: any) {}
}

export class PutObjectCommand {
  constructor(_params: any) {}
}

console.warn('Using stub AWS S3 client - install @aws-sdk/client-s3 for full functionality');
