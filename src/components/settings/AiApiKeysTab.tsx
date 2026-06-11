"use client";

import {
  AiApiKeysAccordion,
  AiApiKeysFooter,
  AiApiKeysLoadingState,
} from "./AiApiKeysTabParts";
import { useAiApiKeysTab } from "./use-ai-api-keys-tab";

export default function AiApiKeysTab() {
  const {
    apiKeys,
    availableModels,
    deletingKey,
    editingKey,
    editValue,
    isFetchingModels,
    isLoading,
    isSaving,
    newApiKey,
    newPriority,
    providerDefaultModel,
    providerLabel,
    selectedProvider,
    actions,
  } = useAiApiKeysTab();

  if (isLoading) {
    return <AiApiKeysLoadingState />;
  }

  return (
    <div className="space-y-6">
      <AiApiKeysAccordion
        apiKeys={apiKeys}
        availableModels={availableModels}
        deletingKey={deletingKey}
        editingKey={editingKey}
        editValue={editValue}
        isFetchingModels={isFetchingModels}
        isSaving={isSaving}
        newApiKey={newApiKey}
        newPriority={newPriority}
        providerDefaultModel={providerDefaultModel}
        providerLabel={providerLabel}
        selectedProvider={selectedProvider}
        actions={actions}
      />
      <AiApiKeysFooter
        apiKeys={apiKeys}
        isSaving={isSaving}
        onRefresh={actions.fetchApiKeys}
        onSave={actions.saveApiKeys}
      />
    </div>
  );
}
