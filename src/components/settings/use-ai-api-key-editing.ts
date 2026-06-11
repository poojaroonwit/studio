"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "react-hot-toast";

import type { ApiKey } from "./ai-api-keys-utils";

export function useAiApiKeyEditing({
  setApiKeys,
}: {
  setApiKeys: Dispatch<SetStateAction<ApiKey[]>>;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEditing = useCallback((apiKey: ApiKey) => {
    setEditingKey(apiKey.key);
    setEditValue(apiKey.key);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingKey(null);
    setEditValue("");
  }, []);

  const saveEditing = useCallback(() => {
    if (!editingKey || !editValue.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }

    setApiKeys((currentKeys) => currentKeys.map((apiKey) =>
      apiKey.key === editingKey
        ? { ...apiKey, key: editValue.trim() }
        : apiKey
    ));
    setEditingKey(null);
    setEditValue("");
    toast.success("API key updated");
  }, [editValue, editingKey, setApiKeys]);

  return {
    cancelEditing,
    editingKey,
    editValue,
    saveEditing,
    setEditValue,
    startEditing,
  };
}
