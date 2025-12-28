import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Guide {
  user_id: string;
  full_name: string;
}

interface Activity {
  id: string;
  name: string;
  name_ar: string;
  emoji: string;
}

interface ReportsFiltersProps {
  onFilterChange: (filters: {
    guideId: string | null;
    activityId: string | null;
    date: Date | null;
  }) => void;
}

export default function ReportsFilters({ onFilterChange }: ReportsFiltersProps) {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const [guides, setGuides] = useState<Guide[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    onFilterChange({
      guideId: selectedGuide,
      activityId: selectedActivity,
      date: selectedDate,
    });
  }, [selectedGuide, selectedActivity, selectedDate]);

  const fetchFiltersData = async () => {
    // Fetch guides
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'guide');

    if (rolesData) {
      const guideIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', guideIds)
        .order('full_name');

      setGuides(profilesData || []);
    }

    // Fetch activities
    const { data: activitiesData } = await supabase
      .from('activity_options')
      .select('id, name, name_ar, emoji')
      .eq('is_active', true)
      .order('sort_order');

    setActivities(activitiesData || []);
  };

  const clearFilters = () => {
    setSelectedGuide(null);
    setSelectedActivity(null);
    setSelectedDate(null);
  };

  const hasActiveFilters = selectedGuide || selectedActivity || selectedDate;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg mb-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">{isRTL ? 'فلترة:' : 'Filter:'}</span>
      </div>

      {/* Guide Filter */}
      <Select
        value={selectedGuide || "all"}
        onValueChange={(value) => setSelectedGuide(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder={isRTL ? 'جميع المرشدين' : 'All Guides'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRTL ? 'جميع المرشدين' : 'All Guides'}</SelectItem>
          {guides.map((guide) => (
            <SelectItem key={guide.user_id} value={guide.user_id}>
              {guide.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Activity Filter */}
      <Select
        value={selectedActivity || "all"}
        onValueChange={(value) => setSelectedActivity(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[200px] bg-background">
          <SelectValue placeholder={isRTL ? 'جميع الأنشطة' : 'All Activities'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRTL ? 'جميع الأنشطة' : 'All Activities'}</SelectItem>
          {activities.map((activity) => (
            <SelectItem key={activity.id} value={activity.id}>
              <span className="flex items-center gap-2">
                <span>{activity.emoji}</span>
                <span>{isRTL ? activity.name_ar : activity.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[180px] justify-start text-left font-normal bg-background",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? (
              format(selectedDate, 'dd/MM/yyyy')
            ) : (
              <span>{isRTL ? 'اختر التاريخ' : 'Pick a date'}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={(date) => setSelectedDate(date || null)}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4 mr-1" />
          {isRTL ? 'مسح الفلاتر' : 'Clear'}
        </Button>
      )}
    </div>
  );
}
