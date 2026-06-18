"use client";

import { createEmployeeSchema, updateEmployeeSchema } from "@mini-timesheets/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Button,
  Checkbox,
  DataList,
  DataListItem,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  ItemTitle,
  LoadingState,
  MetaText,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/lib/api";

type FormState = {
  firstName: string;
  lastName: string;
  hourlyRate: string;
};

const emptyForm: FormState = { firstName: "", lastName: "", hourlyRate: "" };

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const employeesQuery = useQuery({
    queryKey: ["employees", showInactive],
    queryFn: () => api.employees.list(showInactive),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        hourlyRate: Number(form.hourlyRate),
      };

      if (editingId) {
        const parsed = updateEmployeeSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");
        }
        return api.employees.update(editingId, parsed.data);
      }

      const parsed = createEmployeeSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");
      }
      return api.employees.create(parsed.data);
    },
    onSuccess: async () => {
      setForm(emptyForm);
      setEditingId(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "deactivate" | "reactivate" }) =>
      action === "deactivate" ? api.employees.deactivate(id) : api.employees.reactivate(id),
    onSuccess: async () => {
      setStatusError(null);
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: Error) => setStatusError(error.message),
  });

  function startEdit(employee: {
    id: string;
    firstName: string;
    lastName: string;
    hourlyRate: number;
  }) {
    setEditingId(employee.id);
    setForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      hourlyRate: String(employee.hourlyRate),
    });
    setFormError(null);
  }

  const employees = employeesQuery.data ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section>
        <PageHeader
          title="Employees"
          description="Manage hourly employees. Deactivated staff are hidden from default lists but retain historical entries."
          action={
            <Checkbox
              label="Show inactive"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
          }
        />

        {employeesQuery.isLoading ? <LoadingState /> : null}
        {employeesQuery.error ? (
          <ErrorBanner message={(employeesQuery.error as Error).message} />
        ) : null}
        {statusError ? <ErrorBanner message={statusError} /> : null}

        {!employeesQuery.isLoading && employees.length === 0 ? (
          <EmptyState
            title="No employees yet"
            description="Add your first hourly employee using the form on the right."
          />
        ) : null}

        {employees.length > 0 ? (
          <Panel title={`${employees.length} employee${employees.length === 1 ? "" : "s"}`}>
            <DataList>
              {employees.map((employee) => {
                const status = employee.deactivatedAt ? "inactive" : "active";
                return (
                  <DataListItem
                    key={employee.id}
                    actions={
                      <>
                        <Button size="sm" variant="secondary" onClick={() => startEdit(employee)}>
                          Edit
                        </Button>
                        {status === "active" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              statusMutation.mutate({ id: employee.id, action: "deactivate" })
                            }
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              statusMutation.mutate({ id: employee.id, action: "reactivate" })
                            }
                          >
                            Reactivate
                          </Button>
                        )}
                      </>
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <ItemTitle>
                        {employee.firstName} {employee.lastName}
                      </ItemTitle>
                      <StatusBadge status={status} />
                    </div>
                    <MetaText>
                      ${employee.hourlyRate.toFixed(2)} / hour
                    </MetaText>
                  </DataListItem>
                );
              })}
            </DataList>
          </Panel>
        ) : null}
      </section>

      <section>
        <Panel
          title={editingId ? "Edit employee" : "New employee"}
          subtitle={editingId ? "Update name or hourly rate" : "Required for time entry logging"}
          action={
            editingId ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setFormError(null);
                }}
              >
                Cancel
              </Button>
            ) : undefined
          }
        >
          {formError ? <ErrorBanner message={formError} /> : null}

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
          >
            <Field label="First name">
              <Input
                value={form.firstName}
                onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                placeholder="Jane"
                required
              />
            </Field>
            <Field label="Last name">
              <Input
                value={form.lastName}
                onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                placeholder="Doe"
                required
              />
            </Field>
            <Field label="Hourly rate" hint="USD per hour">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.hourlyRate}
                onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })}
                placeholder="25.00"
                required
              />
            </Field>
            <Button
              type="submit"
              loading={saveMutation.isPending}
              className="mt-1 w-full sm:w-auto"
            >
              {editingId ? "Update employee" : "Create employee"}
            </Button>
          </form>
        </Panel>
      </section>
    </div>
  );
}
