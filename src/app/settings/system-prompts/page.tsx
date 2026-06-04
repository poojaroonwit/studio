"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  BrainCircuit, 
  FileText,
  Search,
  Filter,
  Tag
} from 'lucide-react';

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SystemPromptCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SystemPromptsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [categories, setCategories] = useState<SystemPromptCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prompts');
  
  // Prompts state
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [promptFormData, setPromptFormData] = useState({
    name: '',
    description: '',
    content: '',
    categoryId: '',
    isActive: true
  });

  // Categories state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SystemPromptCategory | null>(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isActive: true
  });

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchSystemPrompts();
      fetchCategories();
    }
  }, [sessionStatus]);

  // Fetch showLogoOnly setting
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const fetchShowLogoOnly = async () => {
        try {
          const response = await fetch('/api/settings/system-settings');
          if (response.ok) {
            const data = await response.json();
            setShowLogoOnly(data.showLogoOnly === 'true' || data.showLogoOnly === true);
          }
        } catch (error) {
          console.error('Error fetching showLogoOnly setting:', error);
        }
      };
      fetchShowLogoOnly();
    }
  }, [sessionStatus]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/settings/system-prompt-categories', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        const error = await response.json();
        console.error('Failed to fetch categories:', error.message);
        if (error.message?.includes('No categories')) {
          toast.error('No system prompt categories exist. Please create at least one category first.');
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSystemPrompts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/system-prompts', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemPrompts(data);
      } else {
        toast.error('Failed to fetch system prompts');
      }
    } catch (error) {
      console.error('Error fetching system prompts:', error);
      toast.error('Failed to fetch system prompts');
    } finally {
      setIsLoading(false);
    }
  };

  // Prompt handlers
  const handleSavePrompt = async () => {
    try {
      const url = editingPrompt 
        ? `/api/settings/system-prompts/${editingPrompt.id}`
        : '/api/settings/system-prompts';
      
      const method = editingPrompt ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(promptFormData),
      });

      if (response.ok) {
        toast.success(editingPrompt ? 'System prompt updated successfully' : 'System prompt created successfully');
        setIsPromptModalOpen(false);
        resetPromptForm();
        fetchSystemPrompts();
      } else {
        const error = await response.json();
        if (error.message?.includes('No categories')) {
          toast.error('Please create at least one system prompt category first before creating prompts.');
        } else if (error.message?.includes('Invalid category')) {
          toast.error('Please select a valid category.');
        } else {
          toast.error(error.message || 'Failed to save system prompt');
        }
      }
    } catch (error) {
      console.error('Error saving system prompt:', error);
      toast.error('Failed to save system prompt');
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this system prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/system-prompts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('System prompt deleted successfully');
        fetchSystemPrompts();
      } else {
        toast.error('Failed to delete system prompt');
      }
    } catch (error) {
      console.error('Error deleting system prompt:', error);
      toast.error('Failed to delete system prompt');
    }
  };

  const openEditPromptModal = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt);
    setPromptFormData({
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      categoryId: prompt.categoryId,
      isActive: prompt.isActive
    });
    setIsPromptModalOpen(true);
  };

  const openCreatePromptModal = () => {
    setEditingPrompt(null);
    resetPromptForm();
    setIsPromptModalOpen(true);
  };

  const resetPromptForm = () => {
    setPromptFormData({
      name: '',
      description: '',
      content: '',
      categoryId: '',
      isActive: true
    });
  };

  // Category handlers
  const handleSaveCategory = async () => {
    try {
      const url = editingCategory 
        ? `/api/settings/system-prompt-categories/${editingCategory.id}`
        : '/api/settings/system-prompt-categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(categoryFormData),
      });

      if (response.ok) {
        toast.success(editingCategory ? 'Category updated successfully' : 'Category created successfully');
        setIsCategoryModalOpen(false);
        resetCategoryForm();
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/system-prompt-categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Category deleted successfully');
        fetchCategories();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const openEditCategoryModal = (category: SystemPromptCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3B82F6',
      isActive: category.isActive
    });
    setIsCategoryModalOpen(true);
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    resetCategoryForm();
    setIsCategoryModalOpen(true);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      isActive: true
    });
  };

  const filteredPrompts = systemPrompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || prompt.categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredCategories = categories.filter(category => {
    return category.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
           (category.description && category.description.toLowerCase().includes(categorySearchTerm.toLowerCase()));
  });

  if (sessionStatus === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {!showLogoOnly && (
            <h1 className="text-2xl font-bold text-foreground">System Prompts & Categories</h1>
          )}
          <p className="text-muted-foreground">Manage AI system prompts and their categories</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Custom Tab Navigation */}
          <div className="flex w-full border-b border-border/50 mb-6">
            <div
              onClick={() => setActiveTab('prompts')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'prompts'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
             role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
              <FileText className="h-4 w-4" />
              System Prompts
            </div>
            <div
              onClick={() => setActiveTab('categories')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'categories'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
             role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
              <Tag className="h-4 w-4" />
              Categories
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {/* Prompts Tab Content */}
            {activeTab === 'prompts' && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-4 flex-1">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search prompts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="w-48 mr-4">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.name}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button 
                    onClick={openCreatePromptModal} 
                    className="flex items-center gap-2"
                    disabled={categories.length === 0}
                    title={categories.length === 0 ? 'Create at least one category first' : ''}
                  >
                    <Plus className="h-4 w-4" />
                    Create Prompt
                  </Button>
                </div>

                <ScrollArea className="flex-1 pr-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-12">
                      <BrainCircuit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No system prompt categories found</h3>
                      <p className="text-muted-foreground mb-4">
                        You need to create at least one category before you can create system prompts.
                      </p>
                      <Button onClick={() => setActiveTab('categories')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Categories
                      </Button>
                    </div>
                  ) : filteredPrompts.length === 0 ? (
                    <div className="text-center py-12">
                      <BrainCircuit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No system prompts found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm || selectedCategory !== 'all' 
                          ? 'Try adjusting your search or filter criteria.'
                          : 'Create your first system prompt to get started.'
                        }
                      </p>
                      {!searchTerm && selectedCategory === 'all' && (
                        <Button onClick={openCreatePromptModal}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Prompt
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredPrompts.map((prompt) => (
                        <Card key={prompt.id} className="group hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-primary" />
                                  {prompt.name}
                                </CardTitle>
                                <CardDescription className="mt-2">
                                  {prompt.description}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditPromptModal(prompt)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePrompt(prompt.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant={prompt.isActive ? "default" : "secondary"}>
                                  {prompt.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant="outline">{prompt.categoryName}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <p>Updated: {new Date(prompt.updatedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Categories Tab Content */}
            {activeTab === 'categories' && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search categories..."
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button onClick={openCreateCategoryModal} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Category
                  </Button>
                </div>

                <ScrollArea className="flex-1 pr-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="text-center py-12">
                      <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No categories found</h3>
                      <p className="text-muted-foreground mb-4">
                        {categorySearchTerm 
                          ? 'Try adjusting your search criteria.'
                          : 'Create your first category to get started.'
                        }
                      </p>
                      {!categorySearchTerm && (
                        <Button onClick={openCreateCategoryModal}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Category
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredCategories.map((category) => (
                        <Card key={category.id} className="group hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full" 
                                    style={{ backgroundColor: category.color }}
                                  />
                                  {category.name}
                                </CardTitle>
                                <CardDescription className="mt-2">
                                  {category.description || 'No description'}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCategoryModal(category)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant={category.isActive ? "default" : "secondary"}>
                                  {category.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <p>Updated: {new Date(category.updatedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Prompt Modal */}
      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5" />
              {editingPrompt ? 'Edit System Prompt' : 'Create System Prompt'}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt 
                ? 'Update the system prompt configuration and content.'
                : 'Create a new system prompt for AI generation features.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={promptFormData.name}
                  onChange={(e) => setPromptFormData({ ...promptFormData, name: e.target.value })}
                  placeholder="Enter prompt name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={promptFormData.categoryId}
                  onChange={(e) => setPromptFormData({ ...promptFormData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-sm text-amber-600">
                    No categories available. Please create a category first in the Categories tab.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={promptFormData.description}
                onChange={(e) => setPromptFormData({ ...promptFormData, description: e.target.value })}
                placeholder="Enter prompt description"
              />
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <TiptapEditor
                value={promptFormData.content}
                onChange={(value) => setPromptFormData({ ...promptFormData, content: value })}
                placeholder="Enter the system prompt content..."
                className="min-h-[300px]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={promptFormData.isActive}
                onChange={(e) => setPromptFormData({ ...promptFormData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromptModalOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSavePrompt}
              disabled={!promptFormData.name || !promptFormData.categoryId || !promptFormData.content}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingPrompt ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? 'Update the category configuration.'
                : 'Create a new category for organizing system prompts.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Name *</Label>
              <Input
                id="categoryName"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="Enter category name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Description</Label>
              <Input
                id="categoryDescription"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="Enter category description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <ColorPicker
                value={categoryFormData.color || '#3B82F6'}
                onChange={(color) => setCategoryFormData({ ...categoryFormData, color })}
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="categoryIsActive"
                checked={categoryFormData.isActive}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="categoryIsActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCategory}
              disabled={!categoryFormData.name}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
