"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  ChevronDown, 
  ChevronRight,
  MoreVertical, 
  Folder,
  FolderOpen,
  FileText,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useDynamicZIndex } from '@/contexts/ZIndexContext';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TreeNodeData {
  id: string;
  name: string;
  type: 'folder' | 'file';
  categoryId?: string;
  groupId?: string;
  sortOrder?: number;
  // Skill-specific fields
  description?: string;
  maxScore?: number;
  skillType?: 'hard_skill' | 'test_score';
  iconUrl?: string;
  // Personality traits specific fields
  scoreLabels?: {
    '1': string;
    '2': string;
    '3': string;
    '4': string;
    '5': string;
  };
  children?: TreeNodeData[];
  isExpanded?: boolean;
  // Drag and drop properties
  parentId?: string;
}

interface TreeViewProps {
  title: string;
  categoryTitle: string;
  itemTitle: string;
  categoriesEndpoint: string;
  itemsEndpoint: string;
  isPersonalityTraits?: boolean;
}

// Sortable Tree Node Component
function SortableTreeNode({ 
  node, 
  level = 0, 
  onToggle, 
  onEdit, 
  onDelete, 
  onCreateChild,
  itemTitle,
  categoryTitle,
  modalZIndex,
  isPersonalityTraits = false
}: {
  node: TreeNodeData;
  level: number;
  onToggle: (nodeId: string) => void;
  onEdit: (node: TreeNodeData) => void;
  onDelete: (node: TreeNodeData) => void;
  onCreateChild: (node: TreeNodeData) => void;
  itemTitle: string;
  categoryTitle: string;
  modalZIndex: number;
  isPersonalityTraits?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: node.id,
    data: {
      type: node.type,
      node: node,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isFolder = node.type === 'folder';
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.isExpanded || false;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TreeNode
        node={node}
        level={level}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onCreateChild={onCreateChild}
        itemTitle={itemTitle}
        categoryTitle={categoryTitle}
        modalZIndex={modalZIndex}
        dragHandleProps={listeners}
        isDragging={isDragging}
        isPersonalityTraits={isPersonalityTraits}
      />
    </div>
  );
}

// Tree Node Component
function TreeNode({ 
  node, 
  level = 0, 
  onToggle, 
  onEdit, 
  onDelete, 
  onCreateChild,
  itemTitle,
  categoryTitle,
  modalZIndex,
  dragHandleProps,
  isDragging = false,
  isPersonalityTraits = false
}: {
  node: TreeNodeData;
  level: number;
  onToggle: (nodeId: string) => void;
  onEdit: (node: TreeNodeData) => void;
  onDelete: (node: TreeNodeData) => void;
  onCreateChild: (node: TreeNodeData) => void;
  itemTitle: string;
  categoryTitle: string;
  modalZIndex: number;
  dragHandleProps?: any;
  isDragging?: boolean;
  isPersonalityTraits?: boolean;
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRemoveFromGroupDialogOpen, setIsRemoveFromGroupDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{ 
    name: string;
    description: string;
    maxScore: number;
    skillType: 'hard_skill' | 'test_score';
    categoryId: string;
    iconUrl: string;
    scoreLabels: { '1': string; '2': string; '3': string; '4': string; '5': string };
  }>({ 
    name: '', 
    description: '', 
    maxScore: 100, 
    skillType: 'hard_skill',
    categoryId: 'none',
    iconUrl: '',
    scoreLabels: {
      '1': '',
      '2': '',
      '3': '',
      '4': '',
      '5': ''
    }
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const isFolder = node.type === 'folder';
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.isExpanded || false;

  const handleEdit = () => {
    setFormData({ 
      name: node.name, 
      description: node.description || '',
      maxScore: node.maxScore || 100,
      skillType: node.skillType || 'hard_skill',
      categoryId: node.categoryId || 'none',
      iconUrl: node.iconUrl || '',
      scoreLabels: node.scoreLabels || {
        '1': '',
        '2': '',
        '3': '',
        '4': '',
        '5': ''
      }
    });
    setIconFile(null);
    setIconPreview(node.iconUrl || null);
    setIsEditDialogOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleCreateChild = () => {
    setFormData({ 
      name: '', 
      description: '',
      maxScore: 100,
      skillType: 'hard_skill',
      categoryId: node.id,
      iconUrl: '',
      scoreLabels: {
        '1': '',
        '2': '',
        '3': '',
        '4': '',
        '5': ''
      }
    });
    setIconFile(null);
    setIconPreview(null);
    setIsCreateDialogOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      
      setIconFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setIconPreview(previewUrl);
    }
  };

  const removeIcon = () => {
    if (iconPreview) {
      URL.revokeObjectURL(iconPreview);
    }
    setIconFile(null);
    setIconPreview(null);
    setFormData({ ...formData, iconUrl: '' });
  };

  const handleRemoveFromGroup = () => {
    setIsRemoveFromGroupDialogOpen(true);
  };

  const handlePermanentDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <div className="relative">

        <div 
          className={cn(
            "flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-muted/20 cursor-pointer group border border-transparent hover:border-muted/30 transition-all duration-200",
            isFolder ? "bg-white/50" : "bg-gray-100"
          )}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => {
            if (!isFolder) {
              handleEdit();
            }
          }}
        >
          {/* Expand/Collapse Button */}
          {isFolder && hasChildren && (
            <div className="w-4 h-4 flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-muted/50"
                onClick={() => onToggle(node.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
            </div>
          )}

          {/* Drag Handle for Skills and Folders */}
          {dragHandleProps && (
            <div 
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/30 rounded"
            >
              <div className="w-1 h-4 bg-muted-foreground/30 rounded-full"></div>
            </div>
          )}

          {/* Icon and Name */}
          <div className="flex items-center gap-2">
            {isFolder ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4 text-primary" />
              )
            ) : (
              <FileText className="h-3 w-3 text-muted-foreground" />
            )}
            <div className="flex flex-col">
              <span className={cn(
                "text-sm",
                isFolder ? "font-medium" : "text-muted-foreground"
              )}>
                {node.name}
              </span>
              {!isFolder && node.description && (
                <span className="text-xs text-muted-foreground/70 truncate max-w-[200px]">
                  {node.description}
                </span>
              )}
            </div>
            {isFolder && hasChildren && (
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {(node.children?.length) || 0}
              </span>
            )}
          </div>

          {/* Actions Menu */}
          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ zIndex: modalZIndex + 10 }}>
                {isFolder && (
                  <DropdownMenuItem onClick={handleCreateChild}>
                    <Plus className="h-3 w-3 mr-2" />
                    Add Item
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-3 w-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!isFolder && (
                  <DropdownMenuItem onClick={handleRemoveFromGroup}>
                    <X className="h-3 w-3 mr-2" />
                    Remove from Group
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={handlePermanentDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Render children if expanded */}
        {isFolder && isExpanded && hasChildren && (
          <SortableContext items={(node.children?.map(child => child.id)) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {(node.children || []).map((child) => (
                <SortableTreeNode
                  key={child.id}
                  node={child}
                  level={level + 1}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCreateChild={onCreateChild}
                  itemTitle={itemTitle}
                  categoryTitle={categoryTitle}
                  modalZIndex={modalZIndex}
                  isPersonalityTraits={isPersonalityTraits}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>

      {/* Create Child Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create {itemTitle}</DialogTitle>
            <DialogDescription>
              Create a new {itemTitle.toLowerCase()} in this category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            {!isPersonalityTraits && (
              <>
                <div>
                  <Label htmlFor="create-skill-type">Skill Type</Label>
                  <Select
                    value={formData.skillType}
                    onValueChange={(value) => setFormData({ ...formData, skillType: value as 'hard_skill' | 'test_score' })}
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
                  <Label htmlFor="create-max-score">Max Score</Label>
                  <Input
                    id="create-max-score"
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </>
            )}
            {isPersonalityTraits && (
              <div>
                <Label>Score Labels (1-5)</Label>
                <div className="space-y-3">
                  {(['1', '2', '3', '4', '5'] as const).map((score) => (
                    <div key={score} className="flex items-center gap-3">
                      <Label htmlFor={`create-score-${score}`} className="w-8 text-sm">
                        {score}:
                      </Label>
                      <Input
                        id={`create-score-${score}`}
                        value={formData.scoreLabels[score]}
                        onChange={(e) => setFormData({
                          ...formData,
                          scoreLabels: {
                            ...formData.scoreLabels,
                            [score]: e.target.value
                          }
                        })}
                        placeholder={`Label for score ${score}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="create-icon">Icon</Label>
              <div className="space-y-3">
                {/* File Upload */}
                <div className="flex items-center gap-3">
                  <Input
                    id="create-icon"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('create-icon')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Icon
                  </Button>
                </div>
                
                {/* Icon Preview */}
                {iconPreview && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                    <img 
                      src={iconPreview} 
                      alt="Icon preview" 
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Icon Preview</p>
                      <p className="text-xs text-muted-foreground">
                        {iconFile ? iconFile.name : 'Current icon'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeIcon}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Fallback URL Input */}
                <div>
                  <Label htmlFor="create-icon-url">Or enter icon URL</Label>
                  <Input
                    id="create-icon-url"
                    value={formData.iconUrl}
                    onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                    placeholder="Optional icon URL"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle create logic here
              setIsCreateDialogOpen(false);
            }}>
              Create {itemTitle.slice(0, -1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {isFolder ? categoryTitle : itemTitle}</DialogTitle>
            <DialogDescription>
              Update the {isFolder ? categoryTitle.toLowerCase() : itemTitle.toLowerCase()} details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {!isFolder && (
              <>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
                {!isPersonalityTraits && (
                  <>
                    <div>
                      <Label htmlFor="edit-skill-type">Skill Type</Label>
                      <Select
                        value={formData.skillType}
                        onValueChange={(value) => setFormData({ ...formData, skillType: value as 'hard_skill' | 'test_score' })}
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
                      <Label htmlFor="edit-max-score">Max Score</Label>
                      <Input
                        id="edit-max-score"
                        type="number"
                        min="1"
                        max="1000"
                        value={formData.maxScore}
                        onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 100 })}
                      />
                    </div>
                  </>
                )}
                {isPersonalityTraits && (
                  <div>
                    <Label>Score Labels (1-5)</Label>
                    <div className="space-y-3">
                      {(['1', '2', '3', '4', '5'] as const).map((score) => (
                        <div key={score} className="flex items-center gap-3">
                          <Label htmlFor={`edit-score-${score}`} className="w-8 text-sm">
                            {score}:
                          </Label>
                          <Input
                            id={`edit-score-${score}`}
                            value={formData.scoreLabels[score]}
                            onChange={(e) => setFormData({
                              ...formData,
                              scoreLabels: {
                                ...formData.scoreLabels,
                                [score]: e.target.value
                              }
                            })}
                            placeholder={`Label for score ${score}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="edit-icon">Icon</Label>
                  <div className="space-y-3">
                    {/* File Upload */}
                    <div className="flex items-center gap-3">
                      <Input
                        id="edit-icon"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('edit-icon')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Icon
                      </Button>
                    </div>
                    
                    {/* Icon Preview */}
                    {iconPreview && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                        <img 
                          src={iconPreview} 
                          alt="Icon preview" 
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Icon Preview</p>
                          <p className="text-xs text-muted-foreground">
                            {iconFile ? iconFile.name : 'Current icon'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeIcon}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Fallback URL Input */}
                    <div>
                      <Label htmlFor="edit-icon-url">Or enter icon URL</Label>
                      <Input
                        id="edit-icon-url"
                        value={formData.iconUrl}
                        onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                        placeholder="Optional icon URL"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle edit logic here
              setIsEditDialogOpen(false);
            }}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Group Dialog */}
      <Dialog open={isRemoveFromGroupDialogOpen} onOpenChange={setIsRemoveFromGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Group</DialogTitle>
            <DialogDescription>
              Remove "{node.name}" from this group? The skill will be moved to the root level and can be reassigned later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveFromGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Handle remove from group logic here
                toast.success(`${itemTitle} removed from group`);
                setIsRemoveFromGroupDialogOpen(false);
              }}
            >
              Remove from Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Permanently</DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <p>Are you sure you want to permanently delete "{node.name}"?</p>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    <span className="font-medium">Warning: Data Loss</span>
                  </div>
                  <p className="text-sm text-destructive/80 mt-1">
                    This will permanently delete the skill and all associated data. This action cannot be undone.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                // Handle permanent delete logic here
                toast.success(`${itemTitle} deleted permanently`);
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TreeView({
  title,
  categoryTitle,
  itemTitle,
  categoriesEndpoint,
  itemsEndpoint,
  isPersonalityTraits = false
}: TreeViewProps) {
  const [data, setData] = useState<TreeNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
  const [isCreateItemDialogOpen, setIsCreateItemDialogOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: '' });
  const [itemFormData, setItemFormData] = useState<{ 
    name: string; 
    description: string; 
    maxScore: number; 
    skillType: 'hard_skill' | 'test_score';
    categoryId: string;
    iconUrl: string;
    scoreLabels: { '1': string; '2': string; '3': string; '4': string; '5': string };
  }>({ 
    name: '', 
    description: '', 
    maxScore: 100, 
    skillType: 'hard_skill',
    categoryId: 'none',
    iconUrl: '',
    scoreLabels: {
      '1': '',
      '2': '',
      '3': '',
      '4': '',
      '5': ''
    }
  });
  const [mainIconFile, setMainIconFile] = useState<File | null>(null);
  const [mainIconPreview, setMainIconPreview] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { contentZIndex: modalZIndex } = useDynamicZIndex('tree-view-modals', 'modal');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories and items
      const [categoriesResponse, itemsResponse] = await Promise.all([
        fetch(categoriesEndpoint),
        fetch(itemsEndpoint)
      ]);

      const [categories, items] = await Promise.all([
        categoriesResponse.json(),
        itemsResponse.json()
      ]);

      // Transform data to tree structure
      const treeData: TreeNodeData[] = categories.map((category: any) => ({
        id: category.id,
        name: category.name,
        type: 'folder',
        sortOrder: category.sortOrder,
        isExpanded: false,
        children: items
          .filter((item: any) => item.categoryId === category.id || item.groupId === category.id)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            type: 'file',
            categoryId: item.categoryId,
            groupId: item.groupId,
            sortOrder: item.sortOrder,
            description: item.description,
            maxScore: item.maxScore,
            skillType: item.skillType,
            iconUrl: item.iconUrl
          }))
      }));

      setData(treeData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (nodeId: string) => {
    setData(prevData => 
      prevData.map(category => 
        category.id === nodeId 
          ? { ...category, isExpanded: !category.isExpanded }
          : category
      )
    );
  };

  const handleCreateCategory = async () => {
    try {
      const response = await fetch(categoriesEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryFormData.name })
      });

      if (response.ok) {
        toast.success(`${categoryTitle} created successfully`);
        setCategoryFormData({ name: '' });
        setIsCreateCategoryDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to create ${categoryTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error creating ${categoryTitle.toLowerCase()}:`, error);
      toast.error(`Failed to create ${categoryTitle.toLowerCase()}`);
    }
  };

  const handleCreateItem = async () => {
    try {
      const response = await fetch(itemsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemFormData.name,
          description: itemFormData.description,
          maxScore: itemFormData.maxScore,
          skillType: itemFormData.skillType,
          categoryId: itemFormData.categoryId,
          groupId: itemFormData.categoryId,
          iconUrl: itemFormData.iconUrl
        })
      });

      if (response.ok) {
        toast.success(`${itemTitle} created successfully`);
        setItemFormData({ 
          name: '', 
          description: '', 
          maxScore: 100, 
          skillType: 'hard_skill',
          categoryId: 'none',
          iconUrl: '',
          scoreLabels: {
            '1': '',
            '2': '',
            '3': '',
            '4': '',
            '5': ''
          }
        });
        setMainIconFile(null);
        setMainIconPreview(null);
        setIsCreateItemDialogOpen(false);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to create ${itemTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error creating ${itemTitle.toLowerCase()}:`, error);
      toast.error(`Failed to create ${itemTitle.toLowerCase()}`);
    }
  };

  const handleMainFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      
      setMainIconFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setMainIconPreview(previewUrl);
    }
  };

  const removeMainIcon = () => {
    if (mainIconPreview) {
      URL.revokeObjectURL(mainIconPreview);
    }
    setMainIconFile(null);
    setMainIconPreview(null);
    setItemFormData({ ...itemFormData, iconUrl: '' });
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) {
      setActiveId(null);
      return;
    }

    // Find the active item and its current parent
    let activeItem: TreeNodeData | null = null;
    let activeParent: TreeNodeData | null = null;
    
    const findItem = (items: TreeNodeData[], parent?: TreeNodeData): boolean => {
      for (const item of items) {
        if (item.id === activeId) {
          activeItem = item;
          activeParent = parent || null;
          return true;
        }
        if (item.children && findItem(item.children, item)) {
          return true;
        }
      }
      return false;
    };

    findItem(data);

    if (!activeItem) {
      setActiveId(null);
      return;
    }

    // Find the target (over) item
    let targetItem: TreeNodeData | null = null;
    let targetParent: TreeNodeData | null = null;
    
    const findTarget = (items: TreeNodeData[], parent?: TreeNodeData): boolean => {
      for (const item of items) {
        if (item.id === overId) {
          targetItem = item;
          targetParent = parent || null;
          return true;
        }
        if (item.children && findTarget(item.children, item)) {
          return true;
        }
      }
      return false;
    };

    findTarget(data);

    if (!targetItem) {
      setActiveId(null);
      return;
    }

    // Handle different drag scenarios
    if ((activeItem as TreeNodeData).type === 'file' && (targetItem as TreeNodeData).type === 'folder') {
      // Moving skill to a folder
      moveItemToFolder(activeItem as TreeNodeData, targetItem as TreeNodeData, activeParent);
    } else if ((activeItem as TreeNodeData).type === 'file' && (targetItem as TreeNodeData).type === 'file' && targetParent) {
      // Reordering skills within the same folder
      reorderItemsInFolder(activeItem as TreeNodeData, targetItem as TreeNodeData, targetParent);
    } else if ((activeItem as TreeNodeData).type === 'folder' && (targetItem as TreeNodeData).type === 'folder') {
      // Reordering folders at root level
      reorderFolders(activeItem as TreeNodeData, targetItem as TreeNodeData);
    } else if ((activeItem as TreeNodeData).type === 'folder' && (targetItem as TreeNodeData).type === 'file' && targetParent) {
      // Moving folder to position after a skill (not supported - folders stay at root)
      toast.error('Folders can only be reordered at the root level');
    }

    setActiveId(null);
  };

  const moveItemToFolder = (item: TreeNodeData, targetFolder: TreeNodeData, currentParent: TreeNodeData | null) => {
    // Remove from current parent
    if (currentParent) {
      currentParent.children = currentParent.children?.filter(child => child.id !== item.id);
    } else {
      // Remove from root level
      setData(prevData => prevData.filter(category => category.id !== item.id));
    }

    // Add to target folder
    if (targetFolder.children) {
      targetFolder.children.push({
        ...item,
        categoryId: targetFolder.id,
        groupId: targetFolder.id,
        parentId: targetFolder.id
      });
    } else {
      targetFolder.children = [{
        ...item,
        categoryId: targetFolder.id,
        groupId: targetFolder.id,
        parentId: targetFolder.id
      }];
    }

    // Update the data
    setData([...data]);
    toast.success(`${itemTitle} moved to ${targetFolder.name}`);
  };

  const reorderItemsInFolder = (activeItem: TreeNodeData, targetItem: TreeNodeData, parent: TreeNodeData) => {
    if (!parent.children) return;

    const oldIndex = parent.children.findIndex(item => item.id === activeItem.id);
    const newIndex = parent.children.findIndex(item => item.id === targetItem.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Remove the item from its current position
      const [reorderedItem] = parent.children.splice(oldIndex, 1);
      // Insert it at the new position
      parent.children.splice(newIndex, 0, reorderedItem);

      // Update sort orders
      parent.children.forEach((item, index) => {
        item.sortOrder = index;
      });

      setData([...data]);
      toast.success(`${itemTitle} reordered`);
    }
  };

  const reorderFolders = (activeFolder: TreeNodeData, targetFolder: TreeNodeData) => {
    const oldIndex = data.findIndex(folder => folder.id === activeFolder.id);
    const newIndex = data.findIndex(folder => folder.id === targetFolder.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Remove the folder from its current position
      const [reorderedFolder] = data.splice(oldIndex, 1);
      // Insert it at the new position
      data.splice(newIndex, 0, reorderedFolder);

      // Update sort orders
      data.forEach((folder, index) => {
        folder.sortOrder = index;
      });

      setData([...data]);
      toast.success(`${categoryTitle} reordered`);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Categories tree structure
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateCategoryDialogOpen} onOpenChange={setIsCreateCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create {categoryTitle}</DialogTitle>
                <DialogDescription>
                  Create a new category to organize related {itemTitle.toLowerCase()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    placeholder={`e.g., ${categoryTitle}`}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateCategoryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCategory}>Create Category</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateItemDialogOpen} onOpenChange={setIsCreateItemDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create {itemTitle.slice(0, -1)}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create {itemTitle}</DialogTitle>
                <DialogDescription>
                  Create a new {itemTitle.toLowerCase()} with all details
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
                    placeholder="Optional description"
                  />
                </div>
                {!isPersonalityTraits && (
                  <>
                    <div>
                      <Label htmlFor="create-item-skill-type">Skill Type</Label>
                      <Select
                        value={itemFormData.skillType}
                        onValueChange={(value) => setItemFormData({ ...itemFormData, skillType: value as 'hard_skill' | 'test_score' })}
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
                {isPersonalityTraits && (
                  <div>
                    <Label>Score Labels (1-5)</Label>
                    <div className="space-y-3">
                      {(['1', '2', '3', '4', '5'] as const).map((score) => (
                        <div key={score} className="flex items-center gap-3">
                          <Label htmlFor={`create-item-score-${score}`} className="w-8 text-sm">
                            {score}:
                          </Label>
                          <Input
                            id={`create-item-score-${score}`}
                            value={itemFormData.scoreLabels[score]}
                            onChange={(e) => setItemFormData({
                              ...itemFormData,
                              scoreLabels: {
                                ...itemFormData.scoreLabels,
                                [score]: e.target.value
                              }
                            })}
                            placeholder={`Label for score ${score}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="create-item-icon">Icon</Label>
                  <div className="space-y-3">
                    {/* File Upload */}
                    <div className="flex items-center gap-3">
                      <Input
                        id="create-item-icon"
                        type="file"
                        accept="image/*"
                        onChange={handleMainFileUpload}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('create-item-icon')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Icon
                      </Button>
                    </div>
                    
                    {/* Icon Preview */}
                    {mainIconPreview && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                        <img 
                          src={mainIconPreview} 
                          alt="Icon preview" 
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Icon Preview</p>
                          <p className="text-xs text-muted-foreground">
                            {mainIconFile ? mainIconFile.name : 'Current icon'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeMainIcon}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Fallback URL Input */}
                    <div>
                      <Label htmlFor="create-item-icon-url">Or enter icon URL</Label>
                      <Input
                        id="create-item-icon-url"
                        value={itemFormData.iconUrl}
                        onChange={(e) => setItemFormData({ ...itemFormData, iconUrl: e.target.value })}
                        placeholder="Optional icon URL"
                      />
                    </div>
                  </div>
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
        </div>
      </div>

      {/* Tree View */}
      <div className="space-y-4">
        {!data || data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No {categoryTitle.toLowerCase()} found. Create your first category to get started.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="p-4 bg-muted/10 rounded-lg">
              <SortableContext items={data.map(category => category.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {data.map((category) => (
                    <SortableTreeNode
                      key={category.id}
                      node={category}
                      level={0}
                      onToggle={handleToggle}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onCreateChild={() => {}}
                      itemTitle={itemTitle}
                      categoryTitle={categoryTitle}
                      modalZIndex={modalZIndex}
                      isPersonalityTraits={isPersonalityTraits}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
            <DragOverlay>
              {activeId ? (
                <div className="p-3 bg-white border border-muted rounded-lg shadow-lg">
                  <span className="text-sm font-medium">
                    {data.find(item => item.id === activeId)?.name || 
                     data.find(item => item.children?.some(child => child.id === activeId))?.children?.find(child => child.id === activeId)?.name}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}