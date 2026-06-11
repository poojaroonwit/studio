"use client";

import { useCallback, useEffect, useState } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import { toast } from "react-hot-toast";

import { getJsonErrorMessage, readJsonObject, readJsonOrFallback } from "@/lib/response-json";
import type { Grade } from "@/lib/types";

import { buildGradeFormData, defaultGradeData, type GradeFormData } from "./GradesTabTypes";

export function useGradesTab() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [formData, setFormData] = useState<GradeFormData>(defaultGradeData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGrades = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch("/api/settings/grades");
      if (!response.ok) {
        const errorData = await readJsonOrFallback<{ message?: string }>(response, { message: "Failed to fetch grades" });
        throw new Error(errorData.message);
      }

      setGrades(await readJsonOrFallback<Grade[]>(response, []));
    } catch (error) {
      console.error("Error fetching grades:", error);
      setFetchError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const handleOpenModal = (grade?: Grade) => {
    if (grade) {
      setEditingGrade(grade);
      setFormData(buildGradeFormData(grade));
    } else {
      setEditingGrade(null);
      setFormData(defaultGradeData);
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGrade(null);
    setFormData(defaultGradeData);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(
        editingGrade ? `/api/settings/grades/${editingGrade.id}` : "/api/settings/grades",
        {
          method: editingGrade ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) {
        throw new Error(getJsonErrorMessage(await readJsonObject(response), "Failed to save grade"));
      }

      toast.success(editingGrade ? "Grade updated successfully" : "Grade created successfully");
      handleCloseModal();
      fetchGrades();
    } catch (error) {
      console.error("Error saving grade:", error);
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!gradeToDelete) return;

    try {
      const response = await fetch(`/api/settings/grades/${gradeToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(getJsonErrorMessage(await readJsonObject(response), "Failed to delete grade"));
      }

      toast.success("Grade deleted successfully");
      setGradeToDelete(null);
      fetchGrades();
    } catch (error) {
      console.error("Error deleting grade:", error);
      toast.error((error as Error).message);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(grades);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setGrades(items);

    try {
      await Promise.all(
        items.map((grade, index) =>
          fetch(`/api/settings/grades/${grade.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: index + 1 }),
          }),
        ),
      );
    } catch (error) {
      console.error("Error updating sort order:", error);
      toast.error("Failed to update sort order");
      fetchGrades();
    }
  };

  return {
    editingGrade,
    fetchError,
    fetchGrades,
    formData,
    gradeToDelete,
    grades,
    handleCloseModal,
    handleDelete,
    handleDragEnd,
    handleOpenModal,
    handleSubmit,
    isLoading,
    isModalOpen,
    isSubmitting,
    setFormData,
    setGradeToDelete,
    setIsModalOpen,
  };
}
