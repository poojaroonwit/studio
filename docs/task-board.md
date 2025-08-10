# Task Board Documentation

## Overview

The Task Board is a Kanban-style interface for managing tasks and candidates in different stages. It provides drag-and-drop functionality, filtering capabilities, and real-time updates.

## Features

### Multi-Select Stage Filtering

The Task Board includes a built-in multi-select stage filter that allows you to:

1. **Filter by Multiple Stages**: Select multiple stages to show only those columns
2. **Show All Stages**: When no stages are selected, all stages are displayed
3. **Visual Indicators**: The filter button shows the number of selected stages
4. **Quick Actions**: Use "All" to select all stages or "Clear" to deselect all

#### How to Use Stage Filtering

1. **Access the Filter**: Click the "Filter Stages" button in the top-right corner of the board
2. **Select Stages**: Click on stage names to select/deselect them
3. **Visual Feedback**: Selected stages are highlighted in blue
4. **Apply Filter**: The board immediately updates to show only selected stage columns
5. **Clear Filter**: Click "Clear" to show all stages again

#### Filter Button States

- **No Selection**: Shows "All Stages (X)" where X is the total number of stages
- **Selected Stages**: Shows "X Stage(s)" where X is the number of selected stages
- **Filter Active**: A blue badge appears next to the candidate count showing "X stage(s) selected"

### Task Management

1. **Drag and Drop**: Drag tasks between stages to update their status
2. **Click to View**: Click any task card to open detailed view
3. **Add Tasks**: Use the "+" button in each stage header to add new tasks
4. **Visual Feedback**: Drag indicators show where tasks can be dropped

### Task Information Display

Each task card shows:
- **Avatar**: User avatar or initials
- **Title**: Task name
- **Description**: Task details (if available)
- **Email**: Contact information (if available)
- **Fit Score**: Performance indicator with color coding
- **Tags**: Associated labels
- **Assignee**: Assigned team member (if enabled)

## Technical Implementation

### Components

- **TaskBoard**: Main kanban board component with built-in stage filtering
- **TaskDetailModal**: Task details and editing modal
- **AddTaskModal**: New task creation modal

### Data Structure

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  dueDate?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  fitScore?: number;
  avatarUrl?: string;
  email?: string;
}

interface TaskStage {
  id: string;
  name: string;
  color?: string;
  description?: string;
  sortOrder?: number;
}
```

### Stage Filtering Logic

The stage filtering works as follows:

1. **Default State**: When `selectedStages` is empty, all stages are shown
2. **Filtered State**: When stages are selected, only those stages appear as columns
3. **Task Grouping**: Tasks are grouped by their status and only shown in matching stage columns
4. **Real-time Updates**: Filter changes are applied immediately without page refresh

### Integration with Existing System

The Task Board can be integrated with the existing candidate management system:

1. **Candidate Conversion**: Candidates can be converted to tasks for recruitment workflows
2. **Stage Mapping**: Recruitment stages map to task board stages
3. **Assignee Mapping**: Recruiters become task assignees
4. **Status Updates**: Task status changes update candidate status

## Customization

### Adding Custom Stages

1. Modify the `sampleStages` array in the task board page
2. Add new stage objects with unique IDs
3. Update the stage conversion logic if needed

### Styling Customization

The TaskBoard component accepts various props for customization:
- `showAssignee`: Toggle assignee display
- `showPriority`: Toggle priority display  
- `showDueDate`: Toggle due date display
- `showTags`: Toggle tags display
- `className`: Custom CSS classes

## Usage Examples

### Basic Task Board
```tsx
<TaskBoard
  tasks={tasks}
  stages={stages}
  onMoveTask={handleMoveTask}
  onTaskClick={handleTaskClick}
  showAssignee={true}
  showTags={true}
/>
```

### Customized Task Board
```tsx
<TaskBoard
  tasks={tasks}
  stages={stages}
  onMoveTask={handleMoveTask}
  onTaskClick={handleTaskClick}
  showAssignee={false}
  showPriority={true}
  showDueDate={true}
  showTags={false}
  className="custom-task-board"
/>
```

## Best Practices

1. **Stage Naming**: Use clear, descriptive stage names
2. **Task Descriptions**: Provide meaningful descriptions for better context
3. **Assignee Assignment**: Assign tasks to appropriate team members
4. **Regular Updates**: Keep task status current for accurate filtering
5. **Filter Usage**: Use stage filtering to focus on specific workflows
