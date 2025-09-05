# ADR-001: Secrets Management Architecture

## Status
**Accepted** - 2025-09-05

## Context

Candlefish AI discovered exposed secrets in the repository, highlighting the need for a comprehensive, enterprise-grade secrets management solution. The current ad-hoc approach is unsustainable and poses significant security risks. We need a solution that:

1. Eliminates secret sprawl
2. Provides automated rotation
3. Ensures compliance with security frameworks
4. Makes secure practices the path of least resistance
5. Scales with our growth
6. Embodies the Operational Design Atelier philosophy

## Decision

We will implement a **Trinary Vault System** combining:

1. **HashiCorp Vault** - Dynamic secrets and transit encryption
2. **AWS Secrets Manager** - Persistent secrets with native AWS integration  
3. **Sealed Secrets** - GitOps-compatible encrypted secrets

This architecture provides defense in depth while maintaining developer ergonomics.

## Detailed Architecture Decisions

### 1. Primary Secret Store: HashiCorp Vault

**Decision**: Use HashiCorp Vault as the primary secret management platform.

**Rationale**:
- Industry-standard solution with proven track record
- Dynamic secret generation reduces exposure window
- Rich policy engine for fine-grained access control
- Transit encryption engine for data protection
- Extensive integration ecosystem
- Strong audit capabilities

**Alternatives Considered**:
- **AWS Secrets Manager Only**: Limited dynamic secret capabilities
- **Kubernetes Secrets**: Insufficient for multi-cloud requirements
- **Custom Solution**: High maintenance burden, security risks

**Trade-offs**:
- (+) Best-in-class features and security
- (+) Active community and enterprise support
- (-) Additional infrastructure to maintain
- (-) Learning curve for operations team

### 2. Persistent Secrets: AWS Secrets Manager

**Decision**: Use AWS Secrets Manager for long-lived secrets with automatic rotation.

**Rationale**:
- Native AWS integration with services (RDS, Lambda, ECS)
- Built-in rotation for supported services
- Regional replication for disaster recovery
- Cost-effective for persistent secrets
- Compliance certifications (SOC, ISO, PCI)

**Trade-offs**:
- (+) Seamless AWS ecosystem integration
- (+) Managed service reduces operational burden
- (-) AWS vendor lock-in for these secrets
- (-) Less flexible than Vault for custom workflows

### 3. GitOps Integration: Sealed Secrets

**Decision**: Implement Sealed Secrets for Kubernetes GitOps workflows.

**Rationale**:
- Encrypted secrets can be stored in Git safely
- Maintains GitOps principle of Git as source of truth
- Developer-friendly workflow
- Automatic unsealing in cluster
- Version control for secret changes

**Trade-offs**:
- (+) Git-native secret management
- (+) Audit trail through Git history
- (-) Additional controller in Kubernetes
- (-) Key management complexity

### 4. Hardware Security: CloudHSM

**Decision**: Use AWS CloudHSM for production critical keys.

**Rationale**:
- FIPS 140-2 Level 3 certification required for compliance
- Hardware-isolated key storage
- Tamper-resistant hardware
- Required for certain regulatory requirements

**Trade-offs**:
- (+) Highest level of key security
- (+) Compliance with strict regulations
- (-) Significant cost ($1,600/month per HSM)
- (-) Complexity in key ceremony procedures

### 5. Encryption Strategy

**Decision**: Implement multi-layer encryption with different algorithms per layer.

**Layers**:
1. Application: Client-side encryption (libsodium)
2. Transport: TLS 1.3 with strong ciphers
3. Service Mesh: mTLS via Istio
4. Storage: AES-256-GCM via KMS
5. Hardware: CloudHSM for root keys

**Rationale**:
- Defense in depth approach
- No single point of failure
- Different algorithms prevent systematic vulnerabilities
- Compliance with data residency requirements

**Trade-offs**:
- (+) Maximum security posture
- (+) Resilient to single-layer compromises
- (-) Performance overhead from multiple encryptions
- (-) Complexity in key management

### 6. Authentication Method

**Decision**: Use OIDC as primary authentication with AWS IAM as fallback.

**Rationale**:
- OIDC provides centralized identity management
- Integrates with existing SSO infrastructure
- AWS IAM enables service account authentication
- Multiple methods provide resilience

**Trade-offs**:
- (+) Flexible authentication options
- (+) Integration with existing identity providers
- (-) Multiple authentication paths to secure
- (-) Complexity in policy management

### 7. Secret Rotation Strategy

**Decision**: Implement automatic rotation with configurable strategies per secret type.

**Rotation Frequencies**:
- API Keys: 90 days
- Passwords: 30 days  
- Database Credentials: 7 days (dynamic)
- Certificates: 30 days before expiry
- Encryption Keys: 90 days

**Rationale**:
- Reduces window of exposure
- Meets compliance requirements
- Automated to prevent human error
- Different strategies for different risk profiles

**Trade-offs**:
- (+) Significantly reduces security risk
- (+) Compliance with security frameworks
- (-) Potential for service disruption during rotation
- (-) Increased complexity in application design

### 8. Developer Experience

**Decision**: Provide type-safe SDKs with seamless local development.

**Features**:
- TypeScript SDK with full type inference
- Automatic mock generation for development
- Transparent caching and refresh
- IDE integration via extensions

**Rationale**:
- Security must not impede productivity
- Type safety prevents runtime errors
- Mock mode enables offline development
- Good DX encourages adoption

**Trade-offs**:
- (+) High developer satisfaction
- (+) Reduced security bypasses
- (-) SDK maintenance burden
- (-) Multiple language support needed

### 9. Monitoring and Alerting

**Decision**: Implement comprehensive observability with multiple alert channels.

**Metrics Tracked**:
- Secret age and rotation status
- Access patterns and anomalies
- Performance metrics (latency, throughput)
- Compliance violations
- Security events

**Alert Channels**:
- Email for all severities
- Slack for warnings and above
- PagerDuty for critical issues
- Security dashboard for real-time view

**Trade-offs**:
- (+) Proactive security posture
- (+) Rapid incident response
- (-) Alert fatigue risk
- (-) Storage costs for metrics

### 10. Break-Glass Procedures

**Decision**: Implement dual-control break-glass with video recording.

**Requirements**:
- Two-person authorization
- Video recording of session
- Time-limited access (4 hours max)
- Automatic secret rotation post-access
- Executive notification

**Rationale**:
- Balances security with emergency needs
- Provides strong audit trail
- Deters misuse while enabling legitimate access
- Satisfies compliance requirements

**Trade-offs**:
- (+) Emergency access when needed
- (+) Strong accountability
- (-) Complexity in implementation
- (-) Potential delays in true emergencies

## Cost Analysis

### Estimated Monthly Costs (1000 secrets)

| Component | Cost | Notes |
|-----------|------|-------|
| Vault Infrastructure (3x t3.medium) | $150 | HA cluster |
| AWS Secrets Manager | $400 | $0.40 per secret |
| KMS Operations | $100 | Encryption/decryption |
| CloudHSM (Optional) | $1,600 | Production only |
| Monitoring/Logs | $150 | CloudWatch, S3 |
| **Total (without HSM)** | **$800** | |
| **Total (with HSM)** | **$2,400** | Production |

### ROI Justification

- **Security Breach Prevention**: Average breach cost $4.45M (IBM 2023)
- **Compliance Penalties Avoided**: SOC2 violations up to $500K
- **Productivity Gains**: 2 hours/week/developer saved = $400K/year
- **Operational Efficiency**: 50% reduction in secret-related incidents

**Break-even**: 2-3 months considering risk reduction and productivity gains

## Migration Strategy

### Phase 1: Foundation (Month 1)
- Deploy Vault infrastructure
- Configure AWS Secrets Manager
- Establish policies and procedures

### Phase 2: Integration (Month 2)
- Integrate with existing services
- Deploy SDKs
- Implement monitoring

### Phase 3: Migration (Month 3)
- Rotate all existing secrets
- Migrate applications
- Decommission old systems

### Phase 4: Optimization (Month 4)
- Performance tuning
- Cost optimization
- Process refinement

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vault cluster failure | High | HA deployment, automated backups |
| Secret rotation causes outage | Medium | Blue-green rotation, rollback procedures |
| Developer resistance | Medium | Excellent SDK, training, support |
| Cost overrun | Low | Usage monitoring, optimization strategies |
| Compliance failure | High | Automated compliance checks, regular audits |

## Success Metrics

- **Zero** secret-related security incidents
- **99.99%** availability of secret services
- **100%** of secrets under management
- **90%** developer satisfaction score
- **100%** compliance audit pass rate
- **<100ms** secret retrieval latency
- **30%** reduction in security operation costs

## Review Schedule

- Technical review: Quarterly
- Security audit: Semi-annually  
- Cost optimization: Monthly
- Architecture review: Annually

## Conclusion

This architecture transforms secrets management from a security burden into an operational advantage. By combining best-in-class tools with thoughtful design, we create a system where security enhances rather than impedes velocity. The Operational Design Atelier philosophy is embodied in making the complex elegant and the secure seamless.

## Appendices

### A. Reference Documentation
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Sealed Secrets](https://sealed-secrets.netlify.app/)
- [NIST Cryptographic Standards](https://www.nist.gov/cryptography)

### B. Related ADRs
- ADR-002: Encryption Algorithm Selection
- ADR-003: Compliance Framework Implementation
- ADR-004: Disaster Recovery Procedures
- ADR-005: Multi-Cloud Strategy

### C. Implementation Checklist
- [ ] Terraform infrastructure deployed
- [ ] Vault policies configured
- [ ] AWS Secrets Manager integrated
- [ ] Sealed Secrets controller installed
- [ ] SDKs published
- [ ] Monitoring dashboards created
- [ ] Runbooks documented
- [ ] Team training completed
- [ ] Security audit performed
- [ ] Production cutover executed

---

**Authors**: Platform Security Team  
**Reviewers**: CTO, CISO, Principal Engineers  
**Approval**: Security Review Board  
**Implementation Lead**: Platform Engineering