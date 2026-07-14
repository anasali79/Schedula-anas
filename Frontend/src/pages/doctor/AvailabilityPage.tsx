import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarOff, Edit2, Plus, Trash2, X } from 'lucide-react';
import {
  createCustomOverride,
  createRecurringSlot,
  deleteRecurringSlot,
  getAvailabilityDashboard,
  setUnavailable,
  updateRecurringSlot,
} from '../../api/availability';
import { getErrorMessage } from '../../context/AuthContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  DAYS_OF_WEEK,
  formatDate,
  formatTime,
  isBookableSlot,
  STATUS_COLORS,
  todayIST,
} from '../../lib/utils';

export function DoctorAvailabilityPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [unavailableDate, setUnavailableDate] = useState(todayIST());
  const [editSlotId, setEditSlotId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editType, setEditType] = useState('');

  const [dayOfWeek, setDayOfWeek] = useState<string>('MONDAY');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [slotDuration, setSlotDuration] = useState('30');
  const [schedulingType, setSchedulingType] = useState('STREAM');

  const [overrideDate, setOverrideDate] = useState(todayIST());
  const [overrideStart, setOverrideStart] = useState('14:00');
  const [overrideEnd, setOverrideEnd] = useState('17:00');
  const [overrideDuration, setOverrideDuration] = useState('30');

  const { data, isLoading } = useQuery({
    queryKey: ['availability-dashboard'],
    queryFn: getAvailabilityDashboard,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['availability-dashboard'] });

  const createMutation = useMutation({
    mutationFn: createRecurringSlot,
    onSuccess: (res) => {
      setSuccess(res.message);
      setShowForm(false);
      invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecurringSlot,
    onSuccess: (res) => {
      setSuccess(res.message);
      invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateRecurringSlot>[1] }) =>
      updateRecurringSlot(id, payload),
    onSuccess: (res) => {
      setSuccess(res.message);
      setEditSlotId(null);
      invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const handleEditSave = (id: string) => {
    setError('');
    setSuccess('');
    updateMutation.mutate({
      id,
      payload: {
        startTime: editStart,
        endTime: editEnd,
        slotDuration: parseInt(editDuration, 10),
        schedulingType: editType,
      },
    });
  };

  const unavailableMutation = useMutation({
    mutationFn: () => setUnavailable({ date: unavailableDate }),
    onSuccess: (res) => {
      setSuccess(res.message);
      invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const overrideMutation = useMutation({
    mutationFn: createCustomOverride,
    onSuccess: (res) => {
      setSuccess(res.message);
      invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    createMutation.mutate({
      dayOfWeek,
      startTime,
      endTime,
      slotDuration: parseInt(slotDuration, 10),
      schedulingType,
      ...(schedulingType === 'WAVE' ? { maxPatients: 10 } : {}),
    });
  };

  const handleOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    overrideMutation.mutate({
      date: overrideDate,
      startTime: overrideStart,
      endTime: overrideEnd,
      slotDuration: parseInt(overrideDuration, 10),
    });
  };

  const todaySchedule = data?.generatedSchedule.find(
    (d) => d.date === todayIST(),
  );

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
          <p className="mt-1 text-slate-500">Manage your weekly schedule</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add Weekly Slot
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert message={error} />
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert type="success" message={success} />
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader title="New Weekly Slot" subtitle="Recurring availability" />
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Day of Week"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              options={DAYS_OF_WEEK.map((d) => ({
                value: d,
                label: d.charAt(0) + d.slice(1).toLowerCase(),
              }))}
            />
            <Input
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
            <Input
              label="Slot Duration (min)"
              type="number"
              min={5}
              value={slotDuration}
              onChange={(e) => setSlotDuration(e.target.value)}
              required
            />
            <Select
              label="Scheduling Type"
              value={schedulingType}
              onChange={(e) => setSchedulingType(e.target.value)}
              options={[
                { value: 'STREAM', label: 'Stream (fixed slots)' },
                { value: 'WAVE', label: 'Wave (token queue)' },
              ]}
            />
            <div className="flex items-end">
              <Button type="submit" loading={createMutation.isPending} className="w-full">
                Save Slot
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Weekly Schedule" subtitle="Recurring time blocks" />
          {isLoading ? (
            <Spinner />
          ) : data?.recurring.length === 0 ? (
            <p className="text-sm text-slate-500">No recurring slots yet. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {data?.recurring.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-lg border border-slate-200 px-4 py-3"
                >
                  {editSlotId === slot.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          label="Start Time"
                          type="time"
                          value={editStart}
                          onChange={(e) => setEditStart(e.target.value)}
                        />
                        <Input
                          label="End Time"
                          type="time"
                          value={editEnd}
                          onChange={(e) => setEditEnd(e.target.value)}
                        />
                        <Input
                          label="Duration (min)"
                          type="number"
                          min={5}
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                        />
                        <Select
                          label="Type"
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          options={[
                            { value: 'STREAM', label: 'Stream' },
                            { value: 'WAVE', label: 'Wave' },
                          ]}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(slot.id)}
                          loading={updateMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditSlotId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {slot.dayOfWeek.charAt(0) + slot.dayOfWeek.slice(1).toLowerCase()}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatTime(slot.startTime)} – {formatTime(slot.endTime)} ·{' '}
                          {slot.slotDuration}min · {slot.schedulingType}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditSlotId(slot.id);
                            setEditStart(slot.startTime);
                            setEditEnd(slot.endTime);
                            setEditDuration(String(slot.slotDuration));
                            setEditType(slot.schedulingType);
                            setError('');
                            setSuccess('');
                          }}
                        >
                          <Edit2 className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this recurring slot?')) {
                              setError('');
                              setSuccess('');
                              deleteMutation.mutate(slot.id);
                            }
                          }}
                          loading={deleteMutation.isPending && deleteMutation.variables === slot.id}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Mark Unavailable"
            subtitle="Block an entire day — affected appointments auto-reschedule"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              label="Date"
              type="date"
              value={unavailableDate}
              min={todayIST()}
              onChange={(e) => setUnavailableDate(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="danger"
                onClick={() => {
                  if (
                    confirm(
                      `Mark ${unavailableDate} as unavailable? Booked appointments will be rescheduled.`,
                    )
                  ) {
                    setError('');
                    setSuccess('');
                    unavailableMutation.mutate();
                  }
                }}
                loading={unavailableMutation.isPending}
                className="w-full sm:w-auto"
              >
                <CalendarOff className="h-4 w-4" />
                Mark Unavailable
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Custom Date Override"
          subtitle="Add special hours for a specific date (overrides weekly schedule)"
        />
        <form onSubmit={handleOverride} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Date"
            type="date"
            value={overrideDate}
            min={todayIST()}
            onChange={(e) => setOverrideDate(e.target.value)}
            required
          />
          <Input
            label="Start"
            type="time"
            value={overrideStart}
            onChange={(e) => setOverrideStart(e.target.value)}
            required
          />
          <Input
            label="End"
            type="time"
            value={overrideEnd}
            onChange={(e) => setOverrideEnd(e.target.value)}
            required
          />
          <Input
            label="Slot (min)"
            type="number"
            min={5}
            value={overrideDuration}
            onChange={(e) => setOverrideDuration(e.target.value)}
            required
          />
          <div className="flex items-end">
            <Button type="submit" loading={overrideMutation.isPending} className="w-full">
              Add Override
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title={`Today's Schedule — ${formatDate(todayIST())}`}
          subtitle="Slot breakdown for today"
        />
        {isLoading ? (
          <Spinner />
        ) : !todaySchedule || todaySchedule.slots.length === 0 ? (
          <p className="text-sm text-slate-500">No slots scheduled for today.</p>
        ) : (
          <div className="space-y-4">
            {todaySchedule.slots.map((slot) => (
              <div key={slot.id}>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                  {slot.schedulingType && (
                    <span className="ml-2 text-slate-400">({slot.schedulingType})</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {slot.dividedSlots.map((ds) => (
                    <span
                      key={`${ds.startTime}-${ds.endTime}`}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        STATUS_COLORS[ds.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {formatTime(ds.startTime)}
                      {ds.bookedCount != null && ` (${ds.bookedCount}/${ds.maxPatients ?? 1})`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="30-Day Schedule" subtitle="Upcoming availability overview" />
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {data?.generatedSchedule
              .filter((d) => d.slots.length > 0)
              .map((day) => (
                <div
                  key={day.date}
                  className="rounded-lg border border-slate-100 px-4 py-3"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {formatDate(day.date)}
                    <span className="ml-2 text-xs font-normal capitalize text-slate-400">
                      {day.source}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {day.slots
                      .map(
                        (s) =>
                          `${formatTime(s.startTime)}–${formatTime(s.endTime)} (${s.dividedSlots.filter((ds) => isBookableSlot(ds.status)).length} open)`,
                      )
                      .join(' · ')}
                  </p>
                </div>
              ))}
            {data?.generatedSchedule.every((d) => d.slots.length === 0) && (
              <p className="text-sm text-slate-500">
                No schedule generated. Add weekly slots first.
              </p>
            )}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  );
}
