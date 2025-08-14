"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
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
  Filter
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
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [categories, setCategories] = useState<SystemPromptCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    categoryId: '',
    isActive: true
  });



  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchSystemPrompts();
      fetchCategories();
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

  const handleSave = async () => {
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
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingPrompt ? 'System prompt updated successfully' : 'System prompt created successfully');
        setIsModalOpen(false);
        resetForm();
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

  const handleDelete = async (id: string) => {
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

  const openEditModal = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      categoryId: prompt.categoryId,
      isActive: prompt.isActive
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingPrompt(null);
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      categoryId: '',
      isActive: true
    });
  };

  const filteredPrompts = systemPrompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || prompt.categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
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
          <h1 className="text-2xl font-bold text-foreground">System Prompts</h1>
          <p className="text-muted-foreground">Manage AI system prompts for generative features</p>
        </div>
        <Button 
          onClick={openCreateModal} 
          className="flex items-center gap-2"
          disabled={categories.length === 0}
          title={categories.length === 0 ? 'Create at least one category first' : ''}
        >
          <Plus className="h-4 w-4" />
          Create Prompt
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
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
        <div className="w-48">
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

      {/* Content */}
      <div className="flex-1 overflow-auto">
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
            <Button onClick={() => window.location.href = '/settings/system-prompt-categories'}>
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
              <Button onClick={openCreateModal}>
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
                        onClick={() => openEditModal(prompt)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(prompt.id)}
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
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter prompt name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-sm text-amber-600">
                    No categories available. Please create a category first in the System Prompt Categories section.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter prompt description"
              />
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <TiptapEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Enter the system prompt content..."
                className="min-h-[300px]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.categoryId || !formData.content}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingPrompt ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
