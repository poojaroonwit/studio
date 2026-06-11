"use client";

import { useCallback, useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { Grade } from "@/lib/types";
import type { AddPositionFormValues } from "./add-position-form";
import { fetchAddPositionGrades, fetchAddPositionRecruiters, fetchDefaultMatchCriteria } from "./add-position-modal-data";
import type { AddPositionRecruiterOption } from "./add-position-modal-utils";

export function useAddPositionReferenceData({
  form,
  isOpen,
}: {
  form: UseFormReturn<AddPositionFormValues>;
  isOpen: boolean;
}) {
  const [defaultMatchCriteria, setDefaultMatchCriteria] = useState("");
  const [isLoadingDefaultCriteria, setIsLoadingDefaultCriteria] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [availableRecruiter, setAvailableRecruiter] = useState<AddPositionRecruiterOption[]>([]);

  const loadDefaultMatchCriteria = useCallback(async () => {
    setIsLoadingDefaultCriteria(true);
    try {
      const defaultCriteria = await fetchDefaultMatchCriteria();
      setDefaultMatchCriteria(defaultCriteria);
      if (defaultCriteria.trim() !== "") {
        form.setValue("matchCriteria", defaultCriteria);
      }
    } catch (error) {
      console.error("Error fetching default match criteria:", error);
    } finally {
      setIsLoadingDefaultCriteria(false);
    }
  }, [form]);

  const loadGrades = useCallback(async () => {
    try {
      setGrades(await fetchAddPositionGrades());
    } catch (error) {
      console.error("Error fetching grades:", error);
    }
  }, []);

  const loadRecruiters = useCallback(async () => {
    try {
      setAvailableRecruiter(await fetchAddPositionRecruiters());
    } catch (error) {
      console.error("Error fetching recruiters:", error);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadDefaultMatchCriteria();
    void loadGrades();
    void loadRecruiters();
  }, [isOpen, loadDefaultMatchCriteria, loadGrades, loadRecruiters]);

  return {
    availableRecruiter,
    defaultMatchCriteria,
    grades,
    isLoadingDefaultCriteria,
  };
}
