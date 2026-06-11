"use client";

import { FileText, Loader2, Tag } from 'lucide-react';

import { cn } from '@/lib/utils';

import { SystemPromptCategoriesTab } from './SystemPromptCategoriesTab';
import { SystemPromptCategoryModal } from './SystemPromptCategoryModal';
import { SystemPromptModal } from './SystemPromptModal';
import { SystemPromptsListTab } from './SystemPromptsListTab';
import type { useSystemPromptsPage } from './use-system-prompts-page';

type SystemPromptsPageViewProps = ReturnType<typeof useSystemPromptsPage>;

export function SystemPromptsPageView(page: SystemPromptsPageViewProps) {
  if (page.sessionStatus === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (page.sessionStatus === 'unauthenticated') {
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
      <div className="flex justify-between items-center mb-6">
        <div>
          {!page.showLogoOnly && (
            <h1 className="text-2xl font-bold text-foreground">System Prompts & Categories</h1>
          )}
          <p className="text-muted-foreground">Manage AI system prompts and their categories</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex w-full border-b border-border/50 mb-6">
            <SystemPromptsTabButton
              active={page.activeTab === 'prompts'}
              icon={<FileText className="h-4 w-4" />}
              label="System Prompts"
              onClick={() => page.setActiveTab('prompts')}
            />
            <SystemPromptsTabButton
              active={page.activeTab === 'categories'}
              icon={<Tag className="h-4 w-4" />}
              label="Categories"
              onClick={() => page.setActiveTab('categories')}
            />
          </div>

          <div className="flex-1 overflow-hidden">
            {page.activeTab === 'prompts' && (
              <SystemPromptsListTab
                isLoading={page.isLoading}
                searchTerm={page.searchTerm}
                setSearchTerm={page.setSearchTerm}
                selectedCategory={page.selectedCategory}
                setSelectedCategory={page.setSelectedCategory}
                categories={page.categories}
                filteredPrompts={page.filteredPrompts}
                onCreatePrompt={page.openCreatePromptModal}
                onEditPrompt={page.openEditPromptModal}
                onDeletePrompt={page.handleDeletePrompt}
                onShowCategories={() => page.setActiveTab('categories')}
              />
            )}

            {page.activeTab === 'categories' && (
              <SystemPromptCategoriesTab
                isLoading={page.isLoading}
                categorySearchTerm={page.categorySearchTerm}
                setCategorySearchTerm={page.setCategorySearchTerm}
                filteredCategories={page.filteredCategories}
                onCreateCategory={page.openCreateCategoryModal}
                onEditCategory={page.openEditCategoryModal}
                onDeleteCategory={page.handleDeleteCategory}
              />
            )}
          </div>
        </div>
      </div>

      <SystemPromptModal
        open={page.isPromptModalOpen}
        onOpenChange={page.setIsPromptModalOpen}
        editingPrompt={page.editingPrompt}
        formData={page.promptFormData}
        setFormData={page.setPromptFormData}
        categories={page.categories}
        onSave={page.handleSavePrompt}
      />

      <SystemPromptCategoryModal
        open={page.isCategoryModalOpen}
        onOpenChange={page.setIsCategoryModalOpen}
        editingCategory={page.editingCategory}
        formData={page.categoryFormData}
        setFormData={page.setCategoryFormData}
        onSave={page.handleSaveCategory}
      />
    </div>
  );
}

function SystemPromptsTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
        active
          ? "text-primary border-b-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
