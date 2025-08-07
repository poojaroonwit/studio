# Task Board Feature

## Overview

The Task Board is a modern kanban-style task management interface that allows users to visualize and manage tasks across different stages. It features drag-and-drop functionality, task details, and comprehensive filtering options.

## Features

### 🎯 Core Features
- **Drag & Drop**: Move tasks between stages by dragging and dropping
- **Stage-based Organization**: Tasks are organized into customizable stages (columns)
- **Task Details**: Click on any task to view and edit detailed information
- **Real-time Updates**: Changes are reflected immediately with optimistic updates

### 📋 Task Information
Each task displays:
- **Title**: The main task name
- **Description**: Detailed task description
- **Priority**: Visual priority indicators (Low, Medium, High, Urgent)
- **Assignee**: Person responsible for the task with avatar
- **Due Date**: Task deadline with overdue highlighting
- **Tags**: Categorization tags
- **Status**: Current stage/status

### 🔍 Filtering & Search
- **Search**: Find tasks by title or description
- **Priority Filter**: Filter by task priority level
- **Assignee Filter**: Filter by task assignee
- **Real-time Filtering**: Results update as you type

### 🎨 Visual Features
- **Color-coded Stages**: Each stage has a distinct color
- **Priority Colors**: Different colors for priority levels
- **Overdue Indicators**: Visual warnings for overdue tasks
- **Responsive Design**: Works on desktop and mobile devices

## Usage

### Accessing the Task Board

1. Navigate to **Task Board** in the sidebar (under Recruitment section)
2. The board will load with sample data for demonstration

### Moving Tasks

1. **Drag and Drop**: Click and hold on any task card
2. **Drop Zone**: Drag to the desired stage column
3. **Visual Feedback**: Drop zones are highlighted when hovering
4. **Confirmation**: A success message confirms the move

### Viewing Task Details

1. **Click on Task**: Click any task card to open details
2. **Edit Mode**: Click "Edit" to modify task information
3. **Save Changes**: Click "Save" to apply changes
4. **Cancel**: Click "Cancel" to discard changes

### Adding New Tasks

1. **Add Button**: Click "Add Task" in the header
2. **Fill Form**: Complete the task creation form
3. **Required Fields**: Title is required, others are optional
4. **Create**: Click "Create Task" to add to the board

### Filtering Tasks

1. **Search Box**: Type to search task titles and descriptions
2. **Priority Filter**: Select priority level from dropdown
3. **Assignee Filter**: Select specific assignee from dropdown
4. **Clear Filters**: Reset all filters to show all tasks

## Technical Implementation

### Components

- **TaskBoard**: Main kanban board component
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
}

interface TaskStage {
  id: string;
  name: string;
  color?: string;
  description?: string;
  sortOrder?: number;
}
```

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
3. Set appropriate colors and descriptions
4. Update sort order as needed

### Custom Task Fields

1. Extend the `Task` interface with new properties
2. Update the task card display to show new fields
3. Modify the task detail modal to include new fields
4. Update the add task form for new fields

### Styling

The Task Board uses Tailwind CSS classes and can be customized by:
- Modifying color schemes in the component
- Adjusting spacing and layout classes
- Customizing card designs and animations
- Updating responsive breakpoints

## Future Enhancements

### Planned Features
- **Bulk Operations**: Select multiple tasks for batch actions
- **Task Templates**: Predefined task templates for common workflows
- **Time Tracking**: Built-in time tracking for tasks
- **Attachments**: File attachments for tasks
- **Comments**: Task-specific comments and discussions
- **Automation**: Automated task transitions based on rules
- **Reporting**: Task analytics and reporting features

### Integration Opportunities
- **Calendar Integration**: Sync with external calendars
- **Email Notifications**: Automated email notifications for task updates
- **API Integration**: Connect with external task management systems
- **Mobile App**: Native mobile application for task management

## Troubleshooting

### Common Issues

1. **Drag and Drop Not Working**
   - Ensure JavaScript is enabled
   - Check for browser compatibility
   - Verify no conflicting event handlers

2. **Tasks Not Updating**
   - Check network connectivity
   - Verify API endpoints are accessible
   - Review browser console for errors

3. **Performance Issues**
   - Reduce number of tasks displayed
   - Implement pagination for large datasets
   - Optimize database queries

### Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile Browsers**: Responsive design supported

## API Endpoints

The Task Board uses the following API endpoints:

- `GET /api/candidates` - Fetch candidate data
- `PUT /api/candidates/{id}` - Update candidate status
- `GET /api/settings/recruitment-stages` - Fetch stage configuration

## Contributing

To contribute to the Task Board feature:

1. Follow the existing code style and patterns
2. Add appropriate TypeScript types
3. Include error handling and loading states
4. Test drag and drop functionality
5. Ensure responsive design works
6. Update documentation for new features
