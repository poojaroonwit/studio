import { Controller } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PositionSelectDropdown } from "@/components/applicants/PositionSelectDropdown";
import { formatScoreWithGrade, getScoreBgColor, getScoreColor } from "@/lib/scoreUtils";
import type { AddApplicantSectionProps } from "./AddApplicantModalSectionTypes";

export function AddApplicantApplicationSection({ controller }: AddApplicantSectionProps) {
  const { availableStages, form } = controller;

  return (
    <fieldset className="space-y-3 border p-4 rounded-md">
      <legend className="text-lg font-semibold">Application Details</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="positionId">Applying for Position *</Label>
          <Controller
            name="positionId"
            control={form.control}
            render={({ field }) => (
              <PositionSelectDropdown
                value={field.value || ""}
                onValueChange={(value) => field.onChange(value || null)}
                placeholder="Select position..."
                showOpenStatus={true}
                filterOpenOnly={false}
              />
            )}
          />
          {form.formState.errors.positionId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.positionId.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="status">Initial Status</Label>
          <Controller
            name="status"
            control={form.control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent selectId="add-applicant-status-select">
                  {availableStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.status && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.status.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="applicationDate">Application Date *</Label>
          <Input
            id="applicationDate"
            type="date"
            {...form.register("applicationDate", { required: true })}
            className="mt-1"
          />
          {form.formState.errors.applicationDate && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.applicationDate.message}</p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="fitScore">Initial Fit Score (0-100)</Label>
        <Controller
          name="fitScore"
          control={form.control}
          render={({ field }) => (
            <div className="space-y-2">
              <Input
                id="fitScore"
                type="number"
                {...field}
                onChange={(event) => field.onChange(parseInt(event.target.value, 10) || 0)}
                className="mt-1"
              />
              {field.value > 0 && (
                <div className={`text-sm px-2 py-1 rounded ${getScoreBgColor(field.value)} ${getScoreColor(field.value)}`}>
                  Grade: {formatScoreWithGrade(field.value)}
                </div>
              )}
            </div>
          )}
        />
      </div>
    </fieldset>
  );
}
