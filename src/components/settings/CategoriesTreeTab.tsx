"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  AlertCircle
} from 'lucide-react';
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

interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  children?: Category[];
  items?: CategoryItem[];
}

interface CategoryItem {
  id: string;
  name: string;
  sortOrder: number;
  categoryId?: string;
  groupId?: string; // Alternative field name used by some APIs
}

interface CategoriesTreeTabProps {
  title: string;
  categoryTitle: string;
  itemTitle: string;
  categoriesEndpoint: string;
  itemsEndpoint: string;
}

// Sortable Category Component
function SortableCategory({ 
  category, 
  categoryItems, 
  itemTitle, 
  isExpanded,
  onToggleExpanded,
  onEdit, 
  onDelete, 
  modalZIndex
}: {
  category: Category;
  categoryItems: CategoryItem[];
  itemTitle: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  modalZIndex: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasItems = categoryItems.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200",
        isDragging && "opacity-50"
      )}
    >
      <div 
        className="flex items-center gap-2 py-2 px-3 rounded-full hover:bg-muted/30 cursor-pointer group bg-white/50 border border-transparent hover:border-muted/30 transition-all duration-200"
        onClick={onToggleExpanded}
      >
        {/* Expand/Collapse Button */}
        {hasItems && (
          <div className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        )}
        
        {/* Category Icon and Name */}
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-medium">{category.name}</span>
          {hasItems && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              {categoryItems.length}
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
                className="h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ zIndex: modalZIndex + 10 }}>
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Edit className="h-3 w-3 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(category.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
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
  onEdit, 
  onDelete, 
  onRemoveFromCategory, 
  selectedCategoryId, 
  modalZIndex
}: {
  item: CategoryItem;
  itemTitle: string;
  onEdit: (item: CategoryItem) => void;
  onDelete: (id: string) => void;
  onRemoveFromCategory: (id: string) => void;
  selectedCategoryId: string;
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
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "opacity-50",
        "ml-6"
      )}
    >
      <div className="flex items-center gap-2 py-1.5 px-3 rounded-full hover:bg-muted/20 cursor-pointer group bg-white/50 border border-transparent hover:border-muted/30 transition-all duration-200">
        <FileText className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{item.name}</span>
        
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
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit className="h-3 w-3 mr-2" />
                Edit
              </DropdownMenuItem>
              {selectedCategoryId !== 'all' && (item.categoryId === selectedCategoryId || item.groupId === selectedCategoryId) && (
                <DropdownMenuItem onClick={() => onRemoveFromCategory(item.id)}>
                  <X className="h-3 w-3 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(item.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesTreeTab({
  title,
  categoryTitle,
  itemTitle,
  categoriesEndpoint,
  itemsEndpoint
}: CategoriesTreeTabProps) {
  // Z-index management for dropdowns and modals
  const { contentZIndex: dropdownZIndex } = useDynamicZIndex('categories-tree-dropdowns', 'dropdown');
  const { contentZIndex: modalZIndex } = useDynamicZIndex('categories-tree-modals', 'modal');
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isCreateItemDialogOpen, setIsCreateItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isCategoryDetailsDialogOpen, setIsCategoryDetailsDialogOpen] = useState(false);
  
  // Selected items
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedItem, setSelectedItem] = useState<CategoryItem | null>(null);
  
  // Item search states
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [itemSearchValue, setItemSearchValue] = useState('');
  const [newItemName, setNewItemName] = useState('');
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Form states
  const [categoryFormData, setCategoryFormData] = useState({
    name: ''
  });

  const [itemFormData, setItemFormData] = useState({
    name: '',
    categoryId: 'none',
    groupId: 'none'
  });

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  // Auto-expand all categories when they're loaded
  useEffect(() => {
    if (categories.length > 0) {
      const allCategoryIds = new Set(categories.map(c => c.id));
      setExpandedCategories(allCategoryIds);
    }
  }, [categories]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(categoriesEndpoint);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error(`Error fetching ${categoryTitle.toLowerCase()}:`, error);
      toast.error(`Failed to fetch ${categoryTitle.toLowerCase()}`);
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

  // Build tree structure - Groups are always first level folders, skills are items
  const buildCategoryTree = (categories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // First pass: create map and initialize children arrays
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [], items: [] });
    });

    // Second pass: build tree structure - only root categories (no nested categories)
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      
      // Only add root categories (no parentId) - groups are always first level
      if (!category.parentId) {
        rootCategories.push(categoryWithChildren);
      }
    });

    // Third pass: add items to categories
    items.forEach(item => {
      if ((item.categoryId && categoryMap.has(item.categoryId)) || 
          ((item as any).groupId && categoryMap.has((item as any).groupId))) {
        const categoryId = item.categoryId || (item as any).groupId;
        const category = categoryMap.get(categoryId)!;
        category.items!.push(item);
      }
    });

    return rootCategories.sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const categoryTree = buildCategoryTree(categories);

  // Category handlers
  const handleCreateCategory = async () => {
    try {
      const response = await fetch(categoriesEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData)
      });

      if (response.ok) {
        toast.success(`${categoryTitle} created successfully`);
        setIsCreateCategoryDialogOpen(false);
        setCategoryFormData({ name: '' });
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to create ${categoryTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error creating ${categoryTitle.toLowerCase()}:`, error);
      toast.error(`Failed to create ${categoryTitle.toLowerCase()}`);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory) return;

    try {
      const response = await fetch(`${categoriesEndpoint}/${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData)
      });

      if (response.ok) {
        toast.success(`${categoryTitle} updated successfully`);
        setIsEditCategoryDialogOpen(false);
        setIsCategoryDetailsDialogOpen(false);
        setSelectedCategory(null);
        setCategoryFormData({ name: '' });
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to update ${categoryTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error updating ${categoryTitle.toLowerCase()}:`, error);
      toast.error(`Failed to update ${categoryTitle.toLowerCase()}`);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm(`Are you sure you want to delete this ${categoryTitle.toLowerCase()}? This will also remove all associated ${itemTitle.toLowerCase()}.`)) {
      return;
    }

    try {
      const response = await fetch(`${categoriesEndpoint}/${categoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success(`${categoryTitle} deleted successfully`);
        fetchCategories();
        fetchItems();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to delete ${categoryTitle.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Error deleting ${categoryTitle.toLowerCase()}:`, error);
      toast.error(`Failed to delete ${categoryTitle.toLowerCase()}`);
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
          categoryId: itemFormData.categoryId === 'none' ? null : itemFormData.categoryId,
          groupId: itemFormData.groupId === 'none' ? null : itemFormData.groupId
        })
      });

      if (response.ok) {
        toast.success(`${itemTitle} created successfully`);
        setIsCreateItemDialogOpen(false);
        setItemFormData({ 
          name: '', 
          categoryId: 'none',
          groupId: 'none'
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
          categoryId: itemFormData.categoryId === 'none' ? null : itemFormData.categoryId,
          groupId: itemFormData.groupId === 'none' ? null : itemFormData.groupId
        })
      });

      if (response.ok) {
        toast.success(`${itemTitle} updated successfully`);
        setIsEditItemDialogOpen(false);
        setSelectedItem(null);
        setItemFormData({ 
          name: '', 
          categoryId: 'none',
          groupId: 'none'
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

  const handleRemoveItemFromCategory = async (itemId: string) => {
    try {
      const response = await fetch(`${itemsEndpoint}/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          categoryId: null,
          groupId: null 
        })
      });

      if (response.ok) {
        toast.success(`${itemTitle} removed from category successfully`);
        fetchItems();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to remove ${itemTitle.toLowerCase()} from category`);
      }
    } catch (error) {
      console.error(`Error removing ${itemTitle.toLowerCase()} from category:`, error);
      toast.error(`Failed to remove ${itemTitle.toLowerCase()} from category`);
    }
  };

  // File upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
  };

  // Dialog openers
  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name
    });
    setIsEditCategoryDialogOpen(true);
  };

  const openEditItemDialog = (item: CategoryItem) => {
    setSelectedItem(item);
    setItemFormData({
      name: item.name,
      categoryId: item.categoryId || '',
      groupId: item.groupId || ''
    });
    setIsEditItemDialogOpen(true);
  };

  const openCategoryDetailsDialog = (category: Category) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name
    });
    setIsCategoryDetailsDialogOpen(true);
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Render category tree - Groups as first level folders, skills as items
  const renderCategoryTree = (categories: Category[]): React.ReactNode => {
    return categories.map((category) => {
      const isExpanded = expandedCategories.has(category.id);
      // Try both categoryId and groupId to handle different API field names
      const categoryItems = items.filter(item => 
        item.categoryId === category.id || 
        (item as any).groupId === category.id
      );
      
      return (
        <div key={category.id} className="space-y-1">
          <SortableCategory
            category={category}
            categoryItems={categoryItems}
            itemTitle={itemTitle}
            isExpanded={isExpanded}
            onToggleExpanded={() => toggleCategoryExpansion(category.id)}
            onEdit={openEditCategoryDialog}
            onDelete={handleDeleteCategory}
            modalZIndex={modalZIndex}
          />
          
          {/* Render items (skills) within the group */}
          <Collapsible open={isExpanded} onOpenChange={() => toggleCategoryExpansion(category.id)}>
            <CollapsibleContent className="space-y-1">
              {/* Render items (skills) with tree lines */}
              {categoryItems.length > 0 && (
                <div className="relative ml-2">
                  {/* Vertical tree connector line - only if more than 1 item */}
                  {categoryItems.length > 1 && (
                    <div className="absolute left-4 top-0 w-px bg-muted-foreground/30 rounded-full" 
                         style={{ height: `${(categoryItems.length - 1) * 24 + 12}px` }}></div>
                  )}
                  
                  <div className="space-y-1">
                    {categoryItems.map((item, index) => (
                      <div key={item.id} className="relative">
                        {/* Horizontal connector line - only if not last item */}
                        {index < categoryItems.length - 1 && (
                          <div className="absolute left-4 top-3 w-4 h-px bg-muted-foreground/30 rounded-full"></div>
                        )}
                        
                        {/* Corner connector for last item - rounded */}
                        {index === categoryItems.length - 1 && (
                          <div className="absolute left-4 top-3 w-px h-3 bg-muted-foreground/30 rounded-full"></div>
                        )}
                        
                        <SortableItem
                          item={item}
                          itemTitle={itemTitle}
                          onEdit={openEditItemDialog}
                          onDelete={handleDeleteItem}
                          onRemoveFromCategory={handleRemoveItemFromCategory}
                          selectedCategoryId={category.id}
                          modalZIndex={modalZIndex}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      );
    });
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
          <p className="text-sm text-muted-foreground">
            Groups are displayed as first-level folders, {itemTitle.toLowerCase()} are items within them
          </p>
        </div>
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
      </div>

      {/* Tree Structure */}
      <div className="space-y-4">
        {categoryTree.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No {categoryTitle.toLowerCase()} found. Create your first category to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-muted-foreground">Tree View</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 border border-muted-foreground/30 rounded-sm"></div>
                  <span>Tree Lines</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (expandedCategories.size === categories.length) {
                      setExpandedCategories(new Set());
                    } else {
                      setExpandedCategories(new Set(categories.map(c => c.id)));
                    }
                  }}
                >
                  {expandedCategories.size === categories.length ? (
                    <>
                      <ChevronRight className="h-3 w-3 mr-1" />
                      Collapse All
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Expand All
                    </>
                  )}
                </Button>
                <Dialog open={isCreateItemDialogOpen} onOpenChange={setIsCreateItemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      Add {itemTitle.slice(0, -1)}
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={() => {}} // Implement drag and drop for tree structure
            >
              <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1 p-4 bg-muted/10 rounded-lg">
                  {renderCategoryTree(categoryTree)}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {categoryTitle}</DialogTitle>
            <DialogDescription>
              Update the {categoryTitle.toLowerCase()} details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory}>Update Category</Button>
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
              <Label htmlFor="create-item-category">Category</Label>
              <Select
                value={itemFormData.categoryId}
                onValueChange={(value) => setItemFormData({ ...itemFormData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
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
              <Label htmlFor="edit-item-category">Category</Label>
              <Select
                value={itemFormData.categoryId}
                onValueChange={(value) => setItemFormData({ ...itemFormData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
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
    </div>
  );
}
