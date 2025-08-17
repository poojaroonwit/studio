"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/ui/color-picker';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Loader2,
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface HeadcountTypeOption {
  value: string;
  label: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export function HeadcountTypesTab() {
  const [options, setOptions] = useState<HeadcountTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<HeadcountTypeOption | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchHeadcountTypes();
  }, []);

  const fetchHeadcountTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/settings/headcount-types');
      if (!response.ok) {
        throw new Error('Failed to fetch headcount types');
      }
      const data = await response.json();
      setOptions(data);
    } catch (error) {
      console.error('Error fetching headcount types:', error);
      setError('Failed to load headcount types');
      toast.error('Failed to load headcount types');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings/headcount-types', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ options }),
      });

      if (!response.ok) {
        throw new Error('Failed to save headcount types');
      }

      toast.success('Headcount types saved successfully');
    } catch (error) {
      console.error('Error saving headcount types:', error);
      toast.error('Failed to save headcount types');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = () => {
    const newOption: HeadcountTypeOption = {
      value: '',
      label: '',
      color: '#3B82F6',
      sortOrder: options.length + 1,
      isActive: true,
    };
    setEditingOption(newOption);
    setIsModalOpen(true);
  };

  const handleEditOption = (option: HeadcountTypeOption) => {
    setEditingOption(option);
    setIsModalOpen(true);
  };

  const handleDeleteOption = (value: string) => {
    if (!confirm('Are you sure you want to delete this headcount type?')) {
      return;
    }

    const updatedOptions = options.filter(opt => opt.value !== value);
    setOptions(updatedOptions);
    toast.success('Headcount type deleted');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(options);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sort order
    const updatedItems = items.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
    }));

    setOptions(updatedItems);
  };

  const handleToggleActive = (value: string) => {
    const updatedOptions = options.map(opt =>
      opt.value === value ? { ...opt, isActive: !opt.isActive } : opt
    );
    setOptions(updatedOptions);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchHeadcountTypes} className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Headcount Types</h3>
          <p className="text-sm text-muted-foreground">
            Configure the types of headcount positions available in the system
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddOption}>
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Headcount Types List */}
      <Card>
        <CardHeader>
          <CardTitle>Headcount Type Options ({options.length})</CardTitle>
          <CardDescription>
            Drag and drop to reorder, or click to edit individual options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {options.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No headcount types configured yet</p>
              <p className="text-sm">Add your first headcount type to get started</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="headcount-types">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {options.map((option, index) => (
                      <Draggable
                        key={option.value}
                        draggableId={option.value}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: option.color }}
                              />
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  Value: {option.value}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`active-${option.value}`} className="text-sm">
                                  Active
                                </Label>
                                <Switch
                                  id={`active-${option.value}`}
                                  checked={option.isActive}
                                  onCheckedChange={() => handleToggleActive(option.value)}
                                />
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOption(option)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteOption(option.value)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {isModalOpen && editingOption && (
        <HeadcountTypeModal
          option={editingOption}
          existingValues={options.map(opt => opt.value)}
          onSave={(updatedOption) => {
            const isNew = !options.find(opt => opt.value === updatedOption.value);
            if (isNew) {
              setOptions([...options, updatedOption]);
            } else {
              setOptions(options.map(opt =>
                opt.value === editingOption.value ? updatedOption : opt
              ));
            }
            setIsModalOpen(false);
            setEditingOption(null);
          }}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingOption(null);
          }}
        />
      )}
    </div>
  );
}

interface HeadcountTypeModalProps {
  option: HeadcountTypeOption;
  existingValues: string[];
  onSave: (option: HeadcountTypeOption) => void;
  onCancel: () => void;
}

function HeadcountTypeModal({ option, existingValues, onSave, onCancel }: HeadcountTypeModalProps) {
  const [formData, setFormData] = useState(option);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.value.trim()) {
      newErrors.value = 'Value is required';
    } else if (existingValues.includes(formData.value) && formData.value !== option.value) {
      newErrors.value = 'Value must be unique';
    }
    
    if (!formData.label.trim()) {
      newErrors.label = 'Label is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  return (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {option.value ? 'Edit Headcount Type' : 'Add Headcount Type'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="value">Value *</Label>
            <Input
              id="value"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              placeholder="e.g., promote, new, replace"
              className={errors.value ? 'border-red-500' : ''}
            />
            {errors.value && <p className="text-sm text-red-500 mt-1">{errors.value}</p>}
          </div>
          
          <div>
            <Label htmlFor="label">Label *</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="e.g., Promote, New, Replace"
              className={errors.label ? 'border-red-500' : ''}
            />
            {errors.label && <p className="text-sm text-red-500 mt-1">{errors.label}</p>}
          </div>
          
          <div>
            <Label>Color</Label>
            <ColorPicker
              value={formData.color}
              onChange={(color) => setFormData(prev => ({ ...prev, color }))}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
