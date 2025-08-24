# Warning Configuration Seeding Guide

## Overview

This guide explains how to seed warning configurations in the recruitment system. Warning configurations allow you to set up automated monitoring and alerts for various entities.

## Configuration Types

### Simple Conditions
Single condition monitoring with basic operators.

### Complex Conditions
Multiple conditions combined with logical operators (AND, OR, NOT) for advanced monitoring scenarios.

### Cross-Entity Conditions
Cross-entity conditions monitor relationships between different entities (e.g., Position AND Candidate conditions together).

**Logical Operators:**
- **AND**: All conditions must be true for the warning to trigger
- **OR**: Any condition can be true for the warning to trigger  
- **NOT**: The condition must be false for the warning to trigger (single condition only)

## Seeding Process

### 1. Access the Seeding Interface
- Navigate to Settings > Warning Configurations
- Click on the "Seed Configurations" button (if available)
- Or use the direct seeding endpoint: `/api/settings/warning-configurations/seed`

### 2. Choose Configuration Type
- Select from "Simple Conditions", "Complex Conditions", or "Cross-Entity Conditions"
- Each type offers different levels of flexibility and complexity

### 3. Configure Basic Settings
- **Name**: Enter a descriptive name for the configuration
- **Description**: Optional description of what the warning monitors
- **Entity Type**: Select the primary entity type (Position, Candidate, Headcount)
- **Severity**: Choose the severity level (Info, Warning, Error, Critical)
- **Active Status**: Enable or disable the configuration
- **Visibility**: Set as public or private

### 4. Set Up Conditions Based on Type

#### Simple Conditions
- **Entity Type**: Select the entity to monitor
- **Field**: Choose the specific field to monitor
- **Condition Type**: Select the type of condition (Overdue, Empty, Threshold, Date Range, Custom)
- **Operator**: Choose the comparison operator (if applicable)
- **Value/Threshold**: Set the comparison value or threshold

#### Complex Conditions
- **Logical Operator**: Choose AND, OR, or NOT
- **Add Conditions**: Click "Add Condition" for each condition
- **Configure Each Condition**:
  - **Field**: Choose the specific field to monitor
  - **Condition Type**: Select the type of condition
  - **Operator**: Choose the comparison operator (if applicable)
  - **Value/Threshold**: Set the comparison value or threshold

#### Cross-Entity Conditions
- **Logical Operator**: Choose AND, OR, or NOT
- **Add Conditions**: Click "Add Cross-Entity Condition" for each condition
- **Configure Each Condition**:
  - **Entity Type**: Select the entity to monitor (Position, Candidate, Headcount, Grade, Recruiter, Source)
  - **Field**: Choose the specific field to monitor
  - **Condition Type**: Select the type of condition (Overdue, Empty, Threshold, Date Range, Custom)
  - **Operator**: Choose the comparison operator (if applicable)
  - **Value/Threshold**: Set the comparison value or threshold

### 5. Save Configuration
- Review all settings
- Click "Create Configuration" to save
- The system will validate the configuration before saving

## Example Configurations

### Example 1: Simple Condition - Overdue Position
```json
{
  "name": "Overdue Position",
  "description": "Warns when a position is overdue",
  "entityType": "position",
  "field": "hiringDate",
  "condition": "overdue",
  "operator": "gt",
  "threshold": 30,
  "severity": "warning",
  "isActive": true,
  "isPublic": true
}
```

### Example 2: Complex Condition - High Priority Overdue
```json
{
  "name": "High Priority Overdue Position",
  "description": "Warns when high priority positions are overdue",
  "entityType": "position",
  "severity": "critical",
  "isActive": true,
  "isPublic": true,
  "logicalOperator": "AND",
  "conditions": [
    {
      "field": "hiringDate",
      "condition": "overdue",
      "operator": "gt",
      "threshold": 45
    },
    {
      "field": "priority",
      "condition": "custom",
      "operator": "eq",
      "value": "High"
    }
  ]
}
```

### Example 3: Cross-Entity Condition - Overdue Position with Active Candidate
```json
{
  "name": "Overdue Position with Active Candidate",
  "description": "Warns when a position is overdue and the candidate is still active",
  "entityType": "candidate",
  "severity": "warning",
  "isActive": true,
  "isPublic": true,
  "logicalOperator": "AND",
  "crossEntityConditions": [
    {
      "entityType": "position",
      "field": "hiringDate",
      "condition": "overdue",
      "operator": "gt",
      "threshold": 30
    },
    {
      "entityType": "candidate",
      "field": "status",
      "condition": "custom",
      "operator": "eq",
      "value": "Active"
    }
  ]
}
```

### Example 4: Missing Contact Information
```json
{
  "name": "Missing Contact Information",
  "description": "Warns when candidate is missing email or phone",
  "entityType": "candidate",
  "severity": "error",
  "isActive": true,
  "isPublic": true,
  "logicalOperator": "OR",
  "crossEntityConditions": [
    {
      "entityType": "candidate",
      "field": "email",
      "condition": "empty",
      "operator": "eq"
    },
    {
      "entityType": "candidate",
      "field": "phone",
      "condition": "empty",
      "operator": "eq"
    }
  ]
}
```

## Available Fields by Entity Type

### Candidate Fields
- `name`, `email`, `phone`, `status`, `applicationDate`, `experience`, `skills`, `resume`, `notes`

### Position Fields
- `title`, `department`, `status`, `priority`, `hiringDate`, `budget`, `requirements`, `description`

### Headcount Fields
- `count`, `filled`, `remaining`, `createdAt`, `updatedAt`

### Grade Fields
- `name`, `slaDays`, `minLevel`, `maxLevel`

### Recruiter Fields
- `name`, `email`, `role`

### Source Fields
- `name`, `type`

## Condition Types

### Overdue
Monitors if a date field is overdue by a specified number of days.
- **Fields**: Any date field
- **Operators**: Greater than (gt)
- **Value**: Number of days (optional - will use grade SLA if not specified)

### Empty
Monitors if a field is empty or not empty.
- **Fields**: Any text or required field
- **Operators**: Equal (eq) - Field is empty, Not equal (ne) - Field is not empty

### Threshold
Monitors if a numeric field meets a specific threshold.
- **Fields**: Any numeric field
- **Operators**: gt, lt, eq, ne, gte, lte
- **Value**: Numeric threshold value

### Date Range
Monitors if a date falls within a specific range.
- **Fields**: Any date field
- **Operators**: lt, gt, eq, ne
- **Value**: Date in YYYY-MM-DD format

### Custom
Monitors if a field matches a specific value.
- **Fields**: Any field
- **Operators**: eq, ne, contains, startsWith, endsWith
- **Value**: Expected value

## Best Practices

1. **Use Descriptive Names**: Make configuration names clear and descriptive
2. **Set Appropriate Severity**: Choose severity levels based on business impact
3. **Test Configurations**: Always test configurations before making them active
4. **Use Logical Operators Wisely**: 
   - Use AND when all conditions must be met
   - Use OR when any condition can trigger the warning
   - Use NOT sparingly and only with single conditions
5. **Consider Performance**: Cross-entity conditions may require additional data queries
6. **Review Regularly**: Periodically review and update configurations
7. **Choose the Right Condition Type**:
   - Use Simple Conditions for straightforward monitoring
   - Use Complex Conditions for multiple criteria on the same entity
   - Use Cross-Entity Conditions for relationships between different entities

## Troubleshooting

### Common Issues
1. **Configuration Not Triggering**: Check if all conditions are properly configured
2. **Performance Issues**: Consider reducing the number of conditions or optimizing field selections
3. **Validation Errors**: Ensure all required fields are filled and operators are appropriate for the condition type

### Validation Rules
- All conditions must have appropriate fields and condition types specified
- Operators are required for all conditions except 'empty' and 'overdue'
- NOT operator can only be used with a single condition
- At least one condition is required for complex and cross-entity configurations
- Cross-entity conditions must specify the entity type for each condition
