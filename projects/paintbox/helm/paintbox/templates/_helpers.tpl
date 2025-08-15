{{/*
Expand the name of the chart.
*/}}
{{- define "paintbox.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "paintbox.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "paintbox.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "paintbox.labels" -}}
helm.sh/chart: {{ include "paintbox.chart" . }}
{{ include "paintbox.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "paintbox.selectorLabels" -}}
app.kubernetes.io/name: {{ include "paintbox.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "paintbox.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "paintbox.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Generate certificates for webhook
*/}}
{{- define "paintbox.webhookCerts" -}}
{{- $altNames := list ( printf "%s.%s" (include "paintbox.name" .) .Release.Namespace ) ( printf "%s.%s.svc" (include "paintbox.name" .) .Release.Namespace ) -}}
{{- $ca := genCA "paintbox-ca" 365 -}}
{{- $cert := genSignedCert ( include "paintbox.name" . ) nil $altNames 365 $ca -}}
tls.crt: {{ $cert.Cert | b64enc }}
tls.key: {{ $cert.Key | b64enc }}
ca.crt: {{ $ca.Cert | b64enc }}
{{- end }}

{{/*
Return the proper Docker Image Registry Secret Names
*/}}
{{- define "paintbox.imagePullSecrets" -}}
{{- include "common.images.pullSecrets" (dict "images" (list .Values.image) "global" .Values.global) -}}
{{- end }}

{{/*
Create the name of the config map to use
*/}}
{{- define "paintbox.configMapName" -}}
{{- printf "%s-config" (include "paintbox.fullname" .) }}
{{- end }}

{{/*
Create environment-specific resource name
*/}}
{{- define "paintbox.resourceName" -}}
{{- printf "%s-%s" (include "paintbox.fullname" .) .Values.environment }}
{{- end }}

{{/*
Generate backend service name for subgraph
*/}}
{{- define "paintbox.subgraph.serviceName" -}}
{{- printf "%s-subgraph-%s" (include "paintbox.fullname" .) .name }}
{{- end }}

{{/*
Generate database connection string
*/}}
{{- define "paintbox.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgresql://%s:%s@%s-postgresql:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password (include "paintbox.fullname" .) .Values.postgresql.auth.database }}
{{- else }}
{{- printf "postgresql://%s:%s@%s:%v/%s" .Values.postgresql.external.username .Values.postgresql.external.password .Values.postgresql.external.host .Values.postgresql.external.port .Values.postgresql.external.database }}
{{- end }}
{{- end }}

{{/*
Generate redis connection string
*/}}
{{- define "paintbox.redisUrl" -}}
{{- if .Values.redis.enabled }}
{{- printf "redis://:%s@%s-redis-master:6379" .Values.redis.auth.password (include "paintbox.fullname" .) }}
{{- else }}
{{- printf "redis://:%s@%s:%v" .Values.redis.external.password .Values.redis.external.host .Values.redis.external.port }}
{{- end }}
{{- end }}

{{/*
Validate required values
*/}}
{{- define "paintbox.validateValues" -}}
{{- if and (not .Values.postgresql.enabled) (not .Values.postgresql.external.enabled) }}
{{- fail "Either PostgreSQL should be enabled or external database configuration should be provided" }}
{{- end }}
{{- if and (not .Values.redis.enabled) (not .Values.redis.external.enabled) }}
{{- fail "Either Redis should be enabled or external Redis configuration should be provided" }}
{{- end }}
{{- end }}