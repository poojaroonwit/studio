# Warning Configuration System

## Overview

The Warning Configuration system allows you to set up automated monitoring and alerts for various entities in the recruitment system. It can monitor positions, candidates, and headcount records for specific conditions and trigger warnings when those conditions are met.

## Features

### 1. Entity Types
- **Position**: Monitor position-related fields and conditions
- **Candidate**: Monitor candidate-related fields and conditions  
- **Headcount**: Monitor headcount-related fields and conditions

### 2. Condition Types

#### Simple Conditions
Single condition monitoring with basic operators.

#### Complex Conditions
Multiple conditions combined with logical operators (AND, OR, NOT) for advanced monitoring scenarios.

#### Cross-Entity Conditions
Conditions that monitor across different entity types (e.g., Position AND Candidate conditions together).

**Logical Operators:**
- **AND**: All conditions must be true for the warning to trigger
- **OR**: Any condition can be true for the warning to trigger  
- **NOT**: The condition must be false for the warning to trigger (single condition only)

**Examples of Simple Conditions:**
- **Overdue Hiring**: Monitor positions where hiring date is overdue
- **Missing Contact Info**: Alert when candidate email or phone is empty
- **Budget Threshold**: Warn when position budget exceeds limit

**Examples of Complex Conditions:**
- **AND Example**: "Position is overdue AND status is 'Open'" - Warns when both conditions are true
- **OR Example**: "Candidate email is empty OR phone is empty" - Warns when either field is missing
- **NOT Example**: "NOT position is active" - Warns when position is not active

**Examples of Cross-Entity Conditions:**
- **AND Example**: "Position is overdue AND Candidate status is 'Active'" - Warns when position is overdue AND the candidate is still active
- **OR Example**: "Position hiringDate is empty OR Candidate applicationDate is empty" - Warns when either entity has missing date information
- **NOT Example**: "NOT (Position is closed AND Candidate is hired)" - Warns when position is not closed or candidate is not hired

### 3. Individual Condition Types

#### Overdue
Monitors if a date field is overdue by a specified number of days.

**Fields:** Any date field (hiringDate, applicationDate, etc.)
**Operators:** Greater than (gt)
**Value:** Number of days (optional - will use grade SLA if not specified)

#### Empty
Monitors if a field is empty or not empty.

**Fields:** Any text or required field
**Operators:** 
- Equal (eq) - Field is empty
- Not equal (ne) - Field is not empty

#### Threshold
Monitors if a numeric field meets a specific threshold.

**Fields:** Any numeric field (budget, salary, etc.)
**Operators:** 
- Greater than (gt)
- Less than (lt)
- Equal (eq)
- Not equal (ne)
- Greater than or equal (gte)
- Less than or equal (lte)
**Value:** Numeric threshold value

#### Date Range
Monitors if a date falls within a specific range.

**Fields:** Any date field
**Operators:** 
- Before (lt)
- After (gt)
- Equal (eq)
- Not equal (ne)
**Value:** Date in YYYY-MM-DD format

#### Custom
Monitors if a field matches a specific value.

**Fields:** Any field
**Operators:** 
- Equal (eq)
- Not equal (ne)
- Contains (contains)
- Starts with (startsWith)
- Ends with (endsWith)
**Value:** Expected value

## Configuration Options

### Basic Settings
- **Name**: Unique name for the configuration
- **Description**: Optional description of what the warning monitors
- **Entity Type**: Primary entity type being monitored
- **Severity**: Warning severity level
- **Warning Level**: Priority level for the warning (Low, Medium, High, Critical)
- **Active/Inactive**: Enable or disable the configuration
- **Public/Private**: Share with all users or keep private

### Condition Configuration

#### Simple Conditions
- **Entity Type**: Select the entity to monitor (Position, Candidate, Headcount)
- **Field**: Choose the specific field to monitor
- **Condition Type**: Select the type of condition (Overdue, Empty, Threshold, etc.)
- **Operator**: Choose the comparison operator (if applicable)
- **Value/Threshold**: Set the comparison value or threshold

#### Complex Conditions
- **Logical Operator**: Choose AND, OR, or NOT
- **Multiple Conditions**: Add multiple individual conditions
- **Condition Management**: Add, remove, or modify individual conditions
- **Validation**: System ensures NOT operator is used with only one condition

#### Cross-Entity Conditions
- **Logical Operator**: Choose AND, OR, or NOT
- **Multiple Conditions**: Add multiple individual conditions across different entities
- **Condition Management**: Add, remove, or modify individual conditions
- **Validation**: System ensures NOT operator is used with only one condition

## Use Cases

### Simple Condition Examples
1. **Overdue Hiring**: Monitor positions where hiring date is overdue
2. **Missing Contact Info**: Alert when candidate email or phone is empty
3. **Budget Threshold**: Warn when position budget exceeds limit

### Complex Condition Examples
1. **High Priority Overdue**: 
   - Condition 1: Position is overdue
   - Condition 2: Position priority is "High"
   - Operator: AND
   - Result: Warns only for high-priority overdue positions

2. **Missing Critical Info**:
   - Condition 1: Candidate email is empty
   - Condition 2: Candidate phone is empty
   - Operator: OR
   - Result: Warns if either contact method is missing

3. **Inactive Position Alert**:
   - Condition 1: Position status is "Active"
   - Operator: NOT
   - Result: Warns when position is not active

### Cross-Entity Condition Examples
1. **Overdue Position with Active Candidate**:
   - Condition 1: Position is overdue (Entity: Position)
   - Condition 2: Candidate status is "Active" (Entity: Candidate)
   - Operator: AND
   - Result: Warns when position is overdue AND candidate is still active

2. **Missing Critical Dates**:
   - Condition 1: Position hiringDate is empty (Entity: Position)
   - Condition 2: Candidate applicationDate is empty (Entity: Candidate)
   - Operator: OR
   - Result: Warns when either position or candidate has missing date information

3. **Incomplete Hiring Process**:
   - Condition 1: Position status is "Open" (Entity: Position)
   - Condition 2: Candidate status is "Hired" (Entity: Candidate)
   - Operator: AND
   - Result: Warns when position is still open but candidate is marked as hired

## Best Practices

1. **Use Simple Conditions** for straightforward monitoring needs
2. **Use Complex Conditions** when you need to combine multiple criteria within the same entity
3. **Use Cross-Entity Conditions** when you need to monitor relationships between different entities
4. **Choose Appropriate Logical Operators**:
   - Use AND when all conditions must be met
   - Use OR when any condition can trigger the warning
   - Use NOT sparingly and only with single conditions
5. **Set Appropriate Severity Levels** based on business impact
6. **Use Descriptive Names** to make configurations easily identifiable
7. **Test Configurations** before making them active
8. **Review and Update** configurations regularly
9. **Consider Performance Impact** of cross-entity conditions as they may require additional data queries

## Technical Details

### Database Schema
The system supports three types of conditions:
- **Simple conditions** use the original `field`, `condition`, `operator`, `value`, and `threshold` fields
- **Complex conditions** use the `logicalOperator` and `conditions` (JSON) fields
- **Cross-entity conditions** use the `logicalOperator` and `crossEntityConditions` (JSON) fields

### Backward Compatibility
- Existing simple condition configurations continue to work unchanged
- New complex and cross-entity condition configurations are stored separately
- The system automatically detects and handles all three types

### Performance Considerations
- Complex conditions are evaluated efficiently using optimized logic
- The system caches condition evaluation results where appropriate
- Database queries are optimized for both simple and complex configurations
