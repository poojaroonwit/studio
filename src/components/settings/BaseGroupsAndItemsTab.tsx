"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, AlertCircle, CheckCircle, X, ChevronDown, Search, Users, Activity, Settings, List, MoreVertical, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useDynamicZIndex } from '@/contexts/ZIndexContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BaseGroup {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

interface BaseItem {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  groupId?: string;
  group?: {
    id: string;
    name: string;
  };
  // Additional fields for expertise skills
  maxScore?: number;
  skillType?: string;
  iconUrl?: string;
}

interface BaseGroupsAndItemsTabProps {
  title: string;
  groupTitle: string;
  itemTitle: string;
  groupsEndpoint: string;
  itemsEndpoint: string;
  showSkillFields?: boolean;
  showGroupDetailsModal?: boolean;
  onGroupDetails?: (group: BaseGroup) => void;
}

// Sortable Group Component
function SortableGroup({ 
  group, 
  groupItems, 
  itemTitle, 
  isSelected, 
  onSelect, 
  onDelete, 
  onToggleActive, 
  showGroupDetailsModal, 
  onGroupDetails, 
  modalZIndex 
}: {
  group: BaseGroup;
  groupItems: BaseItem[];
  itemTitle: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  showGroupDetailsModal: boolean;
  onGroupDetails?: (group: BaseGroup) => void;
  modalZIndex: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer transition-colors p-3 rounded-md",
        isSelected ? "bg-primary/10" : "hover:bg-muted/50",
        isDragging && "opacity-50"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{group.name}</div>
                {group.description && (
                  <div className="text-sm text-muted-foreground">{group.description}</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {groupItems.length}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end"
                          style={{ zIndex: modalZIndex + 10 }}
            >
              {showGroupDetailsModal && (
                <>
                  <DropdownMenuItem onClick={() => onGroupDetails?.(group)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Group Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(group.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// Sortable Item Component
function SortableItem({ 
  item, 
  itemTitle, 
  showSkillFields, 
  onEdit, 
  onDelete, 
  onRemoveFromGroup, 
  onToggleActive, 
  selectedGroupId, 
  modalZIndex 
}: {
  item: BaseItem;
  itemTitle: string;
  showSkillFields: boolean;
  onEdit: (item: BaseItem) => void;
  onDelete: (id: string) => void;
  onRemoveFromGroup: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  selectedGroupId: string;
  modalZIndex: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-3">
              {item.iconUrl && (
                <img 
                  src={item.iconUrl} 
                  alt={`${item.name} icon`}
                  className="w-6 h-6 rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div>
                <div className="font-medium">{item.name}</div>
                {item.description && (
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                )}
                {showSkillFields && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={item.skillType === 'hard_skill' ? 'default' : 'secondary'}>
                      {item.skillType === 'hard_skill' ? 'Hard Skill' : 'Test Score'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Max Score: {item.maxScore}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleActive(item.id, item.isActive)}
            >
              {item.isActive ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Inactive
                </>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end"
                          style={{ zIndex: modalZIndex + 10 }}
              >
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit {itemTitle.slice(0, -1)}
                </DropdownMenuItem>
                {selectedGroupId !== 'all' && item.groupId === selectedGroupId && (
                  <DropdownMenuItem onClick={() => onRemoveFromGroup(item.id)}>
                    <X className="h-4 w-4 mr-2" />
                    Remove from Group
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(item.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {itemTitle.slice(0, -1)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BaseGroupsAndItemsTab({
  title,
  groupTitle,
  itemTitle,
  groupsEndpoint,
  itemsEndpoint,
  showSkillFields = false,
  showGroupDetailsModal = false,
  onGroupDetails
}: BaseGroupsAndItemsTabProps) {
  // Z-index management for dropdowns and modals
  const { contentZIndex: dropdownZIndex } = useDynamicZIndex('groups-and-items-dropdowns', 'dropdown');
  const { contentZIndex: modalZIndex } = useDynamicZIndex('groups-and-items-modals', 'modal');
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [groups, setGroups] = useState<BaseGroup[]>([]);
  const [items, setItems] = useState<BaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  
  // Dialog states
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [isCreateItemDialogOpen, setIsCreateItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isGroupDetailsDialogOpen, setIsGroupDetailsDialogOpen] = useState(false);
  
  // Selected items
  const [selectedGroup, setSelectedGroup] = useState<BaseGroup | null>(null);
  const [selectedItem, setSelectedItem] = useState<BaseItem | null>(null);
  
  // Item search states
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [itemSearchValue, setItemSearchValue] = useState('');
  const [newItemName, setNewItemName] = useState('');
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Form states
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: ''
  });

  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    groupId: 'none',
    iconUrl: '',
    ...(showSkillFields && {
      maxScore: 100,
      skillType: 'hard_skill'
    })
  });

  useEffect(() => {
    fetchGroups();
    fetchItems();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch(groupsEndpoint);
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error(`Error fetching ${groupTitle.toLowerCase()}:`, error);
      toast.error(`Failed to fetch ${groupTitle.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(itemsEndpoint);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error(`Error fetching ${itemTitle.toLowerCase()}:`, error);
    }
  };

  // Group handlers
  const handleCreateGroup = async () => {
    try {
      const response = await fetch(groupsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      if (response.ok) {
        toast.success(`${groupTitle} created successfully`);
        setIsCreateGroupDialogOpen(false);
        setGroupFormData({ name: '', description: '' });
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to create ${groupTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error creating ${groupTitle.toLowerCase()}:`, error);
      toast.error(`Failed to create ${groupTitle.toLowerCase()}`);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`${groupsEndpoint}/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      if (response.ok) {
        toast.success(`${groupTitle} updated successfully`);
        setIsEditGroupDialogOpen(false);
        setIsGroupDetailsDialogOpen(false);
        setSelectedGroup(null);
        setGroupFormData({ name: '', description: '' });
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to update ${groupTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error updating ${groupTitle.toLowerCase()}:`, error);
      toast.error(`Failed to update ${groupTitle.toLowerCase()}`);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(`Are you sure you want to delete this ${groupTitle.toLowerCase()}? This will also remove all associated ${itemTitle.toLowerCase()}.`)) {
      return;
    }

    try {
      const response = await fetch(`${groupsEndpoint}/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success(`${groupTitle} deleted successfully`);
        fetchGroups();
        fetchItems();
        if (selectedGroupId === groupId) {
          setSelectedGroupId('all');
        }
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to delete ${groupTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error deleting ${groupTitle.toLowerCase()}:`, error);
      toast.error(`Failed to delete ${groupTitle.toLowerCase()}`);
    }
  };

  const handleToggleGroupActive = async (groupId: string, isActive: boolean) => {
    try {
      const response = await fetch(`${groupsEndpoint}/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        toast.success(`${groupTitle} ${!isActive ? 'activated' : 'deactivated'} successfully`);
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to update ${groupTitle.toLowerCase()} status`);
      }
    } catch (error) {
      console.error(`Error updating ${groupTitle.toLowerCase()} status:`, error);
      toast.error(`Failed to update ${groupTitle.toLowerCase()} status`);
    }
  };

  // Item handlers
  const handleCreateItem = async () => {
    try {
      const response = await fetch(itemsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemFormData,
          groupId: itemFormData.groupId === 'none' ? null : itemFormData.groupId
        })
      });

      if (response.ok) {
        toast.success(`${itemTitle} created successfully`);
        setIsCreateItemDialogOpen(false);
        setItemFormData({ 
          name: '', 
          description: '', 
          groupId: 'none',
          iconUrl: '',
          ...(showSkillFields && {
            maxScore: 100,
            skillType: 'hard_skill'
          })
        });
        setSelectedFile(null);
        setPreviewUrl('');
        fetchItems();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to create ${itemTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error creating ${itemTitle.toLowerCase()}:`, error);
      toast.error(`Failed to create ${itemTitle.toLowerCase()}`);
    }
  };

  const handleUpdateItem = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`${itemsEndpoint}/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemFormData,
          groupId: itemFormData.groupId === 'none' ? null : itemFormData.groupId
        })
      });

      if (response.ok) {
        toast.success(`${itemTitle} updated successfully`);
        setIsEditItemDialogOpen(false);
        setSelectedItem(null);
        setItemFormData({ 
          name: '', 
          description: '', 
          groupId: 'none',
          iconUrl: '',
          ...(showSkillFields && {
            maxScore: 100,
            skillType: 'hard_skill'
          })
        });
        setSelectedFile(null);
        setPreviewUrl('');
        fetchItems();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to update ${itemTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error updating ${itemTitle.toLowerCase()}:`, error);
      toast.error(`Failed to update ${itemTitle.toLowerCase()}`);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm(`Are you sure you want to delete this ${itemTitle.toLowerCase()}?`)) {
      return;
    }

    try {
      const response = await fetch(`${itemsEndpoint}/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success(`${itemTitle} deleted successfully`);
        fetchItems();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to delete ${itemTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error deleting ${itemTitle.toLowerCase()}:`, error);
      toast.error(`Failed to delete ${itemTitle.toLowerCase()}`);
    }
  };

  const handleToggleActive = async (itemId: string, isActive: boolean) => {
    try {
      const response = await fetch(`${itemsEndpoint}/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        toast.success(`${itemTitle} ${!isActive ? 'activated' : 'deactivated'} successfully`);
        fetchItems();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to update ${itemTitle.toLowerCase()} status`);
      }
    } catch (error) {
      console.error(`Error updating ${itemTitle.toLowerCase()} status:`, error);
      toast.error(`Failed to update ${itemTitle.toLowerCase()} status`);
    }
  };

  const handleAddExistingItemToGroup = async (itemId: string) => {
    try {
      const response = await fetch(`${itemsEndpoint}/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          groupId: selectedGroupId === 'all' ? null : selectedGroupId 
        })
      });

      if (response.ok) {
        toast.success(`${itemTitle} updated successfully`);
        setItemSearchOpen(false);
        setItemSearchValue('');
        fetchItems();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to add ${itemTitle.toLowerCase()} to group`);
      }
    } catch (error) {
      console.error(`Error adding ${itemTitle.toLowerCase()} to group:`, error);
      toast.error(`Failed to add ${itemTitle.toLowerCase()} to group`);
    }
  };

  const handleCreateNewItemForGroup = async () => {
    try {
      const response = await fetch(itemsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName,
          description: '',
          groupId: selectedGroupId === 'all' ? null : selectedGroupId,
          iconUrl: '',
          ...(showSkillFields && {
            maxScore: 100,
            skillType: 'hard_skill'
          })
        })
      });

      if (response.ok) {
        toast.success(`New ${itemTitle.toLowerCase()} created successfully`);
        setItemSearchOpen(false);
        setItemSearchValue('');
        setNewItemName('');
        fetchItems();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to create new ${itemTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error creating new ${itemTitle.toLowerCase()}:`, error);
      toast.error(`Failed to create new ${itemTitle.toLowerCase()}`);
    }
  };

  const handleRemoveItemFromGroup = async (itemId: string) => {
    try {
      const response = await fetch(`${itemsEndpoint}/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: null })
      });

      if (response.ok) {
        toast.success(`${itemTitle} removed from group successfully`);
        fetchItems();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to remove ${itemTitle.toLowerCase()} from group`);
      }
    } catch (error) {
      console.error(`Error removing ${itemTitle.toLowerCase()} from group:`, error);
      toast.error(`Failed to remove ${itemTitle.toLowerCase()} from group`);
    }
  };

  // Drag and drop handlers
  const handleGroupDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = groups.findIndex((group) => group.id === active.id);
      const newIndex = groups.findIndex((group) => group.id === over?.id);

      const newGroups = arrayMove(groups, oldIndex, newIndex);
      setGroups(newGroups);

      // Update sort order in the database
      try {
        const updates = newGroups.map((group, index) => ({
          id: group.id,
          sortOrder: index
        }));

        await Promise.all(
          updates.map(update =>
            fetch(`${groupsEndpoint}/${update.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sortOrder: update.sortOrder })
            })
          )
        );

        toast.success(`${groupTitle} reordered successfully`);
      } catch (error) {
        console.error('Error updating group order:', error);
        toast.error('Failed to save group order');
        // Revert the change
        fetchGroups();
      }
    }
  };

  const handleItemDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const filteredItems = selectedGroupId === 'all' 
        ? items 
        : items.filter(item => item.groupId === selectedGroupId);
      
      const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
      const newIndex = filteredItems.findIndex((item) => item.id === over?.id);

      const newItems = arrayMove(filteredItems, oldIndex, newIndex);
      
      // Update the items array
      const updatedItems = [...items];
      newItems.forEach((item, index) => {
        const itemIndex = updatedItems.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], sortOrder: index };
        }
      });
      
      setItems(updatedItems);

      // Update sort order in the database
      try {
        const updates = newItems.map((item, index) => ({
          id: item.id,
          sortOrder: index
        }));

        await Promise.all(
          updates.map(update =>
            fetch(`${itemsEndpoint}/${update.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sortOrder: update.sortOrder })
            })
          )
        );

        toast.success(`${itemTitle} reordered successfully`);
      } catch (error) {
        console.error('Error updating item order:', error);
        toast.error('Failed to save item order');
        // Revert the change
        fetchItems();
      }
    }
  };

  // File upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setItemFormData({ ...itemFormData, iconUrl: url });
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setItemFormData({ ...itemFormData, iconUrl: '' });
  };

  // Dialog openers
  const openEditGroupDialog = (group: BaseGroup) => {
    setSelectedGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || ''
    });
    setIsEditGroupDialogOpen(true);
  };

  const openEditItemDialog = (item: BaseItem) => {
    setSelectedItem(item);
    setItemFormData({
      name: item.name,
      description: item.description || '',
      groupId: item.groupId || '',
      iconUrl: item.iconUrl || '',
      ...(showSkillFields && {
        maxScore: item.maxScore || 100,
        skillType: item.skillType || 'hard_skill'
      })
    });
    // Set preview for existing icon
    if (item.iconUrl) {
      setPreviewUrl(item.iconUrl);
    } else {
      setPreviewUrl('');
    }
    setSelectedFile(null);
    setIsEditItemDialogOpen(true);
  };

  const openGroupDetailsDialog = (group: BaseGroup) => {
    setSelectedGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || ''
    });
    setIsGroupDetailsDialogOpen(true);
  };

  // Filter items based on selected group
  const filteredItems = selectedGroupId === 'all' 
    ? items 
    : items.filter(item => item.groupId === selectedGroupId);

  // Get available items for search (items not in current group)
  const availableItems = selectedGroupId === 'all' 
    ? [] 
    : items.filter(item => item.groupId !== selectedGroupId);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Left Column - Groups (20%) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{groupTitle}</h3>
          <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create {groupTitle}</DialogTitle>
                <DialogDescription>
                  Create a new group to organize related {itemTitle.toLowerCase()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                    placeholder={`e.g., ${groupTitle}`}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-0">
          {/* All Groups option */}
          <div 
            className={cn(
              "cursor-pointer transition-colors p-3 rounded-md",
              selectedGroupId === 'all' ? "bg-primary/10" : "hover:bg-muted/50"
            )}
            onClick={() => setSelectedGroupId('all')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">All Groups</div>
                    <div className="text-sm text-muted-foreground">
                      View all {itemTitle.toLowerCase()} across all groups
                    </div>
                  </div>
                </div>
              </div>
              <Badge variant="outline">
                {items.length}
              </Badge>
            </div>
          </div>

          {/* Divider line under All Groups */}
          {groups.length > 0 && (
            <div className="border-t border-border/50 mx-3 my-2"></div>
          )}

          {/* Individual Groups */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleGroupDragEnd}
          >
            <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
              {groups.map((group, index) => {
                const groupItems = items.filter(item => item.groupId === group.id);
                return (
                  <div key={group.id}>
                    {/* Divider line between groups */}
                    {index > 0 && (
                      <div className="border-t border-border/50 mx-3 my-2"></div>
                    )}
                    <SortableGroup
                      group={group}
                      groupItems={groupItems}
                      itemTitle={itemTitle}
                      isSelected={selectedGroupId === group.id}
                      onSelect={() => setSelectedGroupId(group.id)}
                      onDelete={handleDeleteGroup}
                      onToggleActive={handleToggleGroupActive}
                      showGroupDetailsModal={showGroupDetailsModal}
                      onGroupDetails={onGroupDetails}
                      modalZIndex={modalZIndex}
                    />
                  </div>
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Right Column - Items (80%) */}
      <div className="col-span-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">
              {selectedGroupId === 'all' ? `All ${itemTitle}` : 
               groups.find(g => g.id === selectedGroupId)?.name + ` ${itemTitle}`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedGroupId === 'all' 
                ? `All ${itemTitle.toLowerCase()} across all groups`
                : `${itemTitle} in the selected group`
              }
            </p>
          </div>
          <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen}>
            <PopoverTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add {itemTitle.slice(0, -1)}
              </Button>
            </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <Command>
                  <CommandInput 
                    placeholder={`Search existing ${itemTitle.toLowerCase()} or type new ${itemTitle.toLowerCase()} name...`}
                    value={itemSearchValue}
                    onValueChange={setItemSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-2">
                        <div className="text-sm text-muted-foreground mb-2">
                          No existing {itemTitle.toLowerCase()} found. Create a new {itemTitle.toLowerCase()}:
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setItemSearchOpen(false);
                            setItemFormData({
                              name: '',
                              description: '',
                              groupId: selectedGroupId === 'all' ? 'none' : selectedGroupId,
                              iconUrl: '',
                              ...(showSkillFields && {
                                maxScore: 100,
                                skillType: 'hard_skill'
                              })
                            });
                            setIsCreateItemDialogOpen(true);
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create New {itemTitle.slice(0, -1)}
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {availableItems
                        .filter(item => 
                          item.name.toLowerCase().includes(itemSearchValue.toLowerCase())
                        )
                        .map((item) => (
                          <CommandItem
                            key={item.id}
                            onSelect={() => handleAddExistingItemToGroup(item.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{item.name}</div>
                              {showSkillFields && (
                                <Badge variant="outline" className="text-xs">
                                  {item.skillType === 'hard_skill' ? 'Hard Skill' : 'Test Score'}
                                </Badge>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      {itemSearchValue && (
                        <CommandItem onSelect={() => setNewItemName(itemSearchValue)}>
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Create "{itemSearchValue}"</span>
                          </div>
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
        </div>

        {filteredItems.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {selectedGroupId === 'all' 
                ? `No ${itemTitle.toLowerCase()} found. Create your first ${itemTitle.toLowerCase()} to get started.`
                : `No ${itemTitle.toLowerCase()} in this group. Add ${itemTitle.toLowerCase()} using the "Add ${itemTitle.slice(0, -1)}" button.`
              }
            </AlertDescription>
          </Alert>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    itemTitle={itemTitle}
                    showSkillFields={showSkillFields}
                    onEdit={openEditItemDialog}
                    onDelete={handleDeleteItem}
                    onRemoveFromGroup={handleRemoveItemFromGroup}
                    onToggleActive={handleToggleActive}
                    selectedGroupId={selectedGroupId}
                    modalZIndex={modalZIndex}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {groupTitle}</DialogTitle>
            <DialogDescription>
              Update the {groupTitle.toLowerCase()} details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={groupFormData.name}
                onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={groupFormData.description}
                onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup}>Update Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Item Dialog */}
      <Dialog open={isCreateItemDialogOpen} onOpenChange={setIsCreateItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {itemTitle}</DialogTitle>
            <DialogDescription>
              Create a new {itemTitle.toLowerCase()} with all the necessary details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-item-name">Name</Label>
              <Input
                id="create-item-name"
                value={itemFormData.name}
                onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="create-item-description">Description</Label>
              <Textarea
                id="create-item-description"
                value={itemFormData.description}
                onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="create-item-icon">Icon</Label>
              <div className="space-y-2">
                <Input
                  id="create-item-icon"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                {previewUrl && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={previewUrl} 
                      alt="Icon preview"
                      className="w-8 h-8 rounded object-cover"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {showSkillFields && (
              <>
                <div>
                  <Label htmlFor="create-item-skill-type">Skill Type</Label>
                  <Select
                    value={itemFormData.skillType}
                    onValueChange={(value) => setItemFormData({ ...itemFormData, skillType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hard_skill">Hard Skill</SelectItem>
                      <SelectItem value="test_score">Test Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="create-item-max-score">Max Score</Label>
                  <Input
                    id="create-item-max-score"
                    type="number"
                    min="1"
                    max="1000"
                    value={itemFormData.maxScore}
                    onChange={(e) => setItemFormData({ ...itemFormData, maxScore: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="create-item-group">Group</Label>
              <Select
                value={itemFormData.groupId}
                onValueChange={(value) => setItemFormData({ ...itemFormData, groupId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem}>Create {itemTitle.slice(0, -1)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {itemTitle}</DialogTitle>
            <DialogDescription>
              Update the {itemTitle.toLowerCase()} details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-item-name">Name</Label>
              <Input
                id="edit-item-name"
                value={itemFormData.name}
                onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-item-description">Description</Label>
              <Textarea
                id="edit-item-description"
                value={itemFormData.description}
                onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-item-icon">Icon</Label>
              <div className="space-y-2">
                <Input
                  id="edit-item-icon"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                {previewUrl && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={previewUrl} 
                      alt="Icon preview"
                      className="w-8 h-8 rounded object-cover"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {showSkillFields && (
              <>
                <div>
                  <Label htmlFor="edit-item-skill-type">Skill Type</Label>
                  <Select
                    value={itemFormData.skillType}
                    onValueChange={(value) => setItemFormData({ ...itemFormData, skillType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hard_skill">Hard Skill</SelectItem>
                      <SelectItem value="test_score">Test Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-item-max-score">Max Score</Label>
                  <Input
                    id="edit-item-max-score"
                    type="number"
                    min="1"
                    max="1000"
                    value={itemFormData.maxScore}
                    onChange={(e) => setItemFormData({ ...itemFormData, maxScore: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="edit-item-group">Group</Label>
              <Select
                value={itemFormData.groupId}
                onValueChange={(value) => setItemFormData({ ...itemFormData, groupId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem}>Update {itemTitle.slice(0, -1)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Details Modal */}
      {showGroupDetailsModal && (
        <Dialog open={isGroupDetailsDialogOpen} onOpenChange={setIsGroupDetailsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedGroup?.name} - Group Details</DialogTitle>
              <DialogDescription>
                Manage group details, skills, position assignments, and activity logs
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Group Details
                </TabsTrigger>
                <TabsTrigger value="skills" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Skills List
                </TabsTrigger>
                <TabsTrigger value="positions" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Position Assign
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="group-details-name">Name</Label>
                    <Input
                      id="group-details-name"
                      value={groupFormData.name}
                      onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="group-details-description">Description</Label>
                    <Textarea
                      id="group-details-description"
                      value={groupFormData.description}
                      onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="group-details-active">Active Status</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable this group
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsGroupDetailsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateGroup}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">Skills in this group</h4>
                  {selectedGroup && items.filter(item => item.groupId === selectedGroup.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No skills in this group</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroup && items
                        .filter(item => item.groupId === selectedGroup.id)
                        .map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-muted-foreground">{item.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={item.isActive ? "default" : "secondary"}>
                                {item.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {showSkillFields && (
                                <Badge variant="outline">
                                  Max: {item.maxScore}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="positions" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">Position Assignments</h4>
                  <p className="text-sm text-muted-foreground">
                    This group is assigned to the following positions:
                  </p>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Position assignment functionality will be implemented here.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">Activity Logs</h4>
                  <p className="text-sm text-muted-foreground">
                    Recent activity for this group:
                  </p>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Activity logging functionality will be implemented here.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
