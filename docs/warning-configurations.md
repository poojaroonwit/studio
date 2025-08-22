# Warning Configuration System

## Overview

The Warning Configuration system allows you to set up automated monitoring and alerts for various entities in the recruitment system. It can monitor positions, candidates, and headcount records for specific conditions and trigger warnings when those conditions are met.

## Features

### 1. Entity Types
- **Position**: Monitor position-related fields and conditions
- **Candidate**: Monitor candidate-related fields and conditions  
- **Headcount**: Monitor headcount-related fields and conditions

### 2. Condition Types

#### Overdue
Monitors date fields to check if they are overdue by a specified number of days.

**Dynamic Threshold Option**: 
- **Fixed Threshold**: Set a specific number of days (e.g., 30 days)
- **Dynamic Threshold**: Automatically uses the position's grade SLA days
  - Junior: 30 days SLA
  - Mid-Level: 45 days SLA  
  - Senior: 60 days SLA
  - Lead: 90 days SLA

**Benefits of Dynamic Threshold:**
- Automatically adapts to each position's grade requirements
- No need to manually configure different thresholds for different position levels
- Ensures consistency with the organization's SLA policies
- Reduces configuration overhead

#### Empty
Checks if a field is empty or null.

#### Threshold
Compares numeric values against a specified threshold using operators like greater than, less than, equal, etc.

#### Date Range
Monitors date fields against specific date ranges.

#### Custom
Performs custom string-based checks like contains, starts with, ends with, etc.

### 3. Severity Levels
- **Info**: Informational warnings
- **Warning**: Standard warnings
- **Error**: Error-level warnings
- **Critical**: Critical warnings requiring immediate attention

## Configuration Options

### Basic Settings
- **Name**: Descriptive name for the configuration
- **Description**: Optional detailed description
- **Severity**: Warning severity level
- **Active/Inactive**: Enable or disable the configuration
- **Public**: Share with all users or keep private

### Entity Configuration
- **Entity Type**: Choose the type of entity to monitor
- **Field**: Select the specific field to monitor

### Condition Configuration
- **Condition Type**: Choose the type of condition to check
- **Operator**: Select the comparison operator (for applicable conditions)
- **Value**: Set the comparison value (for applicable conditions)
- **Threshold**: Set the number of days for overdue conditions

## Dynamic Threshold for Overdue Conditions

When creating an overdue warning configuration, you have two options for the threshold:

### Option 1: Fixed Threshold
- Enter a specific number of days
- The warning will trigger when the date field is overdue by exactly that number of days
- Example: Set to 30 days for all positions

### Option 2: Dynamic Threshold (Grade SLA)
- Enable the "Use position grade SLA" option
- The system will automatically use the SLA days from each position's assigned grade
- Different positions will have different thresholds based on their grade
- Example: A Senior position will use 60 days, while a Junior position will use 30 days

### How Dynamic Threshold Works
1. When a warning check runs, the system looks at the position's assigned grade
2. If the grade has an SLA configuration, it uses those days as the threshold
3. If no grade is assigned or no SLA is configured, it falls back to a default of 30 days
4. The warning message will indicate which grade's SLA was used

### Example Warning Messages
- **Fixed Threshold**: "Position Hiring Overdue: hiringDate is overdue by 30 days"
- **Dynamic Threshold**: "Position Hiring Overdue: hiringDate is overdue (60 days SLA from Senior exceeded)"

## Best Practices

1. **Use Dynamic Thresholds** for position-related overdue warnings to ensure consistency with your SLA policies
2. **Use Fixed Thresholds** when you need a specific deadline regardless of position level
3. **Set Appropriate Severity Levels** based on the business impact
4. **Provide Clear Descriptions** to help other users understand the purpose
5. **Test Configurations** with sample data before activating

## API Integration

The warning system integrates with the existing SLA monitoring system and can be used alongside other monitoring tools. Warning configurations can be created, updated, and managed through the API endpoints.

## Sharing and Permissions

- **Private**: Only the creator can see and manage the configuration
- **Public**: All users can see and use the configuration
- **Shared**: Specific users can be given access with edit/delete permissions
