# Candlefish Operator Network Playbook

## Overview

The Operator Network is Candlefish's primary distribution channel, enabling rapid market penetration through trusted local partners who own customer relationships.

## Economic Model

### Revenue Sharing Structure

#### Initial Phase (Months 1-12)
- **Software Revenue**: 70% Operator / 30% Candlefish
- **Implementation Fees**: 90% Operator / 10% Candlefish
- **Support Revenue**: 100% Operator

#### Growth Phase (Months 13-24)
- **Software Revenue**: 60% Operator / 40% Candlefish
- **Implementation Fees**: 85% Operator / 15% Candlefish
- **Support Revenue**: 100% Operator

#### Mature Phase (Months 25+)
- **Software Revenue**: 50% Operator / 50% Candlefish
- **Implementation Fees**: 80% Operator / 20% Candlefish
- **Support Revenue**: 100% Operator

### Performance Tiers

| Tier | Customers | Revenue Share Bonus | Benefits |
|------|-----------|-------------------|----------|
| **Bronze** | 1-5 | Base | Standard support |
| **Silver** | 6-15 | +5% | Priority support, Lead sharing |
| **Gold** | 16-30 | +10% | Territory protection, Co-marketing |
| **Platinum** | 31+ | +15% | Equity participation, Advisory role |

## Operator Certification Program

### Fast-Track Certification (2 Weeks)

#### Week 1: Foundation
- **Day 1-2**: Platform overview and core concepts
- **Day 3-4**: Vertical-specific training
- **Day 5**: Excel migration mastery

#### Week 2: Practical Application
- **Day 6-7**: Demo environment setup
- **Day 8-9**: Customer simulation exercises
- **Day 10**: Certification exam and review

### Certification Requirements

1. **Technical Competency**
   - Complete Excel migration for sample customer
   - Configure one vertical application
   - Demonstrate troubleshooting skills

2. **Business Acumen**
   - Present ROI calculation
   - Conduct discovery call simulation
   - Create implementation timeline

3. **Ongoing Education**
   - Monthly webinars (required)
   - Quarterly updates (required)
   - Annual recertification

## Operator Success Framework

### Onboarding Process

```
Day 1: Welcome & Setup
├── Partner portal access
├── Marketing materials kit
├── Demo environment provisioning
└── Territory assignment (if applicable)

Week 1: Training & Enablement
├── Self-paced video modules (10 hours)
├── Live Q&A sessions (2 hours)
├── Hands-on lab exercises
└── Mentor assignment

Week 2: Go-to-Market
├── First customer identification
├── Joint sales call (optional)
├── Implementation planning
└── Success metrics review
```

### Support Structure

#### Tier 1: Self-Service (Immediate)
- Knowledge base access
- Video tutorials library
- Community forum
- Template library

#### Tier 2: Partner Success Team (< 4 hours)
- Slack channel support
- Email support queue
- Weekly office hours
- Technical escalation

#### Tier 3: Direct Engineering (< 24 hours)
- Critical issue resolution
- Custom integration support
- Architecture consultation
- Performance optimization

## Lead Distribution System

### Lead Sources
1. **Inbound Marketing**: Website, content, SEO
2. **Channel Partners**: Equipment suppliers, associations
3. **Referral Program**: Customer and operator referrals
4. **Trade Shows**: Industry events and conferences

### Distribution Algorithm

```python
def assign_lead(lead, operators):
    # Priority 1: Territory exclusivity
    if lead.location in exclusive_territories:
        return exclusive_territories[lead.location].operator
    
    # Priority 2: Vertical specialization
    specialized = filter_by_vertical(operators, lead.vertical)
    if specialized:
        return select_by_performance(specialized)
    
    # Priority 3: Capacity and performance
    available = filter_by_capacity(operators)
    return select_by_score(available, weights={
        'close_rate': 0.4,
        'customer_satisfaction': 0.3,
        'response_time': 0.2,
        'tenure': 0.1
    })
```

## Marketing & Sales Enablement

### Provided Materials

#### Sales Collateral
- Pitch deck templates (customizable)
- ROI calculators by vertical
- Case study library
- Demo scripts and videos
- Competitive battlecards

#### Marketing Assets
- Co-branded website templates
- Email campaign templates
- Social media content calendar
- Blog post templates
- Webinar frameworks

#### Implementation Tools
- Excel migration toolkit
- Data validation checklist
- Project plan templates
- Training materials for customers
- Go-live checklist

### Co-Marketing Opportunities

1. **Joint Webinars**: Monthly educational sessions
2. **Case Studies**: Shared success stories
3. **Trade Shows**: Booth sharing and sponsorship
4. **Content Creation**: Guest blogging and podcasts
5. **Referral Incentives**: Customer-to-customer programs

## Quality Assurance

### Performance Metrics

| Metric | Target | Measurement | Action Threshold |
|--------|--------|-------------|------------------|
| **Customer Acquisition** | 2/month | New customers added | < 1/month for 2 months |
| **Implementation Time** | < 2 weeks | Contract to go-live | > 4 weeks average |
| **Customer Retention** | > 90% | Annual renewal rate | < 80% |
| **NPS Score** | > 50 | Quarterly survey | < 30 |
| **Response Time** | < 4 hours | Lead to first contact | > 24 hours average |
| **Training Completion** | 100% | Required modules | < 80% |

### Quality Control Process

#### Monthly Reviews
- Customer feedback analysis
- Implementation audit sampling
- Support ticket review
- Revenue reconciliation

#### Quarterly Business Reviews
- Performance against targets
- Territory optimization
- Training needs assessment
- Relationship health check

#### Annual Evaluation
- Certification renewal
- Contract renegotiation
- Territory adjustments
- Strategic planning session

## Territory Management

### Territory Assignment Criteria

1. **Geographic**: Local market knowledge
2. **Vertical**: Industry expertise
3. **Capacity**: Ability to serve market
4. **Performance**: Historical success rate

### Exclusivity Requirements

- **Minimum Revenue**: $10K MRR to maintain exclusivity
- **Customer Count**: 15+ active customers
- **Growth Rate**: 20% QoQ for first year
- **Service Level**: > 90% customer satisfaction

## Legal Framework

### Master Service Agreement Components

1. **Relationship Terms**
   - Independent contractor status
   - Non-employee classification
   - Liability and indemnification

2. **Commercial Terms**
   - Revenue sharing schedule
   - Payment terms (NET 30)
   - Minimum performance standards
   - Territory rights (if applicable)

3. **Intellectual Property**
   - Candlefish platform ownership
   - Customer data ownership
   - Marketing material usage rights
   - Trademark licensing

4. **Operational Requirements**
   - Certification maintenance
   - Reporting obligations
   - Quality standards
   - Support commitments

5. **Termination Provisions**
   - 90-day notice period
   - Customer transition process
   - Revenue run-off rights
   - Non-compete limitations (narrow)

### Data & Privacy Requirements

- **Customer Data**: Remains property of customer
- **Operational Data**: Shared for improvement
- **Privacy Compliance**: GDPR, CCPA adherence
- **Security Standards**: SOC 2 alignment required

## Technology Platform

### Partner Portal Features

#### Dashboard
- Revenue metrics and trends
- Customer health scores
- Lead pipeline view
- Training progress
- Support ticket status

#### Resources
- Marketing material library
- Training video access
- Documentation repository
- API documentation
- Integration guides

#### Tools
- Lead management system
- Customer onboarding wizard
- Excel migration toolkit
- Support ticket system
- Billing and commission tracker

### Technical Integration

```yaml
API Endpoints:
  - /api/partner/leads       # Lead management
  - /api/partner/customers   # Customer data
  - /api/partner/billing     # Revenue tracking
  - /api/partner/support     # Ticket management
  - /api/partner/training    # Education tracking

Webhooks:
  - lead.assigned
  - customer.created
  - payment.processed
  - ticket.escalated
  - certification.expired
```

## Operator Equity Program

### Eligibility Criteria
- **Tenure**: Minimum 12 months
- **Performance**: Platinum tier achieved
- **Revenue**: $50K+ MRR contribution
- **Retention**: > 95% customer retention

### Equity Structure
- **Pool Size**: 5% of company equity
- **Vesting**: 4-year schedule with 1-year cliff
- **Valuation**: Annual 409A valuation
- **Rights**: Non-voting shares initially

## Success Stories Template

### Case Study Framework

1. **Challenge**: Customer's Excel chaos
2. **Solution**: Candlefish implementation
3. **Process**: Migration and training
4. **Results**: Quantified improvements
5. **ROI**: Time saved, errors reduced, revenue impact

### Metrics to Capture
- Hours saved per month
- Error reduction percentage
- Process acceleration
- Cost savings
- Revenue improvements
- Customer satisfaction scores

## Expansion Playbook

### Growing Your Practice

#### Phase 1: Establish (Months 1-6)
- Focus on single vertical
- Perfect implementation process
- Build reference customers
- Document best practices

#### Phase 2: Expand (Months 7-12)
- Add second vertical
- Hire implementation support
- Develop specializations
- Create service packages

#### Phase 3: Scale (Months 13+)
- Multiple verticals
- Team of implementers
- Managed services offering
- Strategic advisory services

### Revenue Growth Strategies

1. **Land and Expand**: Start with one department, grow to entire organization
2. **Vertical Dominance**: Become the go-to in your industry niche
3. **Geographic Expansion**: Extend territory through success
4. **Service Layering**: Add training, consulting, and managed services
5. **Referral Network**: Build ecosystem of complementary partners

## Communication Cadence

### Regular Touchpoints

| Frequency | Format | Purpose | Participants |
|-----------|--------|---------|--------------|
| **Daily** | Slack | Quick questions, updates | All operators |
| **Weekly** | Office Hours | Technical Q&A | Optional |
| **Monthly** | Webinar | Product updates, training | Required |
| **Quarterly** | QBR | Performance review | Individual |
| **Annual** | Summit | Strategy, networking | All operators |

## Problem Resolution

### Escalation Path

```
Level 1: Partner Portal / Knowledge Base
         ↓ (if unresolved in 4 hours)
Level 2: Partner Success Team
         ↓ (if unresolved in 24 hours)
Level 3: Engineering Team
         ↓ (if critical/blocking)
Level 4: Executive Team
```

### SLA Commitments

- **Critical Issues**: 2-hour response, 24-hour resolution
- **Major Issues**: 4-hour response, 48-hour resolution
- **Minor Issues**: 24-hour response, 1-week resolution
- **Questions**: 48-hour response

## Measuring Success

### Operator Scorecard

```python
operator_score = calculate_weighted_score({
    'revenue_generation': 0.25,      # MRR contribution
    'customer_acquisition': 0.20,    # New customers/month
    'customer_retention': 0.20,      # Renewal rate
    'implementation_speed': 0.15,    # Time to go-live
    'customer_satisfaction': 0.10,   # NPS scores
    'training_compliance': 0.05,     # Certification current
    'community_contribution': 0.05   # Forum activity, referrals
})
```

### Network Health Metrics

- **Active Operators**: Target 50-100 by Year 2
- **Geographic Coverage**: Major metros in target regions
- **Vertical Expertise**: 2+ specialists per vertical
- **Revenue per Operator**: $15K+ MRR average
- **Operator Retention**: > 85% annual

## Future Enhancements

### Year 1 Roadmap
- Automated lead distribution
- Self-service partner portal
- Basic training platform
- Performance dashboards

### Year 2 Roadmap
- AI-powered lead scoring
- Advanced analytics suite
- Certification marketplace
- Partner collaboration tools

### Year 3 Vision
- Global operator network
- Multi-language support
- Industry-specific certifications
- Operator-built extensions marketplace

---

*Version 1.0 - August 2025*
*Next Review: October 2025*
