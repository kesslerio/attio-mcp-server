# Customer Success Pattern

## Keywords

`renewal`, `churn`, `health score`, `CSM`, `retention`, `NRR`, `expansion`, `QBR`, `onboarding`, `customer lifecycle`

## Overview

Customer Success workflows for retention and renewal management. Track customer health, monitor churn risk, manage CSM books of business, and orchestrate renewal and expansion motions.

## When to Use

- Managing customer health scores
- Tracking renewal pipelines
- Monitoring churn risk signals
- Running quarterly business reviews (QBRs)
- Managing CSM account assignments
- Driving expansion and upsell opportunities

## Workflow Steps

### Customer Health Scoring

```
Step 1: Aggregate health signals
const health_signals = {
  usage_trend: calculate_usage_trend(last_30d),      // Up, Down, Flat
  support_tickets: get_ticket_count(last_30d),       // Count
  nps_score: get_latest_nps(),                       // 0-10
  engagement_score: calculate_engagement(),          // 0-100
  payment_status: get_payment_status(),              // Current, Late, At-risk
  renewal_date: get_renewal_date()                   // Days until renewal
};

Step 2: Calculate composite health score
const health_score = weighted_average({
  usage: { score: health_signals.usage_trend, weight: 30 },
  support: { score: invert_ticket_score(health_signals.support_tickets), weight: 20 },
  nps: { score: health_signals.nps_score * 10, weight: 25 },
  engagement: { score: health_signals.engagement_score, weight: 15 },
  payment: { score: payment_score(health_signals.payment_status), weight: 10 }
});

Step 3: Update company record
{
  resource_type: 'companies',
  record_id: customer.record_id,
  record_data: {
    // Custom attributes - verify via schema
    // health_score: health_score,
    // health_status: health_score >= 70 ? 'Healthy' : health_score >= 40 ? 'At-Risk' : 'Critical',
    // last_health_update: new Date().toISOString()
  }
}

Step 4: Route at-risk accounts
if (health_score < 40) {
  // Add to at-risk list
  {
    listId: 'at-risk-customers-id',
    record_id: customer.record_id
  }

  // Create urgent task for CSM
  {
    content: `Critical health score (${health_score}) - immediate intervention needed`,
    title: 'At-Risk Account Review',
    linked_records: [{
      target_object: 'companies',
      target_record_id: customer.record_id
    }],
    assignees: [csm_person_id],
    dueDate: today()
  }
}
```

### Renewal Pipeline Management

```
Step 1: Get renewals in window (90 days)
{
  listId: 'upcoming-renewals-id',
  // Filter: renewal_date within 90 days
}

Step 2: Create renewal deal
{
  resource_type: 'deals',
  record_data: {
    name: `Renewal - ${customer.name} - ${renewal_year}`,
    value: current_arr,
    stage: 'Renewal Due',
    associated_company: [customer.record_id]
    // Custom: renewal_date, contract_term, expansion_potential
  }
}

Step 3: Add to renewal pipeline list
{
  listId: 'renewal-pipeline-id',
  record_id: deal.record_id
}

Step 4: Create renewal kickoff task
{
  content: 'Schedule renewal discussion',
  title: 'Renewal Kickoff',
  linked_records: [{
    target_object: 'deals',
    target_record_id: deal.record_id
  }],
  dueDate: renewal_date_minus_60_days
}
```

### Churn Risk Monitoring

```
Step 1: Identify churn signals
const churn_signals = [
  { signal: 'usage_decline', detected: usage_down_30_percent },
  { signal: 'key_contact_left', detected: champion_churned },
  { signal: 'support_escalation', detected: recent_escalation },
  { signal: 'payment_issues', detected: payment_failed },
  { signal: 'competitor_mention', detected: competitor_in_notes }
];

Step 2: Document churn risk
{
  resource_type: 'companies',
  record_id: customer.record_id,
  title: 'Churn Risk Assessment',
  content: `Risk Level: High
Signals Detected:
${detected_signals.map(s => `- ${s.signal}`).join('\n')}

Recommended Actions:
1. Executive outreach
2. Product roadmap review
3. Pricing discussion
4. Success plan refresh`
}

Step 3: Escalate if critical
if (detected_signals.length >= 3) {
  {
    content: 'Multiple churn signals detected - executive escalation needed',
    title: 'Churn Risk Escalation',
    linked_records: [{
      target_object: 'companies',
      target_record_id: customer.record_id
    }],
    assignees: [cs_manager_id, account_exec_id],
    dueDate: today()
  }
}
```

### CSM Book Management

```
Step 1: Assign CSM to account
{
  resource_type: 'companies',
  record_id: customer.record_id,
  record_data: {
    team: [csm_person_id]                // Standard: team assignment
    // Custom: primary_csm, csm_assigned_date
  }
}

Step 2: Get CSM's book of business
{
  resource_type: 'companies',
  // Filter by team contains csm_person_id
}

Step 3: Calculate book metrics
const book_metrics = {
  total_arr: sum(accounts.map(a => a.arr)),
  account_count: accounts.length,
  avg_health: average(accounts.map(a => a.health_score)),
  upcoming_renewals: accounts.filter(a => a.renewal_in_90d).length
};
```

## Health Score Tiers

| Score  | Status   | Action                  |
| ------ | -------- | ----------------------- |
| 80-100 | Healthy  | Expansion opportunities |
| 60-79  | Stable   | Regular engagement      |
| 40-59  | At-Risk  | Proactive outreach      |
| 0-39   | Critical | Immediate intervention  |

## Renewal Timeline

| Days to Renewal | Action                           |
| --------------- | -------------------------------- |
| 90              | Create renewal deal, assign CSM  |
| 60              | Kickoff call, value review       |
| 45              | Pricing/terms discussion         |
| 30              | Contract negotiation             |
| 14              | Final terms, executive alignment |
| 0               | Close and renew                  |

## Key Points

- **Health = leading indicator** - Monitor before churn happens
- **Renewal = deal object** - Track value and stages
- **CSM = team assignment** - Use standard team field
- **Notes = relationship history** - Document every interaction
- **Tasks = never miss renewals** - Automated reminders

## Cross-References

- [Golden Rules](../golden-rules.md) - Team assignments, date formatting
- [Tool Reference](../tool-reference.md) - `update-record`, `create-deal`, `create-task`
- [Deal Stage Automation](deal-stage-automation.md) - Renewal stage progression
- **attio-workspace-schema skill** - Your CS-specific attributes
