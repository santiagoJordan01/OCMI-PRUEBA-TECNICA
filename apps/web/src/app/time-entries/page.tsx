"use client";



import {

  createTimeEntrySchema,

  todayDateString,

  updateTimeEntrySchema,

} from "@mini-timesheets/shared";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useMemo, useState } from "react";

import { WeekEntryGrid } from "@/components/week-entry-grid";

import {

  Button,

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

  Select,

} from "@/components/ui";

import { api } from "@/lib/api";

import type { Employee } from "@mini-timesheets/shared";

function formatEmployeeLabel(employee: Employee): string {
  const name = `${employee.firstName} ${employee.lastName}`;
  return employee.deactivatedAt ? `${name} (inactive)` : name;
}



type FormState = {

  employeeId: string;

  date: string;

  hours: string;

};



const emptyForm = (employeeId = "", date = todayDateString()): FormState => ({

  employeeId,

  date,

  hours: "",

});



function formatDate(date: string) {

  return new Intl.DateTimeFormat("en-US", {

    weekday: "short",

    month: "short",

    day: "numeric",

    year: "numeric",

  }).format(new Date(`${date}T12:00:00`));

}



export default function TimeEntriesPage() {

  const queryClient = useQueryClient();

  const [employeeFilter, setEmployeeFilter] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(() => emptyForm());

  const [formError, setFormError] = useState<string | null>(null);



  const employeesQuery = useQuery({

    queryKey: ["employees", "all"],

    queryFn: () => api.employees.list(true),

  });



  const entriesQuery = useQuery({

    queryKey: ["time-entries", employeeFilter],

    queryFn: () => api.timeEntries.list(employeeFilter || undefined),

  });



  const employeeNameById = useMemo(() => {

    const map = new Map<string, string>();

    employeesQuery.data?.forEach((employee) => {

      map.set(employee.id, formatEmployeeLabel(employee));

    });

    return map;

  }, [employeesQuery.data]);

  const employees = employeesQuery.data ?? [];

  const activeEmployees = useMemo(

    () => employees.filter((employee) => !employee.deactivatedAt),

    [employees],

  );



  const saveMutation = useMutation({

    mutationFn: async () => {

      const payload = {

        employeeId: form.employeeId,

        date: form.date,

        hours: Number(form.hours),

      };



      const parsed = editingId

        ? updateTimeEntrySchema.safeParse({ date: payload.date, hours: payload.hours })

        : createTimeEntrySchema.safeParse(payload);



      if (!parsed.success) {

        throw new Error(parsed.error.issues[0]?.message ?? "Invalid form");

      }



      if (editingId) {

        return api.timeEntries.update(editingId, parsed.data);

      }



      return api.timeEntries.create(payload);

    },

    onSuccess: async () => {

      const { employeeId, date } = form;

      setEditingId(null);

      setForm(emptyForm(employeeId, date));

      setFormError(null);

      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });

      await queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });

    },

    onError: (error: Error) => setFormError(error.message),

  });



  const deleteMutation = useMutation({

    mutationFn: (id: string) => api.timeEntries.delete(id),

    onSuccess: async () => {

      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });

      await queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });

    },

  });



  const entries = entriesQuery.data ?? [];



  return (

    <div className="space-y-6">

      <PageHeader

        title="Time entries"

        description="Use the week grid to log a full pay week in one go, or add a single day below."

        action={

          <Field label="Filter list">

            <Select

              value={employeeFilter}

              onChange={(event) => setEmployeeFilter(event.target.value)}

              className="min-w-[200px]"

            >

              <option value="">All employees</option>

              {employees.map((employee) => (

                <option key={employee.id} value={employee.id}>

                  {formatEmployeeLabel(employee)}

                </option>

              ))}

            </Select>

          </Field>

        }

      />



      <WeekEntryGrid

        employees={activeEmployees}

        initialEmployeeId={employeeFilter}

        onEmployeeChange={setEmployeeFilter}

      />



      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">

        <section>

          {entriesQuery.isLoading ? <LoadingState /> : null}

          {entriesQuery.error ? (

            <ErrorBanner message={(entriesQuery.error as Error).message} />

          ) : null}



          {!entriesQuery.isLoading && entries.length === 0 ? (

            <EmptyState

              title="No time entries"

              description="Log hours using the week grid above or the single-day form."

            />

          ) : null}



          {entries.length > 0 ? (

            <Panel title={`${entries.length} entr${entries.length === 1 ? "y" : "ies"}`}>

              <DataList>

                {entries.map((entry) => (

                  <DataListItem

                    key={entry.id}

                    actions={

                      <>

                        <Button

                          size="sm"

                          variant="secondary"

                          onClick={() => {

                            setEditingId(entry.id);

                            setForm({

                              employeeId: entry.employeeId,

                              date: entry.date,

                              hours: String(entry.hours),

                            });

                            setFormError(null);

                          }}

                        >

                          Edit

                        </Button>

                        <Button

                          size="sm"

                          variant="danger"

                          onClick={() => deleteMutation.mutate(entry.id)}

                          disabled={deleteMutation.isPending}

                        >

                          Delete

                        </Button>

                      </>

                    }

                  >

                    <ItemTitle>

                      {employeeNameById.get(entry.employeeId) ?? "Unknown employee"}

                    </ItemTitle>

                    <MetaText>

                      {formatDate(entry.date)} ·{" "}

                      <span className="font-medium text-slate-700">{entry.hours}h</span>

                    </MetaText>

                  </DataListItem>

                ))}

              </DataList>

            </Panel>

          ) : null}

        </section>



        <section>

          <Panel

            title={editingId ? "Edit single day" : "Log single day"}

            subtitle="For one-off entries. Employee and date are kept after save."

            action={

              editingId ? (

                <Button

                  size="sm"

                  variant="ghost"

                  onClick={() => {

                    setEditingId(null);

                    setForm(emptyForm(employeeFilter));

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

              <Field label="Employee">

                <Select

                  value={form.employeeId}

                  onChange={(event) => setForm({ ...form, employeeId: event.target.value })}

                  required

                  disabled={Boolean(editingId)}

                >

                  <option value="">Select employee</option>

                  {activeEmployees.map((employee) => (

                    <option key={employee.id} value={employee.id}>

                      {formatEmployeeLabel(employee)}

                    </option>

                  ))}

                </Select>

              </Field>

              <Field label="Date">

                <Input

                  type="date"

                  value={form.date}

                  max={todayDateString()}

                  onChange={(event) => setForm({ ...form, date: event.target.value })}

                  required

                />

              </Field>

              <Field label="Hours worked" hint="0.25 minimum, 24 maximum">

                <Input

                  type="number"

                  min="0.25"

                  max="24"

                  step="0.25"

                  value={form.hours}

                  onChange={(event) => setForm({ ...form, hours: event.target.value })}

                  placeholder="8.0"

                  required

                />

              </Field>

              <Button

                type="submit"

                loading={saveMutation.isPending}

                variant="secondary"

                className="mt-1 w-full sm:w-auto"

              >

                {editingId ? "Update entry" : "Create entry"}

              </Button>

            </form>

          </Panel>

        </section>

      </div>

    </div>

  );

}


