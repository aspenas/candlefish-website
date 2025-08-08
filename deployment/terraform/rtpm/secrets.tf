resource "aws_secretsmanager_secret" "rtpm_api" {
  name        = "/candlefish/prod/rtpm-api/secret-bundle"
  description = "RTPM API runtime secrets"
}

resource "aws_secretsmanager_secret_version" "rtpm_api" {
  secret_id = aws_secretsmanager_secret.rtpm_api.id
  secret_string = jsonencode({
    DATABASE_URL = var.database_url,
    REDIS_URL    = var.redis_url,
    JWT_SECRET   = var.jwt_secret,
    SECRET_KEY   = var.secret_key,
    CORS_ORIGINS = var.cors_origins
  })
}

resource "aws_ssm_parameter" "rtpm_api_params" {
  for_each = {
    DATABASE_URL = var.database_url
    REDIS_URL    = var.redis_url
    JWT_SECRET   = var.jwt_secret
    SECRET_KEY   = var.secret_key
    CORS_ORIGINS = var.cors_origins
  }
  name  = "/candlefish/prod/rtpm-api/${each.key}"
  type  = "SecureString"
  value = each.value
}
